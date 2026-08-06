import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { adminCategoryInputSchema, adminLoginSchema, adminProductInputSchema, adminProductReviewInputSchema, updateOrderSchema, updateReviewApprovalSchema } from "@artenova/shared";
import { prisma } from "../lib/prisma";
import { orderPayload, productPayload, reviewPayload } from "../lib/serialize";
import { requireAdmin, signAdminToken } from "../middleware/auth";
import { UploadValidationError, uploadProductMedia } from "../services/uploadService";

export const adminRouter = Router();
const db = prisma as any;
const mediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024, files: 2 } });

type ProductMediaInput = { url: string; type: "image" | "video"; alt: string; position: number; posterUrl?: string | null };

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
  inputOptions: Array<{ id: string; name: string; position: number; values: Array<{ id: string; value: string; position: number; swatch?: string | null }> }>
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
        data: { name: option.name, position: option.position }
      });
    } else {
      await tx.productOption.create({
        data: { id: option.id, productId, name: option.name, position: option.position }
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
    include: { items: true },
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
    const variantPayload = hasOptions
      ? input.variants.map((variant, position) => ({ ...variant, position: variant.position ?? position }))
      : [buildCanonicalVariantInput(input)];
    const defaultVariantId = resolveDefaultVariantId(input.defaultVariantId, variantPayload);
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
    const variantPayload = hasOptions
      ? input.variants.map((variant, position) => ({ ...variant, position: variant.position ?? position }))
      : [buildCanonicalVariantInput(input, canonicalVariantId)];
    const defaultVariantId = resolveDefaultVariantId(input.defaultVariantId, variantPayload);
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

adminRouter.get("/orders", async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(orders.map(orderPayload));
});

adminRouter.put("/orders/:id", async (req, res) => {
  const input = updateOrderSchema.parse(req.body);
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: input,
    include: { items: true }
  });
  res.json(orderPayload(order));
});

