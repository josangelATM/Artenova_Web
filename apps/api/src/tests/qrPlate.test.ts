import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderQrPlateSvg, renderQrPlatePng, qrPlatePngHeight } from "../lib/qrPlate";
import { qrCodePlateSchema, adminQRCodeInputSchema, qrCodeDesignSchema } from "@artenova/shared";

const plate = {
  message: "Si estoy perdido por favor escanear el código o llamar a:",
  contactText: "Fuba Chong\n6612-7721\n\nHuga Gómez\n6820-5059",
};

describe("QR plate", () => {
  it.each([
    ["Fuba Chong"], ["Fuba\nChong"], ["Ana\nMaría\nGómez"],
    ["Fuba\nChong", "Huga Gómez"], ["Ana\n\nGómez", "Ó".repeat(60)],
  ])("uses exactly one font scale for every name line and phone (%j)", (...names) => {
    const input = { ...plate, contactText: names.map((name) => `${name}\n6612-7721`).join("\n\n") };
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", input);
    const column = svg.split('<g data-part="contacts"')[1]!;
    const scales = [...column.matchAll(/scale\(([\d.e+-]+) -[\d.e+-]+\)/g)].map((match) => Number(match[1]));
    expect(scales.length).toBe(names.reduce((sum, name) => sum + name.split("\n").filter((line) => line.trim()).length + 1, 0));
    expect(new Set(scales).size).toBe(1);
    expect(scales[0]).toBeGreaterThan(0);
  });
  it("preserves multiline names and blank lines while rejecting whitespace-only names", () => {
    const name = "\nAna\n\nGómez\n";
    const input = { ...plate, contactText: name };
    expect(qrCodePlateSchema.parse(input).contactText).toBe(name);
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", input);
    expect(svg).toContain('data-part="contacts"');
    expect(svg).toContain('aria-label="Ana"');
    expect(svg).toContain('aria-label="Gómez"');
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("Infinity");
    expect(qrCodePlateSchema.safeParse({ ...input, contactText: "\n \n" }).success).toBe(false);
  });
  it("keeps the plate for all destination types and accepts legacy design", () => {
    for (const [type, destinationConfig] of [
      ["url", { url: "https://example.com" }], ["whatsapp", { phone: "50760000000" }], ["vcard", { fullName: "Ana Gómez" }],
    ]) {
      expect(adminQRCodeInputSchema.parse({ name: "Placa", type, destinationConfig, designConfig: { plateConfig: plate } }).designConfig.plateConfig).toEqual(plate);
    }
    expect(qrCodeDesignSchema.parse({}).plateConfig).toBeUndefined();
  });

  it("rejects empty contacts, incomplete contacts and excessive lengths", () => {
    for (const override of [
      { contactText: "" }, { contactText: "\n " }, { contactText: "a".repeat(201) },
      { message: "a".repeat(121) },
    ]) expect(qrCodePlateSchema.safeParse({ ...plate, ...override }).success).toBe(false);
  });

  it("renders vector content, escapes text and preserves accents", () => {
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", { ...plate, contactText: 'Gómez & <Ana> "A"\n6000-0000' });
    expect(svg).toContain("Gómez &amp; &lt;Ana&gt; &quot;A&quot;");
    expect(svg).toContain('viewBox="0 0 39.6566 22.836');
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain('fill="#000000"');
    expect(svg).not.toContain("<rect");
    expect(svg).toContain('data-part="paw"');
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("<Ana>");
    expect(renderQrPlateSvg("https://artenovapty.com/q/other", plate)).not.toEqual(renderQrPlateSvg("https://artenovapty.com/q/demo", plate));
  });

  it("exports PNG at the requested resolution for one/two contacts and maximum text", async () => {
    for (const input of [plate, { ...plate, message: "á".repeat(120), contactText: "Ó".repeat(200) }]) {
      const png = await renderQrPlatePng("https://artenovapty.com/q/demo", input);
      expect(await sharp(png).metadata()).toMatchObject({ width: 1800, height: qrPlatePngHeight, format: "png", hasAlpha: true });
    }
  });

  it("converts old contacts without persisting them and gives explicit text precedence", () => {
    const { contactText: _text, ...design } = plate;
    const legacy = { ...design, contacts: [{ name: "Fuba\nChong", phone: "6612-7721" }, { name: "Huga Gómez", phone: "6820-5059" }] };
    const normalized = qrCodePlateSchema.parse(legacy);
    expect(normalized.contactText).toBe("Fuba\nChong\n6612-7721\n\nHuga Gómez\n6820-5059");
    expect(normalized).not.toHaveProperty("contacts");
    expect(qrCodePlateSchema.parse({ ...legacy, contactText: "Texto libre" }).contactText).toBe("Texto libre");
    expect(qrCodePlateSchema.safeParse({ ...legacy, contactText: "" }).success).toBe(false);
    expect(renderQrPlateSvg("https://artenovapty.com/q/demo", legacy)).toBe(renderQrPlateSvg("https://artenovapty.com/q/demo", normalized));
  });

  it("keeps the original message lines and ignores old colors in favor of white and transparency", () => {
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", { ...plate, foregroundColor: "#FFFFEE", backgroundColor: "#205B70" });
    expect(svg).toContain('aria-label="Si estoy perdido por favor"');
    expect(svg).toContain('aria-label="escanear el código o llamar a:"');
    expect(svg).toContain('<g fill="#FFFFFF">');
    expect(svg).not.toContain("#FFFFEE");
    expect(svg).not.toContain("#205B70");
    expect(svg).not.toContain("<rect");
    expect(qrCodePlateSchema.parse({ ...plate, foregroundColor: "#FFFFEE", backgroundColor: "#205B70" })).toEqual(plate);
  });

  it("exports only white artwork with transparent pixels, including old plate settings", async () => {
    const png = await renderQrPlatePng("https://artenovapty.com/q/demo", { ...plate, foregroundColor: "#FF0000", backgroundColor: "#0000FF" });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let clear = 0;
    let solid = 0;
    let colored = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i + 3] === 0) clear++;
      else {
        if (data[i + 3] === 255) solid++;
        if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) colored++;
      }
    }
    expect(clear).toBeGreaterThan(0);
    expect(solid).toBeGreaterThan(0);
    expect(colored).toBe(0);
    expect(data[3]).toBe(0);
  });
});
