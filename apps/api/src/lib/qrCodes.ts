import crypto from "node:crypto";
import QRCode from "qrcode";
import sharp from "sharp";
import { qrCodeDesignSchema, qrCodeVCardDestinationSchema, type QRCodeDesign, type QRCodeVCardDestination } from "@artenova/shared";
import { env } from "../env";

const defaultPreviewToken = "preview";

function baseUrl() {
  return env.APP_BASE_URL.replace(/\/+$/, "");
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
  return QRCode.toString(content, {
    type: "svg",
    width: 512,
    margin: design.margin,
    color: {
      dark: design.foregroundColor,
      light: design.backgroundColor,
    },
    errorCorrectionLevel: "M",
  });
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
