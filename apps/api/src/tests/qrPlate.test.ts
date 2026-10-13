import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderQrPlateSvg, renderQrPlatePng, qrPlatePngHeight, getQrPlateDimensions } from "../lib/qrPlate";
import { qrCodePlateSchema, adminQRCodeInputSchema, qrCodeDesignSchema } from "@artenova/shared";

const plate = {
  message: "Si estoy perdido por favor escanear el código o llamar a:",
  contactText: "Fuba Chong\n6612-7721\n\nHuga Gómez\n6820-5059",
  size: "medium", foregroundColor: "#FFFFFF", backgroundColor: "#40A3BE", transparentBackground: false,
};

describe("QR plate", () => {
  it.each([
    ["small", 19.05051, 5.49792], ["medium", 21.58954, 5.39762], ["large", 25.35171, 5.59656],
  ] as const)("draws the %s transparent border inside the silhouette and outside the hole", async (size, holeX, holeY) => {
    const input = { ...plate, size, foregroundColor: "#37B7C9", transparentBackground: true };
    const dimensions = getQrPlateDimensions(size);
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", input);
    expect(svg).toContain('data-part="border"');
    expect(svg).toContain('stroke="#37B7C9" stroke-width="0.3"');
    expect(svg).not.toContain('data-part="background"');
    expect(renderQrPlateSvg("https://artenovapty.com/q/demo", { ...input, transparentBackground: false })).not.toContain('data-part="border"');
    const png = await renderQrPlatePng("https://artenovapty.com/q/demo", input);
    expect(await sharp(png).metadata()).toMatchObject({ width: 1800, height: dimensions.pngHeight, density: dimensions.density, hasAlpha: true });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const index = (Math.floor(y / dimensions.heightMm * info.height) * info.width + Math.floor(x / dimensions.widthMm * info.width)) * info.channels;
      return [...data.subarray(index, index + 4)];
    };
    const middle = dimensions.heightMm * 0.6;
    expect(pixel(0.07, middle)).toEqual([55, 183, 201, 255]);
    expect(pixel(0.24, middle)[3]).toBe(0);
    expect(pixel(dimensions.widthMm / 2, dimensions.heightMm - 0.07)).toEqual([55, 183, 201, 255]);
    expect(pixel(holeX + 1.55, holeY)).toEqual([55, 183, 201, 255]);
    expect(pixel(holeX + 1.75, holeY)[3]).toBe(0);
    expect(pixel(holeX, holeY)[3]).toBe(0);
    expect(data[3]).toBe(0);
  });

  it.each([
    ["small", 19.05051, 5.49792], ["medium", 21.58954, 5.39762], ["large", 25.35171, 5.59656],
  ] as const)("exports physical %s dimensions with transparent hole and exterior", async (size, holeX, holeY) => {
    const dimensions = getQrPlateDimensions(size);
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", { ...plate, size });
    expect(svg).toContain(`width="${dimensions.widthMm}mm"`);
    expect(svg).toContain(`height="${dimensions.heightMm}mm"`);
    expect(svg).not.toContain("#ED252B");
    const png = await renderQrPlatePng("https://artenovapty.com/q/demo", { ...plate, size });
    const metadata = await sharp(png).metadata();
    expect(metadata).toMatchObject({ width: 1800, height: dimensions.pngHeight, hasAlpha: true, density: dimensions.density });
    expect(Math.abs(1800 / metadata.density! * 25.4 - dimensions.widthMm)).toBeLessThan(0.05);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixel = (x: number, y: number) => {
      const index = (Math.floor(y / dimensions.heightMm * info.height) * info.width + Math.floor(x / dimensions.widthMm * info.width)) * info.channels;
      return [...data.subarray(index, index + 4)];
    };
    expect(pixel(holeX, holeY)[3]).toBe(0);
    expect(data[3]).toBe(0);
    expect(pixel(dimensions.widthMm / 2, 2)).toEqual([64, 163, 190, 255]);
  });

  it("validates size and colors and defaults missing old configuration without writes", () => {
    expect(qrCodePlateSchema.safeParse({ ...plate, size: "custom" }).success).toBe(false);
    expect(qrCodePlateSchema.safeParse({ ...plate, foregroundColor: 'red"/>' }).success).toBe(false);
    expect(qrCodePlateSchema.parse({ message: plate.message, contactText: plate.contactText })).toMatchObject({ size: "medium", foregroundColor: "#FFFFFF", transparentBackground: true });
  });
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
    expect(svg).toContain('viewBox="0 0 43.17915 32.64293');
    expect(svg).toContain('width="43.17915mm"');
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

  it("keeps the original message lines and uses selected colors and silhouette", () => {
    const svg = renderQrPlateSvg("https://artenovapty.com/q/demo", { ...plate, foregroundColor: "#FFFFEE", backgroundColor: "#205B70" });
    expect(svg).toContain('aria-label="Si estoy perdido por favor"');
    expect(svg).toContain('aria-label="escanear el código o llamar a:"');
    expect(svg).toContain('fill="#FFFFEE"');
    expect(svg).toContain('fill="#205B70"');
    expect(svg).toContain('data-part="background"');
    expect(svg).not.toContain("<rect");
    expect(qrCodePlateSchema.parse({ message: plate.message, contactText: plate.contactText })).toMatchObject({ size: "medium", transparentBackground: true, foregroundColor: "#FFFFFF" });
  });

  it("exports only white artwork with transparent pixels, including old plate settings", async () => {
    const png = await renderQrPlatePng("https://artenovapty.com/q/demo", { message: plate.message, contactText: plate.contactText });
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
