import QRCode from "qrcode";
import sharp from "sharp";
import { openSync, type Font } from "fontkit";
import { fileURLToPath } from "node:url";
import { qrCodePlateSchema } from "@artenova/shared";
import { originalPlate, originalPawPath } from "./qrPlateTemplate";
import { qrPlateShapes } from "./qrPlateShapes";

// Real Arial glyph outlines keep previews and both exports identical.
const font = openSync(fileURLToPath(new URL("../../assets/fonts/Arial.ttf", import.meta.url))) as Font;
const { x: originX, y: originY, padding } = originalPlate;
const width = Number((originalPlate.width + padding * 2).toFixed(4));
const height = Number((originalPlate.height + padding * 2).toFixed(4));
export function getQrPlateDimensions(size: keyof typeof qrPlateShapes) {
  const shape = qrPlateShapes[size];
  return { widthMm: shape.width, heightMm: shape.height, pngWidth: 1800,
    pngHeight: Math.round(1800 * shape.height / shape.width), density: Math.round(1800 * 25.4 / shape.width) };
}
export const qrPlatePngHeight = getQrPlateDimensions("medium").pngHeight;
const defaultMessage = "Si estoy perdido por favor escanear el código o llamar a:";
const normalizedX = (x: number) => x - originX + padding;
const normalizedY = (y: number) => y - originY + padding;

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
}

function textWidth(text: string, size: number) {
  return font.layout(text).bbox.width * size / font.unitsPerEm;
}

function splitMessage(message: string): string[] {
  if (message === defaultMessage) return ["Si estoy perdido por favor", "escanear el código o llamar a:"];
  const words = message.split(/\s+/);
  const candidates = words.length > 1
    ? words.slice(1).map((_, index) => [words.slice(0, index + 1).join(" "), words.slice(index + 1).join(" ")])
    : Array.from(message).slice(1).map((_, index) => [Array.from(message).slice(0, index + 1).join(""), Array.from(message).slice(index + 1).join("")]);
  if (!candidates.length) return [message];
  return candidates.reduce((best, candidate) => {
    const score = (lines: string[]) => Math.max(textWidth(lines[0]!, 1) / 30.8788, textWidth(lines[1]!, 1) / 35.9140);
    return score(candidate) < score(best) ? candidate : best;
  });
}

function textPath(text: string, centerX: number, baselineY: number, size: number, maxWidth: number, fittedScale?: number) {
  const run = font.layout(text);
  const scale = fittedScale ?? Math.min(size / font.unitsPerEm, maxWidth / Math.max(1, run.bbox.width),
    run.bbox.maxY > 0 ? (baselineY - padding) / run.bbox.maxY : Infinity,
    run.bbox.minY < 0 ? (height - padding - baselineY) / -run.bbox.minY : Infinity);
  const start = centerX - (run.bbox.minX + run.bbox.width / 2) * scale;
  let cursorX = 0;
  let cursorY = 0;
  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index]!;
    const path = `<path transform="translate(${cursorX + position.xOffset} ${cursorY + position.yOffset})" d="${glyph.path.toSVG()}"/>`;
    cursorX += position.xAdvance;
    cursorY += position.yAdvance;
    return path;
  }).join("");
  return `<g aria-label="${escapeXml(text)}" transform="translate(${start} ${baselineY}) scale(${scale} ${-scale})">${paths}</g>`;
}

function contactPaths(contactText: string) {
  const lines = contactText.replace(/\r\n?/g, "\n").split("\n");
  const runs = lines.filter((line) => line.trim()).map((line) => font.layout(line));
  const ascent = Math.max(font.capHeight, ...runs.map((run) => run.bbox.maxY));
  const descent = Math.max(0, ...runs.map((run) => -run.bbox.minY));
  const step = (ascent + descent) * 1.15;
  const columnTop = normalizedY(-179.2895);
  const blockHeight = ascent + descent + step * (lines.length - 1);
  // Fit the whole column once. No individual name or phone can shrink further.
  const scale = Math.min(2.6229 / font.capHeight,
    16.1616 / blockHeight,
    ...runs.map((run) => 21.2157 / Math.max(1, run.bbox.width)));
  const firstBaseline = columnTop + (16.1616 - blockHeight * scale) / 2 + ascent * scale;
  return `<g data-part="contacts" aria-label="${escapeXml(contactText)}">${lines.map((line, index) => line.trim()
    ? textPath(line, normalizedX(165.03605), firstBaseline + index * step * scale, scale * font.unitsPerEm, 21.2157, scale) : ""
  ).join("")}</g>`;
}

export function renderQrPlateSvg(publicUrl: string, input: unknown) {
  const plate = qrCodePlateSchema.parse(input);
  const lines = splitMessage(plate.message);
  const headerSize = Math.min(1.9452 * font.unitsPerEm / font.capHeight,
    ...lines.map((line, index) => (index === 0 ? 30.8788 : 35.9140) / textWidth(line, 1)));
  const header = lines.map((line, index) => textPath(line,
    normalizedX(index === 0 ? 155.1239 : 154.9938),
    normalizedY(lines.length === 1 ? -182.15565 : index === 0 ? -183.7631 : -180.5482), headerSize, index === 0 ? 30.8788 : 35.9140)).join("");

  const matrix = QRCode.create(publicUrl, { errorCorrectionLevel: "M" }).modules;
  let qrPath = "";
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.data[row * matrix.size + col]) qrPath += `M${col} ${row}h1v1h-1z`;
    }
  }
  // Original QR footprint, directly in the content color, without a white box.
  const qr = `<g data-part="qr" transform="translate(${normalizedX(136.1873)} ${normalizedY(-179.2895)}) scale(${16.1616 / matrix.size})"><path d="${qrPath}"/></g>`;
  const contacts = contactPaths(plate.contactText);
  const paw = `<g data-part="paw" transform="translate(${padding - originX} ${padding - originY})"><path d="${originalPawPath}" fill-rule="evenodd"/></g>`;
  const shape = qrPlateShapes[plate.size];
  const bodyTop = shape.bodyTop - shape.y;
  const margin = 2;
  const availableWidth = shape.width - margin * 2;
  const availableHeight = shape.height - bodyTop - margin * 2;
  const contentScale = Math.min(availableWidth / width, availableHeight / height);
  const contentX = (shape.width - width * contentScale) / 2;
  const contentY = bodyTop + margin + (availableHeight - height * contentScale) / 2;
  const outline = `transform="translate(${-shape.x} ${-shape.y})" d="${shape.path}"`;
  const background = plate.transparentBackground ? "" : `<path data-part="background" ${outline} fill="${plate.backgroundColor}" fill-rule="evenodd"/>`;
  // The silhouette clip retains only the inner half of this 0.30 mm stroke:
  // a visible 0.15 mm border, with no paint outside the plate or in its hole.
  const border = plate.transparentBackground
    ? `<path data-part="border" ${outline} fill="none" stroke="${plate.foregroundColor}" stroke-width="0.3" stroke-linejoin="round"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${shape.width}mm" height="${shape.height}mm" viewBox="0 0 ${shape.width} ${shape.height}" role="img"><title>${escapeXml(plate.message)}</title><defs><clipPath id="plate-outline"><path ${outline} clip-rule="evenodd"/></clipPath></defs>${background}<g clip-path="url(#plate-outline)">${border}<g data-part="artwork" transform="translate(${contentX} ${contentY}) scale(${contentScale})" fill="${plate.foregroundColor}">${header}${paw}${qr}${contacts}</g></g></svg>`;
}

export async function renderQrPlatePng(publicUrl: string, input: unknown) {
  const plate = qrCodePlateSchema.parse(input);
  const dimensions = getQrPlateDimensions(plate.size);
  // Rasterize at explicit pixels first. Physical SVG units and PNG resolution
  // metadata must not combine into a second, oversized SVG rasterization.
  const svg = renderQrPlateSvg(publicUrl, plate)
    .replace(`width="${dimensions.widthMm}mm"`, `width="${dimensions.pngWidth}"`)
    .replace(`height="${dimensions.heightMm}mm"`, `height="${dimensions.pngHeight}"`);
  const raster = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(raster).withMetadata({ density: dimensions.density }).png().toBuffer();
}
