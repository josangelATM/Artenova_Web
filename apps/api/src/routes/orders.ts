import { Router } from "express";
import multer from "multer";
import type { Prisma } from "@prisma/client";
import { createOrderSchema } from "@artenova/shared";
import { createOrderCode } from "../lib/orderCode";
import { orderPayload } from "../lib/serialize";
import { prisma } from "../lib/prisma";
import { priceOrderItems } from "../services/pricing";
import { uploadOrderImage } from "../services/uploadService";

export const ordersRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 5 } });

ordersRouter.post("/", async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const pricedItems = await priceOrderItems(input.items);
  const estimatedTotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const code = createOrderCode();

  const order = await prisma.order.create({
    data: {
      code,
      customerName: input.customerName,
      customerWhatsapp: input.customerWhatsapp,
      customerNote: input.customerNote,
      estimatedTotal,
      items: {
        create: pricedItems.map((item) => ({
          product: { connect: { id: item.product.id } },
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          extrasTotal: item.extrasTotal,
          lineTotal: item.lineTotal,
          selectedExtraIds: item.selectedExtraIds as Prisma.InputJsonValue,
          personalization: item.personalization as Prisma.InputJsonValue
        }))
      }
    },
    include: { items: true, uploads: true }
  });

  res.status(201).json(orderPayload(order));
});

ordersRouter.get("/:code", async (req, res) => {
  const code = String(req.params.code);
  const order = await prisma.order.findUnique({
    where: { code },
    include: { items: true, uploads: true }
  });
  if (!order) {
    res.status(404).json({ message: "Pedido no encontrado" });
    return;
  }
  res.json(orderPayload(order));
});

ordersRouter.post("/:code/uploads", upload.array("files", 5), async (req, res) => {
  const code = String(req.params.code);
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) {
    res.status(404).json({ message: "Pedido no encontrado" });
    return;
  }

  const files = (req.files ?? []) as Express.Multer.File[];
  if (files.length === 0) {
    res.status(400).json({ message: "Debe subir al menos una imagen" });
    return;
  }

  const existing = await prisma.orderUpload.count({ where: { orderId: order.id } });
  if (existing + files.length > 5) {
    res.status(400).json({ message: "Cada pedido acepta maximo 5 imagenes" });
    return;
  }

  const uploads = await Promise.all(
    files.map(async (file) => {
      const stored = await uploadOrderImage(file, order.code);
      return prisma.orderUpload.create({
        data: {
          orderId: order.id,
          url: stored.url,
          thumbnailUrl: stored.thumbnailUrl,
          key: stored.key,
          thumbnailKey: stored.thumbnailKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }
      });
    })
  );

  res.status(201).json(uploads);
});
