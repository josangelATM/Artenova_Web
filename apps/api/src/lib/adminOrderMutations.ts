import type { Prisma } from "@prisma/client";

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function computeAdminLineTotal(quantity: number, unitPrice: number, extrasTotal: number) {
  return roundMoney(unitPrice * quantity + extrasTotal);
}

export type AdminOrderItemWriteInput = {
  id?: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  extrasTotal: number;
  skuSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  unitLabel?: string | null;
  selectedExtraIds: string[];
  appliedAdjustments: Array<{
    label: string;
    unitAmount: number;
    quantity: number;
    totalAmount: number;
  }>;
  personalization: Record<string, string | string[] | boolean>;
  isDone?: boolean;
  units: Array<{ position?: number; label?: string | null; personalization: Record<string, string | string[] | boolean> }>;
};

export type AdminOrderPaymentWriteInput = {
  amount: number;
  method: "efectivo" | "yappy" | "transferencia" | "otro";
  reference?: string | null;
  note?: string | null;
};

export async function syncOrderItems(tx: any, orderId: string, items: AdminOrderItemWriteInput[]) {
  await tx.orderItemUnit.deleteMany({ where: { orderItem: { orderId } } });
  await tx.orderItem.deleteMany({ where: { orderId } });

  if (items.length === 0) return 0;

  const catalogItems = items.filter((item) => item.productId);
  const products = await tx.product.findMany({
    where: { id: { in: catalogItems.map((item) => item.productId) } },
    include: {
      customFields: true,
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" as const },
        select: { name: true, sku: true },
      },
    },
  }) as Array<{
    id: string;
    name: string;
    customFields: Array<{ id?: string | null; label: string }>;
    variants: Array<{ name: string; sku: string | null }>;
  }>;
  const productById = new Map<string, (typeof products)[number]>(products.map((product) => [product.id, product]));

  function resolveVariantSnapshot(
    product: (typeof products)[number] | null,
    item: AdminOrderItemWriteInput,
  ) {
    if (!product || product.variants.length === 0) return null;
    const skuSnapshot = toOptionalString(item.skuSnapshot);
    const variantNameSnapshot = toOptionalString(item.variantNameSnapshot);
    return product.variants.find((variant) => variant.sku && variant.sku === skuSnapshot)
      ?? product.variants.find((variant) => variant.name === variantNameSnapshot)
      ?? product.variants[0]
      ?? null;
  }

  let estimatedTotal = 0;
  for (const item of items) {
    const product = item.productId ? productById.get(item.productId) : null;
    if (item.productId && !product) {
      throw new Error(`Producto no encontrado: ${item.productId}`);
    }

    const trimmedProductName = item.productName.trim();
    if (!trimmedProductName) {
      throw new Error("Cada item debe tener un nombre.");
    }
    const variantSnapshot = resolveVariantSnapshot(product ?? null, item);
    const appliedAdjustments = (item.appliedAdjustments ?? []).map((adjustment) => ({
      label: adjustment.label.trim(),
      unitAmount: roundMoney(Math.max(0, adjustment.unitAmount ?? 0)),
      quantity: item.quantity,
      totalAmount: roundMoney(Math.max(0, adjustment.unitAmount ?? 0) * item.quantity),
    })).filter((adjustment) => adjustment.label);
    const extrasTotal = roundMoney(appliedAdjustments.reduce((sum, adjustment) => sum + adjustment.totalAmount, 0));
    const lineTotal = computeAdminLineTotal(item.quantity, item.unitPrice, extrasTotal);
    estimatedTotal += lineTotal;

    await tx.orderItem.create({
      data: {
        ...(item.id ? { id: item.id } : {}),
        orderId,
        productId: item.productId ?? null,
        productName: product?.name ?? trimmedProductName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        extrasTotal,
        lineTotal,
        skuSnapshot: toOptionalString(item.skuSnapshot) ?? variantSnapshot?.sku ?? null,
        variantNameSnapshot: toOptionalString(item.variantNameSnapshot) ?? variantSnapshot?.name ?? null,
        unitLabel: toOptionalString(item.unitLabel),
        selectedExtraIds: item.selectedExtraIds as Prisma.InputJsonValue,
        appliedAdjustments: appliedAdjustments as Prisma.InputJsonValue,
        personalization: item.personalization as Prisma.InputJsonValue,
        isDone: item.isDone ?? false,
        units: item.units.length > 0 ? {
          create: item.units.map((unit, index) => ({
            position: unit.position ?? index,
            label: toOptionalString(unit.label),
            personalization: unit.personalization as Prisma.InputJsonValue,
          })),
        } : undefined,
      },
    });
  }

  return roundMoney(estimatedTotal);
}

export async function createOrderPayments(tx: any, orderId: string, payments: AdminOrderPaymentWriteInput[]) {
  for (const payment of payments) {
    await tx.orderPayment.create({
      data: {
        orderId,
        amount: payment.amount,
        method: payment.method,
        reference: toOptionalString(payment.reference),
        note: toOptionalString(payment.note),
      },
    });
  }
}

export function isCodeConflict(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2002"
    && "meta" in error
    && Array.isArray((error as { meta?: { target?: string[] } }).meta?.target)
    && (error as { meta?: { target?: string[] } }).meta?.target?.includes("code");
}

