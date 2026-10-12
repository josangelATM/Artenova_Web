import QRCode from "qrcode";
import sharp from "sharp";
import { openSync, type Font } from "fontkit";
import { fileURLToPath } from "node:url";
import { qrCodePlateSchema, type QRCodePlate } from "@artenova/shared";
import { originalPlate, originalPawPath } from "./qrPlateTemplate";

// Real Arial glyph outlines keep previews and both exports identical.
const font = openSync(fileURLToPath(new URL("../../assets/fonts/Arial.ttf", import.meta.url))) as Font;
const { x: originX, y: originY, padding } = originalPlate;
const width = Number((originalPlate.width + padding * 2).toFixed(4));
const height = Number((originalPlate.height + padding * 2).toFixed(4));
export const qrPlatePngHeight = Math.round(1800 * height / width);
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

function contactPaths(contacts: QRCodePlate["contacts"]) {
  const blocks = contacts.map((contact) => ({
    name: contact.name,
    lines: [...contact.name.replace(/\r\n?/g, "\n").split("\n"), contact.phone],
  }));
  const runs = blocks.flatMap((block) => block.lines.filter((line) => line.trim()).map((line) => font.layout(line)));
  const ascent = Math.max(font.capHeight, ...runs.map((run) => run.bbox.maxY));
  const descent = Math.max(0, ...runs.map((run) => -run.bbox.minY));
  const step = (ascent + descent) * 1.15;
  const columnTop = normalizedY(-179.2895);
  const gap = contacts.length === 2 ? 0.6 : 0;
  const slotHeight = (16.1616 - gap) / contacts.length;
  const blockHeights = blocks.map((block) => ascent + descent + step * (block.lines.length - 1));
  // Fit the whole column once. No individual name or phone can shrink further.
  const scale = Math.min(2.6229 / font.capHeight,
    ...blockHeights.map((blockHeight) => slotHeight / blockHeight),
    ...runs.map((run) => 21.2157 / Math.max(1, run.bbox.width)));
  return `<g data-part="contacts">${blocks.map((block, index) => {
    const top = columnTop + index * (slotHeight + gap);
    const firstBaseline = top + (slotHeight - blockHeights[index]! * scale) / 2 + ascent * scale;
    const renderLine = (line: string, lineIndex: number) => line.trim()
      ? textPath(line, normalizedX(165.03605), firstBaseline + lineIndex * step * scale, scale * font.unitsPerEm, 21.2157, scale) : "";
    const names = block.lines.slice(0, -1).map(renderLine).join("");
    const phone = renderLine(block.lines[block.lines.length - 1]!, block.lines.length - 1);
    return `<g data-part="contact"><g data-part="contact-name" aria-label="${escapeXml(block.name)}">${names}</g><g data-part="contact-phone">${phone}</g></g>`;
  }).join("")}</g>`;
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
  const contacts = contactPaths(plate.contacts);
  const paw = `<g data-part="paw" transform="translate(${padding - originX} ${padding - originY})"><path d="${originalPawPath}" fill-rule="evenodd"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${qrPlatePngHeight}" viewBox="0 0 ${width} ${height}" role="img"><title>${escapeXml(plate.message)}</title><rect width="${width}" height="${height}" fill="${plate.backgroundColor}"/><g fill="${plate.foregroundColor}">${header}${paw}${qr}${contacts}</g></svg>`;
}

export async function renderQrPlatePng(publicUrl: string, input: unknown) {
  return sharp(Buffer.from(renderQrPlateSvg(publicUrl, input))).resize(1800, qrPlatePngHeight).png().toBuffer();
}
