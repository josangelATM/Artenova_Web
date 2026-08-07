import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderQrPng, renderQrPreview, renderQrSvg } from "../lib/qrCodes";

describe("QR code renderer", () => {
  it("renders filled SVG without stroke segments or half-pixel coordinates", async () => {
    const svg = await renderQrSvg("https://artenovapty.com/q/demo", {
      foregroundColor: "#000000",
      backgroundColor: "#FFFFFF",
      transparentBackground: false,
      margin: 2,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toContain("stroke=");
    expect(svg).toContain('viewBox="0 0 ');
    expect(svg).toMatch(/<path fill="#000000" d="M\d+ \d+H\d+V\d+H\d+Z/);
    expect(svg).not.toContain(".5");
  });

  it("keeps PNG rendering valid from the filled SVG", async () => {
    const png = await renderQrPng("https://artenovapty.com/q/demo", {
      foregroundColor: "#111827",
      backgroundColor: "#FFFFFF",
      transparentBackground: false,
      margin: 2,
    });

    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBeGreaterThan(0);
    expect(metadata.height).toBeGreaterThan(0);
  });

  it("uses the fixed public base URL in previews", async () => {
    const preview = await renderQrPreview({
      foregroundColor: "#111827",
      backgroundColor: "#FFFFFF",
      transparentBackground: false,
      margin: 2,
    });

    expect(preview.previewUrl).toBe("https://artenovapty.com/q/preview");
    expect(preview.svg).toContain('fill="#111827"');
  });

  it("omits the background path when transparency is enabled", async () => {
    const svg = await renderQrSvg("https://artenovapty.com/q/demo", {
      foregroundColor: "#000000",
      backgroundColor: "#FFFFFF",
      transparentBackground: true,
      margin: 2,
    });

    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toContain('fill="#FFFFFF" d="M0 0H');
  });
});
