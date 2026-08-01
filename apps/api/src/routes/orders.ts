import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { createOrderSchema } from "@artenova/shared";
import { createOrderCode } from "../lib/orderCode";
import { orderPayload } from "../lib/serialize";
import { prisma } from "../lib/prisma";
import { priceOrderItems } from "../services/pricing";

export const ordersRouter = Router();

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
    include: { items: true }
  });

  res.status(201).json(orderPayload(order));
});

ordersRouter.get("/:code", async (req, res) => {
  const code = String(req.params.code);
  const order = await prisma.order.findUnique({
    where: { code },
    include: { items: true }
  });
  if (!order) {
    res.status(404).json({ message: "Pedido no encontrado" });
    return;
  }
  res.json(orderPayload(order));
});

