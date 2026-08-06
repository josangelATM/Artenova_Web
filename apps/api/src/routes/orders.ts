import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { createOrderSchema } from "@artenova/shared";
import { createOrderCode } from "../lib/orderCode";
import { orderPayload } from "../lib/serialize";
import { prisma } from "../lib/prisma";
import { priceOrderItems } from "../services/pricing";

export const ordersRouter = Router();
const orderInclude: any = { items: { include: { units: true } }, payments: true };

function toPublicOrder(payload: ReturnType<typeof orderPayload>) {
  return {
    ...payload,
    adminNote: null,
    internalNote: null,
    payments: undefined
  };
}

ordersRouter.post("/", async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const pricedItems = await priceOrderItems(input.items);
  const estimatedTotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  let order = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      order = await prisma.$transaction(async (tx) => {
        const code = await createOrderCode(tx);
        return tx.order.create({
          data: {
            code,
            source: "storefront" as any,
            customerName: input.customerName,
            customerWhatsapp: input.customerWhatsapp,
            customerNote: input.customerNote,
            estimatedTotal,
            finalPrice: estimatedTotal,
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
          include: orderInclude
        });
      });
      break;
    } catch (error) {
      if (
        typeof error !== "object"
        || error === null
        || !("code" in error)
        || error.code !== "P2002"
        || attempt === 4
      ) {
        throw error;
      }
    }
  }

  res.status(201).json(toPublicOrder(orderPayload(order)));
});

ordersRouter.get("/:code", async (req, res) => {
  const code = String(req.params.code);
  const order = await prisma.order.findUnique({
    where: { code },
    include: orderInclude
  });
  if (!order) {
    res.status(404).json({ message: "Pedido no encontrado" });
    return;
  }
  res.json(toPublicOrder(orderPayload(order)));
});

