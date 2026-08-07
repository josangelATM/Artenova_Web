import crypto from "node:crypto";
import QRCode from "qrcode";
import sharp from "sharp";
import { qrCodeDesignSchema, qrCodeVCardDestinationSchema, type QRCodeDesign, type QRCodeVCardDestination } from "@artenova/shared";

type QRCodeMatrix = {
  modules: {
    size: number;
    data: ArrayLike<number | boolean>;
  };
};

const defaultPreviewToken = "preview";
const qrPublicBaseUrl = "https://artenovapty.com";
const qrSvgWidth = 512;

function baseUrl() {
  return qrPublicBaseUrl.replace(/\/+$/, "");
}

export function createQrToken(length = 10) {
  let token = "";
  while (token.length < length) {
    token += crypto.randomBytes(length).toString("base64url").replace(/[^a-zA-Z0-9]/g, "");
  }
  return token.slice(0, length).toLowerCase();
}

export function getQrPublicUrl(token: string) {
  return `${baseUrl()}/q/${token}`;
}

export function normalizeQrDesign(input: unknown): QRCodeDesign {
  return qrCodeDesignSchema.parse(input ?? {});
}

export function buildWhatsAppUrl(input: { phone: string; message?: string | null }) {
  const phone = input.phone.replace(/[^\d]/g, "");
  const url = new URL(`https://wa.me/${phone}`);
  if (input.message?.trim()) {
    url.searchParams.set("text", input.message.trim());
  }
  return url.toString();
}

export function buildQrResolvedTarget(input: {
  type: "url" | "whatsapp" | "vcard";
  destinationConfig: Record<string, unknown>;
}) {
  if (input.type === "url") {
    return typeof input.destinationConfig.url === "string" ? input.destinationConfig.url : null;
  }
  if (input.type === "whatsapp") {
    return buildWhatsAppUrl({
      phone: String(input.destinationConfig.phone ?? ""),
      message: typeof input.destinationConfig.message === "string" ? input.destinationConfig.message : null,
    });
  }
  return null;
}

async function qrSvgMarkup(content: string, design: QRCodeDesign) {
  const qrData = QRCode.create(content, {
    errorCorrectionLevel: "M",
  }) as QRCodeMatrix;
  return renderFilledQrSvg(qrData, design);
}

export async function renderQrSvg(content: string, designInput: unknown) {
  const design = normalizeQrDesign(designInput);
  return qrSvgMarkup(content, design);
}

export async function renderQrPng(content: string, designInput: unknown) {
  const design = normalizeQrDesign(designInput);
  const svg = await qrSvgMarkup(content, design);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderQrPreview(designInput: unknown) {
  const design = normalizeQrDesign(designInput);
  const previewUrl = getQrPublicUrl(defaultPreviewToken);
  const svg = await qrSvgMarkup(previewUrl, design);
  return { previewUrl, svg };
}

export function buildVCardContent(input: unknown) {
  const vcard = qrCodeVCardDestinationSchema.parse(input) as QRCodeVCardDestination;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCardValue(vcard.fullName)}`,
  ];

  if (vcard.company) lines.push(`ORG:${escapeVCardValue(vcard.company)}`);
  if (vcard.jobTitle) lines.push(`TITLE:${escapeVCardValue(vcard.jobTitle)}`);
  if (vcard.phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(vcard.phone)}`);
  if (vcard.email) lines.push(`EMAIL:${escapeVCardValue(vcard.email)}`);
  if (vcard.website) lines.push(`URL:${escapeVCardValue(vcard.website)}`);
  if (vcard.address) lines.push(`ADR:;;${escapeVCardValue(vcard.address)};;;;`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function escapeVCardValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function renderFilledQrSvg(qrData: QRCodeMatrix, design: QRCodeDesign) {
  const size = qrData.modules.size;
  const margin = design.margin;
  const dimension = size + margin * 2;
  const darkPath = qrRunsToFilledPath(qrData.modules.data, size, margin);
  const bg = design.transparentBackground
    ? ""
    : `<path fill="${design.backgroundColor}" d="M0 0H${dimension}V${dimension}H0Z"/>`;
  const fg = `<path fill="${design.foregroundColor}" d="${darkPath}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${qrSvgWidth}" height="${qrSvgWidth}" viewBox="0 0 ${dimension} ${dimension}">${bg}${fg}</svg>\n`;
}

function qrRunsToFilledPath(data: ArrayLike<number | boolean>, size: number, margin: number) {
  let path = "";

  for (let row = 0; row < size; row += 1) {
    let runStart = -1;
    for (let col = 0; col < size; col += 1) {
      const isDark = Boolean(data[row * size + col]);
      if (isDark && runStart === -1) {
        runStart = col;
      }

      const endsRun = runStart !== -1 && (!isDark || col === size - 1);
      if (!endsRun) continue;

      const runEndExclusive = isDark && col === size - 1 ? col + 1 : col;
      const x = runStart + margin;
      const y = row + margin;
      const width = runEndExclusive - runStart;
      path += `M${x} ${y}H${x + width}V${y + 1}H${x}Z`;
      runStart = -1;
    }
  }

  return path;
}
