import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderQrPlateSvg, renderQrPlatePng, qrPlatePngHeight } from "../lib/qrPlate";
import { qrCodePlateSchema, adminQRCodeInputSchema, qrCodeDesignSchema } from "@artenova/shared";

const plate = {
  message: "Si estoy perdido por favor escanear el código o llamar a:",
  contacts: [{ name: "Fuba Chong", phone: "6612-7721" }, { name: "Huga Gómez", phone: "6820-5059" }],
  backgroundColor: "#40A3BE", foregroundColor: "#FFFFFF",
};

describe("QR plate", () => {
  it.each([
    ["Fuba Chong"], ["Fuba\nChong"], ["Ana\nMaría\nGómez"],
    ["Fuba\nChong", "Huga Gómez"], ["Ana\n\nGómez", "Ó".repeat(60)],
  ])("uses exactly one font scale for every name line and phone (%j)", (...names) => {
    const input = { ...plate, contacts: names.map((name) => ({ name, phone: "6612-7721" })) };
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", input);
    const column = svg.split('<g data-part="contacts">')[1]!.split('<g data-part="paw"')[0]!;
    const scales = [...column.matchAll(/scale\(([\d.e+-]+) -[\d.e+-]+\)/g)].map((match) => Number(match[1]));
    expect(scales.length).toBe(names.reduce((sum, name) => sum + name.split("\n").filter((line) => line.trim()).length + 1, 0));
    expect(new Set(scales).size).toBe(1);
    expect(scales[0]).toBeGreaterThan(0);
  });
  it("preserves multiline names and blank lines while rejecting whitespace-only names", () => {
    const name = "\nAna\n\nGómez\n";
    const input = { ...plate, contacts: [{ name, phone: "6000-0000" }] };
    expect(qrCodePlateSchema.parse(input).contacts[0]!.name).toBe(name);
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", input);
    expect(svg).toContain('data-part="contact-name"');
    expect(svg).toContain('aria-label="Ana"');
    expect(svg).toContain('aria-label="Gómez"');
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("Infinity");
    expect(qrCodePlateSchema.safeParse({ ...input, contacts: [{ name: "\n \n", phone: "6000-0000" }] }).success).toBe(false);
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
      { contacts: [] }, { contacts: [{ name: "Ana", phone: " " }] }, { contacts: [...plate.contacts, plate.contacts[0]] },
      { message: "a".repeat(121) }, { contacts: [{ name: "a".repeat(61), phone: "1" }] },
      { contacts: [{ name: "Ana", phone: "1".repeat(33) }] }, { foregroundColor: 'red"/>' },
    ]) expect(qrCodePlateSchema.safeParse({ ...plate, ...override }).success).toBe(false);
  });

  it("renders vector content, escapes text and preserves accents", () => {
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", { ...plate, contacts: [{ name: 'Gómez & <Ana> "A"', phone: "6000-0000" }] });
    expect(svg).toContain("Gómez &amp; &lt;Ana&gt; &quot;A&quot;");
    expect(svg).toContain('viewBox="0 0 39.6566 22.836');
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain('fill="#000000"');
    expect(svg.match(/<rect /g)).toHaveLength(1);
    expect(svg).toContain('data-part="paw"');
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("<Ana>");
    expect(renderQrPlateSvg("https://artenovapty.com/q/other", plate)).not.toEqual(renderQrPlateSvg("https://artenovapty.com/q/demo", plate));
  });

  it("exports PNG at the requested resolution for one/two contacts and maximum text", async () => {
    for (const input of [plate, { ...plate, message: "á".repeat(120), contacts: [{ name: "Ó".repeat(60), phone: "1".repeat(32) }] }]) {
      const png = await renderQrPlatePng("https://artenovapty.com/q/demo", input);
      expect(await sharp(png).metadata()).toMatchObject({ width: 1800, height: qrPlatePngHeight, format: "png" });
    }
  });

  it("keeps the original message lines and uses the plate colors for QR and background", () => {
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", { ...plate, foregroundColor: "#FFFFEE", backgroundColor: "#205B70" });
    expect(svg).toContain('aria-label="Si estoy perdido por favor"');
    expect(svg).toContain('aria-label="escanear el código o llamar a:"');
    expect(svg).toContain('<g fill="#FFFFEE">');
    expect(svg).toContain('fill="#205B70"');
    expect(svg).not.toContain('fill="#FFFFFF"');
  });
});
