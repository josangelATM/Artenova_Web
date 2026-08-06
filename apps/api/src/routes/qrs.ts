import { Router, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { adminQRCodeInputSchema, qrCodePreviewSchema, updateQRCodeStatusSchema } from "@artenova/shared";
import { prisma } from "../lib/prisma";
import { buildQrResolvedTarget, buildVCardContent, createQrToken, getQrPublicUrl, renderQrPng, renderQrPreview, renderQrSvg } from "../lib/qrCodes";
import { qrCodePayload } from "../lib/serialize";
import { requireAdmin } from "../middleware/auth";

export const adminQrRouter = Router();
export const qrRouter = Router();

function isTokenConflict(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2002"
    && "meta" in error
    && Array.isArray((error as { meta?: { target?: string[] } }).meta?.target)
    && (error as { meta?: { target?: string[] } }).meta?.target?.includes("token");
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sanitizeDestinationConfig(input: ReturnType<typeof adminQRCodeInputSchema.parse>["destinationConfig"]) {
  if ("url" in input) {
    return { url: input.url };
  }
  if ("fullName" in input) {
    return {
      fullName: input.fullName.trim(),
      company: normalizeText(input.company),
      jobTitle: normalizeText(input.jobTitle),
      phone: normalizeText(input.phone),
      email: normalizeText(input.email),
      website: normalizeText(input.website),
      address: normalizeText(input.address),
    };
  }
  return {
    phone: input.phone.trim(),
    message: normalizeText(input.message),
  };
}

async function createQRCode(input: ReturnType<typeof adminQRCodeInputSchema.parse>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await prisma.qRCode.create({
        data: {
          name: input.name.trim(),
          token: createQrToken(),
          type: input.type,
          status: input.status,
          destinationConfig: sanitizeDestinationConfig(input.destinationConfig) as Prisma.InputJsonValue,
          designConfig: input.designConfig as Prisma.InputJsonValue,
        },
      });
      return created;
    } catch (error) {
      if (!isTokenConflict(error) || attempt === 4) throw error;
    }
  }

  throw new Error("No se pudo generar un token QR único.");
}

async function findQrOr404(id: string, res: Response) {
  const qrCode = await prisma.qRCode.findUnique({ where: { id } });
  if (!qrCode) {
    res.status(404).json({ message: "QR no encontrado" });
    return null;
  }
  return qrCode;
}

adminQrRouter.use(requireAdmin);

adminQrRouter.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const type = typeof req.query.type === "string" ? req.query.type : "all";

  const rows = await prisma.qRCode.findMany({
    where: {
      status: status === "all" ? undefined : status as any,
      type: type === "all" ? undefined : type as any,
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
            { token: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(rows.map(qrCodePayload));
});

adminQrRouter.get("/:id", async (req, res) => {
  const qrCode = await findQrOr404(req.params.id, res);
  if (!qrCode) return;
  res.json(qrCodePayload(qrCode));
});

adminQrRouter.post("/", async (req, res) => {
  const input = adminQRCodeInputSchema.parse(req.body);
  const qrCode = await createQRCode(input);
  res.status(201).json(qrCodePayload(qrCode));
});

adminQrRouter.put("/:id", async (req, res) => {
  const input = adminQRCodeInputSchema.parse(req.body);
  const qrCode = await findQrOr404(req.params.id, res);
  if (!qrCode) return;

  const updated = await prisma.qRCode.update({
    where: { id: req.params.id },
    data: {
      name: input.name.trim(),
      type: input.type,
      status: input.status,
      destinationConfig: sanitizeDestinationConfig(input.destinationConfig) as Prisma.InputJsonValue,
      designConfig: input.designConfig as Prisma.InputJsonValue,
    },
  });

  res.json(qrCodePayload(updated));
});

adminQrRouter.put("/:id/status", async (req, res) => {
  const input = updateQRCodeStatusSchema.parse(req.body);
  const qrCode = await findQrOr404(req.params.id, res);
  if (!qrCode) return;

  const updated = await prisma.qRCode.update({
    where: { id: req.params.id },
    data: { status: input.status as any },
  });

  res.json(qrCodePayload(updated));
});

adminQrRouter.post("/preview", async (req, res) => {
  const input = qrCodePreviewSchema.parse(req.body);
  const preview = await renderQrPreview(input.designConfig);
  const resolvedTarget = buildQrResolvedTarget({
    type: input.type,
    destinationConfig: sanitizeDestinationConfig(input.destinationConfig as any),
  });

  res.json({
    resolvedTarget,
    previewUrl: preview.previewUrl,
    svg: preview.svg,
  });
});

adminQrRouter.get("/:id/code.svg", async (req, res) => {
  const qrCode = await findQrOr404(req.params.id, res);
  if (!qrCode) return;

  const svg = await renderQrSvg(getQrPublicUrl(qrCode.token), qrCode.designConfig);
  if (req.query.download === "1") {
    res.setHeader("Content-Disposition", `attachment; filename="qr-${qrCode.token}.svg"`);
  }
  res.type("image/svg+xml").send(svg);
});

adminQrRouter.get("/:id/code.png", async (req, res) => {
  const qrCode = await findQrOr404(req.params.id, res);
  if (!qrCode) return;

  const png = await renderQrPng(getQrPublicUrl(qrCode.token), qrCode.designConfig);
  if (req.query.download === "1") {
    res.setHeader("Content-Disposition", `attachment; filename="qr-${qrCode.token}.png"`);
  }
  res.type("image/png").send(png);
});

qrRouter.get("/:token/resolve", async (req, res) => {
  const qrCode = await prisma.qRCode.findUnique({ where: { token: req.params.token } });
  if (!qrCode) {
    res.status(404).json({ message: "QR no encontrado" });
    return;
  }

  if (qrCode.status !== "active") {
    res.status(410).json({ message: "QR inactivo", status: qrCode.status });
    return;
  }

  const updated = await prisma.qRCode.update({
    where: { id: qrCode.id },
    data: {
      scanCount: { increment: 1 },
      lastScannedAt: new Date(),
    },
  });

  const payload = qrCodePayload(updated);
  res.json({
    token: payload.token,
    status: payload.status,
    type: payload.type,
    name: payload.name,
    targetUrl: payload.resolvedTarget ?? null,
    publicUrl: payload.publicUrl,
    vcard: payload.type === "vcard" ? payload.destinationConfig : undefined,
  });
});

qrRouter.get("/:token/contact.vcf", async (req, res) => {
  const qrCode = await prisma.qRCode.findUnique({ where: { token: req.params.token } });
  if (!qrCode || qrCode.status !== "active" || qrCode.type !== "vcard") {
    res.status(404).json({ message: "Contacto no disponible" });
    return;
  }

  const content = buildVCardContent(qrCode.destinationConfig);
  res.setHeader("Content-Disposition", `attachment; filename="${qrCode.token}.vcf"`);
  res.type("text/vcard").send(content);
});
