import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import type { Prisma } from "@prisma/client";
import { adminCategoryInputSchema, adminExpenseQuerySchema, adminLoginSchema, adminProductInputSchema, adminProductReviewInputSchema, adminOrderPaymentInputSchema, createAdminExpenseSchema, createAdminOrderSchema, updateAdminExpenseSchema, updateAdminOrderSchema, updateAdminOrderStatusSchema, updateReviewApprovalSchema } from "@artenova/shared";
import { createOrderCode } from "../lib/orderCode";
import { prisma } from "../lib/prisma";
import { propagateVariantMediaByVisualGroup, type ProductMediaInput } from "../lib/variantMediaSync";
import { buildExpenseSummaryBounds, endOfUtcDay, parseDateOnly, startOfUtcDay } from "../lib/expenseDates";
import { expensePayload, orderPayload, productPayload, reviewPayload } from "../lib/serialize";
import { requireAdmin, signAdminToken } from "../middleware/auth";
import { UploadValidationError, uploadProductMedia } from "../services/uploadService";

export const adminRouter = Router();
const db = prisma as any;
const mediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024, files: 2 } });

const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" as const } },
  priceTiers: { orderBy: { minQuantity: "asc" as const } },
  options: {
    orderBy: { position: "asc" as const },
    include: { values: { orderBy: { position: "asc" as const } } }
  },
  variants: {
    orderBy: { position: "asc" as const },
    include: {
      images: { orderBy: { position: "asc" as const } },
      attributes: { orderBy: { position: "asc" as const } },
      optionValues: {
        include: {
          optionValue: {
            include: {
              option: true
            }
          }
        }
      },
      priceTiers: { orderBy: { minQuantity: "asc" as const } }
    }
  },
  extras: true,
  customFields: { orderBy: { position: "asc" as const } },
  reviews: { orderBy: { createdAt: "desc" as const } }
};

const orderInclude = {
  items: {
    include: {
      units: { orderBy: { position: "asc" as const } }
    },
    orderBy: { id: "asc" as const }
  },
  payments: { orderBy: { createdAt: "asc" as const } }
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toNumber(value: { toString(): string } | number | null | undefined) {
  return value == null ? value : Number(value.toString());
}

function computeAdminLineTotal(quantity: number, unitPrice: number, extrasTotal: number) {
  return roundMoney((unitPrice + extrasTotal) * quantity);
}

function toOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function syncOrderItems(tx: any, orderId: string, items: Array<{
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  extrasTotal: number;
  skuSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  unitLabel?: string | null;
  selectedExtraIds: string[];
  personalization: Record<string, string | string[]>;
  units: Array<{ position?: number; label?: string | null; personalization: Record<string, string | string[]> }>;
}>) {
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
        select: { name: true, sku: true }
      }
    }
  }) as Array<{
    id: string;
    name: string;
    customFields: Array<{ id?: string | null; required: boolean }>;
    variants: Array<{ name: string; sku: string | null }>;
  }>;
  const productById = new Map<string, (typeof products)[number]>(products.map((product) => [product.id, product]));

  let estimatedTotal = 0;
  for (const item of items) {
    const product = item.productId ? productById.get(item.productId) : null;
    if (item.productId && !product) {
      throw new Error(`Producto no encontrado: ${item.productId}`);
    }

    const missingRequired = (product?.customFields ?? []).filter((field: any) => field.required && !item.personalization?.[field.id]);
    if (missingRequired.length > 0 && product) {
      throw new Error(`Faltan datos requeridos para ${product.name}`);
    }

    const trimmedProductName = item.productName.trim();
    if (!trimmedProductName) {
      throw new Error("Cada item debe tener un nombre.");
    }

    const variantSnapshot = product?.variants.find((variant: any) => variant.name === item.variantNameSnapshot || variant.sku === item.skuSnapshot) ?? product?.variants[0] ?? null;
    const lineTotal = computeAdminLineTotal(item.quantity, item.unitPrice, item.extrasTotal);
    estimatedTotal += lineTotal;

    await tx.orderItem.create({
      data: {
        orderId,
        productId: item.productId ?? null,
        productName: product?.name ?? trimmedProductName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        extrasTotal: item.extrasTotal,
        lineTotal,
        skuSnapshot: toOptionalString(item.skuSnapshot) ?? variantSnapshot?.sku ?? null,
        variantNameSnapshot: toOptionalString(item.variantNameSnapshot) ?? variantSnapshot?.name ?? null,
        unitLabel: toOptionalString(item.unitLabel),
        selectedExtraIds: item.selectedExtraIds as Prisma.InputJsonValue,
        personalization: item.personalization as Prisma.InputJsonValue,
        units: item.units.length > 0 ? {
          create: item.units.map((unit, index) => ({
            position: unit.position ?? index,
            label: toOptionalString(unit.label),
            personalization: unit.personalization as Prisma.InputJsonValue
          }))
        } : undefined
      }
    });
  }

  return roundMoney(estimatedTotal);
}

async function createOrderPayments(tx: any, orderId: string, payments: Array<{
  amount: number;
  method: "efectivo" | "yappy" | "transferencia" | "otro";
  reference?: string | null;
  note?: string | null;
}>) {
  for (const payment of payments) {
    await tx.orderPayment.create({
      data: {
        orderId,
        amount: payment.amount,
        method: payment.method,
        reference: toOptionalString(payment.reference),
        note: toOptionalString(payment.note)
      }
    });
  }
}

function isCodeConflict(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "P2002"
    && "meta" in error
    && Array.isArray((error as { meta?: { target?: string[] } }).meta?.target)
    && (error as { meta?: { target?: string[] } }).meta?.target?.includes("code");
}

function normalizeSelectionKey(ids: string[]) {
  return ids.slice().sort().join("|");
}

function buildVariantName(optionValueIds: string[], optionValueLabelById: Map<string, string>) {
  const labels = optionValueIds.map((id) => optionValueLabelById.get(id)).filter(Boolean);
  return labels.length > 0 ? labels.join(" / ") : "Variante";
}

function buildCanonicalVariantInput(input: {
  name: string;
  sku?: string | null;
  basePrice: number;
  discountType?: "percentage" | "fixed" | null;
  discountValue?: number | null;
  media: ProductMediaInput[];
  priceTiers: Array<{ minQuantity: number; unitPrice: number; totalPrice?: number | null; label?: string | null }>;
}, variantId?: string) {
  return {
    id: variantId ?? crypto.randomUUID(),
    name: input.name,
    sku: input.sku || null,
    visualGroupKey: "default",
    basePrice: input.basePrice,
    discountType: input.discountType || null,
    discountValue: input.discountValue ?? null,
    isActive: true,
    position: 0,
    optionValueIds: [],
    media: input.media,
    priceTiers: input.priceTiers
  };
}

function resolveDefaultVariantId(
  inputDefaultVariantId: string | null | undefined,
  variants: Array<{ id: string; isActive: boolean }>
) {
  if (inputDefaultVariantId && variants.some((variant) => variant.id === inputDefaultVariantId && variant.isActive)) {
    return inputDefaultVariantId;
  }
  return variants.find((variant) => variant.isActive)?.id ?? variants[0]?.id ?? null;
}

function productCommercialSnapshot(variant: {
  sku?: string | null;
  basePrice: number;
  discountType?: "percentage" | "fixed" | null;
  discountValue?: number | null;
}) {
  return {
    sku: variant.sku || null,
    basePrice: variant.basePrice,
    discountType: variant.discountType || null,
    discountValue: variant.discountValue ?? null,
  };
}

function ensureUniqueVariantSelections(
  variants: Array<{ id: string; isActive: boolean; optionValueIds: string[] }>,
  optionValueIds: Set<string>
) {
  const activeKeys = new Map<string, string>();
  for (const variant of variants) {
    if (variant.optionValueIds.some((id) => !optionValueIds.has(id))) {
      throw new Error(`La variante ${variant.id} usa valores de opcion inexistentes.`);
    }
    const uniqueIds = Array.from(new Set(variant.optionValueIds));
    if (uniqueIds.length !== variant.optionValueIds.length) {
      throw new Error("Una variante no puede repetir el mismo valor de opcion.");
    }
    const key = normalizeSelectionKey(uniqueIds);
    if (!key) continue;
    if (variant.isActive) {
      const existingVariantId = activeKeys.get(key);
      if (existingVariantId) {
        throw new Error("No se permiten dos variantes activas con la misma combinacion exacta.");
      }
      activeKeys.set(key, variant.id);
    }
  }
}

function validateMediaCollection(media: ProductMediaInput[], label: string) {
  const videoCount = media.filter((item) => item.type === "video").length;
  if (videoCount > 1) {
    throw new Error(`${label} solo permite un video en esta version.`);
  }

  media.forEach((item) => {
    if (!item.alt?.trim()) {
      throw new Error(`${label} requiere texto alternativo en cada elemento.`);
    }
    if (item.type === "video" && !item.posterUrl) {
      throw new Error(`${label} requiere portada para cada video.`);
    }
  });
}

async function replaceProductCollections(tx: any, productId: string, payload: {
    media: ProductMediaInput[];
    priceTiers: Array<{ minQuantity: number; unitPrice: number; totalPrice?: number | null; label?: string | null }>;
    extras: Array<{ name: string; type: string; priceDelta: number }>;
    customFields: Array<{ label: string; type: "text" | "date" | "select" | "image" | "note"; required: boolean; options: string[]; helpText?: string | null }>;
  }) {

  await tx.productImage.deleteMany({ where: { productId } });
  await tx.priceTier.deleteMany({ where: { productId } });
  await tx.productExtra.deleteMany({ where: { productId } });
  await tx.customField.deleteMany({ where: { productId } });

  validateMediaCollection(payload.media, "La galeria del producto");

  if (payload.media.length > 0) {
    await tx.productImage.createMany({ data: payload.media.map((item) => ({ ...item, productId, posterUrl: item.posterUrl ?? null })) });
  }
  if (payload.priceTiers.length > 0) {
    await tx.priceTier.createMany({ data: payload.priceTiers.map((tier) => ({ ...tier, productId })) });
  }
  if (payload.extras.length > 0) {
    await tx.productExtra.createMany({ data: payload.extras.map((extra) => ({ ...extra, productId })) });
  }
  if (payload.customFields.length > 0) {
    await tx.customField.createMany({
      data: payload.customFields.map((field, position) => ({
        ...field,
        productId,
        position,
        options: field.options
      }))
    });
  }
}

async function syncProductOptions(
  tx: any,
  productId: string,
  inputOptions: Array<{ id: string; name: string; drivesVisualGroup?: boolean; position: number; values: Array<{ id: string; value: string; position: number; swatch?: string | null }> }>
) {
  const existingOptions = await tx.productOption.findMany({
    where: { productId },
    include: { values: true }
  });
  const existingOptionRows = existingOptions as Array<{ id: string; values: Array<{ id: string }> }>;

  const inputOptionIds = new Set(inputOptions.map((option) => option.id));
  const existingOptionIds = new Set(existingOptionRows.map((option: { id: string }) => option.id));

  const optionValueIds = new Set<string>();
  const optionValueLabelById = new Map<string, string>();

  for (const option of inputOptions) {
    if (existingOptionIds.has(option.id)) {
      await tx.productOption.update({
        where: { id: option.id },
        data: { name: option.name, drivesVisualGroup: option.drivesVisualGroup ?? false, position: option.position }
      });
    } else {
      await tx.productOption.create({
        data: { id: option.id, productId, name: option.name, drivesVisualGroup: option.drivesVisualGroup ?? false, position: option.position }
      });
    }

    const existingValueIds = new Set((existingOptionRows.find((item: { id: string }) => item.id === option.id)?.values ?? []).map((value: { id: string }) => value.id));
    const inputValueIds = new Set(option.values.map((value) => value.id));

    for (const value of option.values) {
      optionValueIds.add(value.id);
      optionValueLabelById.set(value.id, `${option.name}: ${value.value}`);
      if (existingValueIds.has(value.id)) {
        await tx.productOptionValue.update({
          where: { id: value.id },
          data: { value: value.value, position: value.position, swatch: value.swatch ?? null }
        });
      } else {
        await tx.productOptionValue.create({
          data: { id: value.id, optionId: option.id, value: value.value, position: value.position, swatch: value.swatch ?? null }
        });
      }
    }

    const removableValueIds = (existingOptionRows.find((item: { id: string }) => item.id === option.id)?.values ?? [])
      .filter((value: { id: string }) => !inputValueIds.has(value.id))
      .map((value: { id: string }) => value.id);
    if (removableValueIds.length > 0) {
      await tx.productVariantOptionValue.deleteMany({ where: { optionValueId: { in: removableValueIds } } });
      await tx.productOptionValue.deleteMany({ where: { id: { in: removableValueIds } } });
    }
  }

  const removableOptionIds = existingOptionRows.filter((option: { id: string }) => !inputOptionIds.has(option.id)).map((option: { id: string }) => option.id);
  if (removableOptionIds.length > 0) {
    const removableValueIds = existingOptionRows
      .filter((option: { id: string }) => removableOptionIds.includes(option.id))
      .flatMap((option: { values: Array<{ id: string }> }) => option.values.map((value: { id: string }) => value.id));
    if (removableValueIds.length > 0) {
      await tx.productVariantOptionValue.deleteMany({ where: { optionValueId: { in: removableValueIds } } });
    }
    await tx.productOption.deleteMany({ where: { id: { in: removableOptionIds } } });
  }

  return { optionValueIds, optionValueLabelById };
}

async function syncVariants(
  tx: any,
  productId: string,
  inputVariants: Array<{
    id: string;
    name: string;
    sku?: string | null;
    visualGroupKey?: string | null;
    basePrice: number;
    discountType?: "percentage" | "fixed" | null;
    discountValue?: number | null;
    isActive: boolean;
    position: number;
    optionValueIds: string[];
    media: ProductMediaInput[];
    priceTiers: Array<{ minQuantity: number; unitPrice: number; totalPrice?: number | null; label?: string | null }>;
  }>,
  optionValueIds: Set<string>,
  optionValueLabelById: Map<string, string>
) {
  ensureUniqueVariantSelections(inputVariants, optionValueIds);

  const existingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true }
  });
  const existingVariantRows = existingVariants as Array<{ id: string }>;
  const existingVariantIds = new Set(existingVariantRows.map((variant: { id: string }) => variant.id));
  const inputVariantIds = new Set(inputVariants.map((variant) => variant.id));

  for (const variant of inputVariants) {
    const selectionKey = normalizeSelectionKey(variant.optionValueIds);
    const nextName = variant.name.trim() || buildVariantName(variant.optionValueIds, optionValueLabelById);
    validateMediaCollection(variant.media, `La galeria de la variante ${nextName}`);

    if (existingVariantIds.has(variant.id)) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          name: nextName,
          sku: variant.sku || null,
          selectionKey: selectionKey || null,
          visualGroupKey: variant.visualGroupKey?.trim() || null,
          basePrice: variant.basePrice,
          discountType: variant.discountType || null,
          discountValue: variant.discountValue ?? null,
          isActive: variant.isActive,
          position: variant.position
        }
      });
    } else {
      await tx.productVariant.create({
        data: {
          id: variant.id,
          productId,
          name: nextName,
          sku: variant.sku || null,
          selectionKey: selectionKey || null,
          visualGroupKey: variant.visualGroupKey?.trim() || null,
          basePrice: variant.basePrice,
          discountType: variant.discountType || null,
          discountValue: variant.discountValue ?? null,
          isActive: variant.isActive,
          position: variant.position
        }
      });
    }

    await tx.productVariantImage.deleteMany({ where: { variantId: variant.id } });
    await tx.priceTier.deleteMany({ where: { variantId: variant.id } });
    await tx.productVariantOptionValue.deleteMany({ where: { variantId: variant.id } });
    await tx.productVariantAttribute.deleteMany({ where: { variantId: variant.id } });

    if (variant.media.length > 0) {
      await tx.productVariantImage.createMany({ data: variant.media.map((item) => ({ ...item, variantId: variant.id, posterUrl: item.posterUrl ?? null })) });
    }
    if (variant.priceTiers.length > 0) {
      await tx.priceTier.createMany({ data: variant.priceTiers.map((tier) => ({ ...tier, variantId: variant.id })) });
    }
    if (variant.optionValueIds.length > 0) {
      await tx.productVariantOptionValue.createMany({
        data: variant.optionValueIds.map((optionValueId) => ({ variantId: variant.id, optionValueId }))
      });
    }
  }

  const removableVariantIds = existingVariantRows.filter((variant: { id: string }) => !inputVariantIds.has(variant.id)).map((variant: { id: string }) => variant.id);
  if (removableVariantIds.length > 0) {
    await tx.productVariant.deleteMany({ where: { id: { in: removableVariantIds } } });
  }
}

adminRouter.post("/auth/login", async (req, res) => {
  const input = adminLoginSchema.parse(req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
    res.status(401).json({ message: "Credenciales invalidas" });
    return;
  }

  const token = signAdminToken({ sub: admin.id, email: admin.email });
  res.cookie("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.ADMIN_COOKIE_SECURE === "true",
    maxAge: 12 * 60 * 60 * 1000
  });
  res.json({ id: admin.id, email: admin.email });
});

adminRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie("admin_session");
  res.status(204).end();
});

adminRouter.get("/me", requireAdmin, async (req, res) => {
  res.json(req.admin);
});

adminRouter.use(requireAdmin);

adminRouter.get("/dashboard", async (_req, res) => {
  const [orders, products, categories, reviews] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.category.count(),
    db.productReview.count()
  ]);
  const latestOrders = await prisma.order.findMany({
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    take: 6
  });
  res.json({ counts: { orders, products, categories, reviews }, latestOrders: latestOrders.map(orderPayload) });
});

adminRouter.get("/categories", async (_req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
});

adminRouter.get("/categories/:id", async (req, res) => {
  const category = await prisma.category.findUnique({ where: { id: req.params.id } });
  if (!category) {
    res.status(404).json({ message: "Categoria no encontrada" });
    return;
  }
  res.json(category);
});

adminRouter.post("/categories", async (req, res) => {
  const input = adminCategoryInputSchema.parse(req.body);
  const category = await prisma.category.create({ data: input });
  res.status(201).json(category);
});

adminRouter.put("/categories/:id", async (req, res) => {
  const input = adminCategoryInputSchema.parse(req.body);
  const category = await prisma.category.update({ where: { id: req.params.id }, data: input });
  res.json(category);
});

adminRouter.delete("/categories/:id", async (req, res) => {
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { isActive: false }
  });
  res.json(category);
});

adminRouter.get("/expenses", async (req, res) => {
  const input = adminExpenseQuerySchema.parse(req.query);
  const { todayStart, todayEnd, monthStart } = buildExpenseSummaryBounds(new Date());
  const q = input.q?.trim() ?? "";
  const filters: Prisma.ExpenseWhereInput = {
    category: input.category,
    expenseDate: input.dateFrom || input.dateTo
      ? {
          gte: input.dateFrom ? startOfUtcDay(parseDateOnly(input.dateFrom)) : undefined,
          lte: input.dateTo ? endOfUtcDay(parseDateOnly(input.dateTo)) : undefined
        }
      : undefined,
    OR: q
      ? [
          { description: { contains: q, mode: "insensitive" as const } },
          { reference: { contains: q, mode: "insensitive" as const } }
        ]
      : undefined
  };

  const [items, totalItems, filteredAggregate, todayAggregate, monthAggregate] = await Promise.all([
    db.expense.findMany({
      where: filters,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize
    }),
    db.expense.count({ where: filters }),
    db.expense.aggregate({
      where: filters,
      _sum: { amount: true }
    }),
    db.expense.aggregate({
      where: {
        expenseDate: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      _sum: { amount: true }
    }),
    db.expense.aggregate({
      where: {
        expenseDate: {
          gte: monthStart,
          lte: todayEnd
        }
      },
      _sum: { amount: true }
    })
  ]);

  res.json({
    items: items.map(expensePayload),
    page: input.page,
    pageSize: input.pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / input.pageSize),
    summary: {
      todayTotal: toNumber(todayAggregate._sum.amount) ?? 0,
      monthTotal: toNumber(monthAggregate._sum.amount) ?? 0,
      filteredTotal: toNumber(filteredAggregate._sum.amount) ?? 0
    }
  });
});

adminRouter.get("/expenses/:id", async (req, res) => {
  const expense = await db.expense.findUnique({ where: { id: req.params.id } });
  if (!expense) {
    res.status(404).json({ message: "Gasto no encontrado" });
    return;
  }
  res.json(expensePayload(expense));
});

adminRouter.post("/expenses", async (req, res) => {
  const input = createAdminExpenseSchema.parse(req.body);
  const expense = await db.expense.create({
    data: {
      category: input.category,
      amount: input.amount,
      expenseDate: parseDateOnly(input.expenseDate),
      description: input.description.trim(),
      paymentMethod: input.paymentMethod ?? null,
      reference: toOptionalString(input.reference),
      notes: toOptionalString(input.notes)
    }
  });
  res.status(201).json(expensePayload(expense));
});

adminRouter.put("/expenses/:id", async (req, res) => {
  const input = updateAdminExpenseSchema.parse(req.body);
  const expense = await db.expense.update({
    where: { id: req.params.id },
    data: {
      category: input.category,
      amount: input.amount,
      expenseDate: parseDateOnly(input.expenseDate),
      description: input.description.trim(),
      paymentMethod: input.paymentMethod ?? null,
      reference: toOptionalString(input.reference),
      notes: toOptionalString(input.notes)
    }
  });
  res.json(expensePayload(expense));
});

adminRouter.delete("/expenses/:id", async (req, res) => {
  await db.expense.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

adminRouter.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { category: { slug: { not: "legacy-interno" } } },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(products.map(productPayload));
});

adminRouter.get("/products/:id", async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
  if (!product) {
    res.status(404).json({ message: "Producto no encontrado" });
    return;
  }
  res.json(productPayload(product));
});

adminRouter.get("/reviews", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const productId = typeof req.query.productId === "string" ? req.query.productId : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const reviews = await db.productReview.findMany({
    where: {
      isApproved: status === "approved" ? true : status === "hidden" ? false : undefined,
      productId: productId || undefined,
      OR: q
        ? [
            { customerName: { contains: q, mode: "insensitive" } },
            { comment: { contains: q, mode: "insensitive" } },
            { product: { name: { contains: q, mode: "insensitive" } } }
          ]
        : undefined
    },
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" }
  });

  res.json(reviews.map(reviewPayload));
});

adminRouter.get("/reviews/:id", async (req, res) => {
  const review = await db.productReview.findUnique({
    where: { id: req.params.id },
    include: { product: { select: { name: true, slug: true } } }
  });
  if (!review) {
    res.status(404).json({ message: "Resena no encontrada" });
    return;
  }
  res.json(reviewPayload(review));
});

adminRouter.post("/reviews", async (req, res) => {
  const input = adminProductReviewInputSchema.parse(req.body);
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
  if (!product) {
    res.status(404).json({ message: "Producto no encontrado" });
    return;
  }

  const review = await db.productReview.create({
    data: {
      productId: input.productId,
      rating: input.rating,
      customerName: input.customerName,
      comment: input.comment,
      isApproved: input.isApproved,
      source: "admin"
    },
    include: { product: { select: { name: true, slug: true } } }
  });
  res.status(201).json(reviewPayload(review));
});

adminRouter.put("/reviews/:id", async (req, res) => {
  const input = adminProductReviewInputSchema.parse(req.body);
  const review = await db.productReview.update({
    where: { id: req.params.id },
    data: {
      productId: input.productId,
      rating: input.rating,
      customerName: input.customerName,
      comment: input.comment,
      isApproved: input.isApproved
    },
    include: { product: { select: { name: true, slug: true } } }
  });
  res.json(reviewPayload(review));
});

adminRouter.patch("/reviews/:id/approval", async (req, res) => {
  const input = updateReviewApprovalSchema.parse(req.body);
  const review = await db.productReview.update({
    where: { id: req.params.id },
    data: { isApproved: input.isApproved },
    include: { product: { select: { name: true, slug: true } } }
  });
  res.json(reviewPayload(review));
});

adminRouter.delete("/reviews/:id", async (req, res) => {
  await db.productReview.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

async function handleProductMediaUpload(req: any, res: any) {
  const file = req.files?.file?.[0];
  const poster = req.files?.poster?.[0];
  if (!file) {
    res.status(400).json({ message: "Debe subir una imagen o video" });
    return;
  }
  const slug = typeof req.body.slug === "string" ? req.body.slug : "product";
  const alt = typeof req.body.alt === "string" && req.body.alt.trim() ? req.body.alt.trim() : file.originalname;
  const position = Number.isFinite(Number(req.body.position)) ? Number(req.body.position) : 0;

  try {
    const stored = await uploadProductMedia(file, slug, poster);
    res.status(201).json({ url: stored.url, type: stored.type, alt, position, posterUrl: stored.posterUrl });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    throw error;
  }
}

adminRouter.post("/products/media", mediaUpload.fields([{ name: "file", maxCount: 1 }, { name: "poster", maxCount: 1 }]), handleProductMediaUpload);
adminRouter.post("/products/images", mediaUpload.fields([{ name: "file", maxCount: 1 }, { name: "poster", maxCount: 1 }]), handleProductMediaUpload);

adminRouter.post("/products", async (req, res) => {
  const input = adminProductInputSchema.parse(req.body);
  const product = await prisma.$transaction(async (tx) => {
    const hasOptions = input.productOptions.length > 0;
    const requestedVariantPayload = hasOptions
      ? input.variants.map((variant, position) => ({ ...variant, position: variant.position ?? position }))
      : [buildCanonicalVariantInput(input)];
    const defaultVariantId = resolveDefaultVariantId(input.defaultVariantId, requestedVariantPayload);
    const variantPayload = hasOptions
      ? propagateVariantMediaByVisualGroup(requestedVariantPayload, defaultVariantId)
      : requestedVariantPayload;
    const defaultVariant = variantPayload.find((variant) => variant.id === defaultVariantId) ?? variantPayload[0]!;
    const commercialSnapshot = productCommercialSnapshot(defaultVariant);
    const created = await tx.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        sku: commercialSnapshot.sku,
        description: input.description,
        categoryId: input.categoryId,
        basePrice: commercialSnapshot.basePrice,
        discountType: commercialSnapshot.discountType,
        discountValue: commercialSnapshot.discountValue,
        isPublished: input.isPublished,
        isFeatured: input.isFeatured,
        isHero: input.isHero,
        heroSlot: input.isHero ? input.heroSlot ?? "primary" : null,
        defaultVariantId: null
      }
    });
    await replaceProductCollections(tx, created.id, {
      ...input,
      priceTiers: []
    });
    const { optionValueIds, optionValueLabelById } = await syncProductOptions(tx, created.id, input.productOptions);
    await syncVariants(tx, created.id, variantPayload, optionValueIds, optionValueLabelById);
    await tx.product.update({
      where: { id: created.id },
      data: {
        defaultVariantId,
        ...commercialSnapshot
      }
    });
    return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: productInclude });
  });
  res.status(201).json(productPayload(product));
});

adminRouter.put("/products/:id", async (req, res) => {
  const input = adminProductInputSchema.parse(req.body);
  const id = req.params.id;
  const product = await prisma.$transaction(async (tx) => {
    const existingVariants = await (tx as any).productVariant.findMany({
      where: { productId: id },
      orderBy: { position: "asc" },
      select: { id: true, selectionKey: true }
    });
    const hasOptions = input.productOptions.length > 0;
    const canonicalVariantId = existingVariants.find((variant: { selectionKey: string | null }) => !variant.selectionKey)?.id;
    const requestedVariantPayload = hasOptions
      ? input.variants.map((variant, position) => ({ ...variant, position: variant.position ?? position }))
      : [buildCanonicalVariantInput(input, canonicalVariantId)];
    const defaultVariantId = resolveDefaultVariantId(input.defaultVariantId, requestedVariantPayload);
    const variantPayload = hasOptions
      ? propagateVariantMediaByVisualGroup(requestedVariantPayload, defaultVariantId)
      : requestedVariantPayload;
    const defaultVariant = variantPayload.find((variant) => variant.id === defaultVariantId) ?? variantPayload[0]!;
    const commercialSnapshot = productCommercialSnapshot(defaultVariant);

    await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        sku: commercialSnapshot.sku,
        description: input.description,
        categoryId: input.categoryId,
        basePrice: commercialSnapshot.basePrice,
        discountType: commercialSnapshot.discountType,
        discountValue: commercialSnapshot.discountValue,
        isPublished: input.isPublished,
        isFeatured: input.isFeatured,
        isHero: input.isHero,
        heroSlot: input.isHero ? input.heroSlot ?? "primary" : null,
        defaultVariantId: null
      }
    });
    await replaceProductCollections(tx, id, {
      ...input,
      priceTiers: []
    });
    const { optionValueIds, optionValueLabelById } = await syncProductOptions(tx, id, input.productOptions);
    await syncVariants(tx, id, variantPayload, optionValueIds, optionValueLabelById);
    await tx.product.update({
      where: { id },
      data: {
        defaultVariantId,
        ...commercialSnapshot
      }
    });
    return tx.product.findUniqueOrThrow({ where: { id }, include: productInclude });
  });
  res.json(productPayload(product));
});

adminRouter.get("/orders", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const hasBalance = req.query.hasBalance === "true";
  const dateFrom = typeof req.query.dateFrom === "string" && req.query.dateFrom ? new Date(req.query.dateFrom) : null;
  const dateTo = typeof req.query.dateTo === "string" && req.query.dateTo ? new Date(req.query.dateTo) : null;
  const orders = await prisma.order.findMany({
    where: {
      OR: q ? [
        { code: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerWhatsapp: { contains: q, mode: "insensitive" } }
      ] : undefined,
      status: status === "all" ? undefined : status as any,
      createdAt: dateFrom || dateTo ? {
        gte: dateFrom ?? undefined,
        lte: dateTo ?? undefined
      } : undefined
    },
    include: orderInclude,
    orderBy: { createdAt: "desc" }
  });
  res.json(orders.map(orderPayload).filter((order) => !hasBalance || order.balance > 0));
});

adminRouter.post("/orders", async (req, res) => {
  const input = createAdminOrderSchema.parse(req.body);
  let order = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      order = await prisma.$transaction(async (tx) => {
        const code = await createOrderCode(tx);
        const created = await tx.order.create({
          data: {
            code,
            source: "admin_manual",
            status: input.status,
            customerName: input.customerName,
            customerWhatsapp: input.customerWhatsapp,
            customerNote: input.customerNote,
            internalNote: input.internalNote ?? null,
            estimatedTotal: 0,
            finalPrice: input.finalPrice ?? null
          }
        });
        const estimatedTotal = await syncOrderItems(tx, created.id, input.items);
        await createOrderPayments(tx, created.id, input.payments);
        await tx.order.update({
          where: { id: created.id },
          data: {
            estimatedTotal,
            finalPrice: input.finalPrice ?? estimatedTotal,
            completedAt: input.status === "entregado" ? new Date() : null
          }
        });
        return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: orderInclude });
      });
      break;
    } catch (error) {
      if (!isCodeConflict(error) || attempt === 4) {
        throw error;
      }
    }
  }
  res.status(201).json(orderPayload(order));
});

adminRouter.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: orderInclude
  });
  if (!order) {
    res.status(404).json({ message: "Pedido no encontrado" });
    return;
  }
  res.json(orderPayload(order));
});

adminRouter.put("/orders/:id", async (req, res) => {
  const input = updateAdminOrderSchema.parse(req.body);
  const order = await prisma.$transaction(async (tx) => {
    const estimatedTotal = await syncOrderItems(tx, req.params.id, input.items);
    await tx.order.update({
      where: { id: req.params.id },
      data: {
        customerName: input.customerName,
        customerWhatsapp: input.customerWhatsapp,
        customerNote: input.customerNote,
        internalNote: input.internalNote ?? null,
        status: input.status,
        estimatedTotal,
        finalPrice: input.finalPrice ?? estimatedTotal,
        completedAt: input.status === "entregado" ? (input.completedAt ? new Date(input.completedAt) : new Date()) : null
      }
    });
    return tx.order.findUniqueOrThrow({
      where: { id: req.params.id },
      include: orderInclude
    });
  });
  res.json(orderPayload(order));
});

adminRouter.post("/orders/:id/payments", async (req, res) => {
  const input = adminOrderPaymentInputSchema.parse(req.body);
  await prisma.orderPayment.create({
    data: {
      orderId: req.params.id,
      amount: input.amount,
      method: input.method,
      reference: toOptionalString(input.reference),
      note: toOptionalString(input.note)
    }
  });
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: req.params.id },
    include: orderInclude
  });
  res.status(201).json(orderPayload(order));
});

adminRouter.put("/orders/:id/status", async (req, res) => {
  const input = updateAdminOrderStatusSchema.parse(req.body);
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status: input.status,
      completedAt: input.status === "entregado" ? new Date() : null
    },
    include: orderInclude
  });
  res.json(orderPayload(order));
});

