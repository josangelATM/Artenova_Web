import { Router } from "express";
import { createProductReviewSchema } from "@artenova/shared";
import { catalogProductCardPayload, productPayload } from "../lib/serialize";
import { env } from "../env";
import { prisma } from "../lib/prisma";

export const catalogRouter = Router();
const db = prisma as any;
const defaultCatalogPageSize = 24;
const maxCatalogPageSize = 48;

const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" as const } },
  priceTiers: { orderBy: { minQuantity: "asc" as const } },
  options: {
    orderBy: { position: "asc" as const },
    include: { values: { orderBy: { position: "asc" as const } } }
  },
  variants: {
    where: { isActive: true },
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
  reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" as const } }
};

const catalogListSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  description: true,
  basePrice: true,
  discountType: true,
  discountValue: true,
  isFeatured: true,
  defaultVariantId: true,
  createdAt: true,
  category: {
    select: {
      currencySymbol: true,
      isActive: true,
      slug: true,
    },
  },
  images: {
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      url: true,
      type: true,
      alt: true,
      position: true,
      posterUrl: true,
    },
  },
  variants: {
    where: { isActive: true },
    orderBy: { position: "asc" as const },
    select: {
      id: true,
      sku: true,
      basePrice: true,
      discountType: true,
      discountValue: true,
      images: {
        orderBy: { position: "asc" as const },
        select: {
          id: true,
          url: true,
          type: true,
          alt: true,
          position: true,
          posterUrl: true,
        },
      },
      priceTiers: {
        orderBy: { minQuantity: "asc" as const },
        select: {
          id: true,
          minQuantity: true,
          unitPrice: true,
          totalPrice: true,
          label: true,
        },
      },
    },
  },
  reviews: {
    where: { isApproved: true },
    select: { rating: true },
  },
};

type CatalogCursor = {
  isFeatured: boolean;
  createdAt: string;
  id: string;
};

function catalogWhere(category?: string, q = "") {
  return {
    isPublished: true,
    category: category ? { slug: category, isActive: true } : { isActive: true },
    OR: q
      ? [
          { name: { contains: q, mode: "insensitive" as const } },
          { sku: { contains: q, mode: "insensitive" as const } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" as const }, isActive: true } } },
          { description: { contains: q, mode: "insensitive" as const } }
        ]
      : undefined
  };
}

function encodeCatalogCursor(input: CatalogCursor) {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
}

function decodeCatalogCursor(input?: string): CatalogCursor | null {
  if (!input) return null;
  try {
    const parsed = JSON.parse(Buffer.from(input, "base64url").toString("utf8")) as CatalogCursor;
    if (
      typeof parsed?.id === "string"
      && typeof parsed?.createdAt === "string"
      && typeof parsed?.isFeatured === "boolean"
      && !Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function catalogCursorFilter(cursor: CatalogCursor | null) {
  if (!cursor) return undefined;

  const createdAt = new Date(cursor.createdAt);

  if (cursor.isFeatured) {
    return [
      { isFeatured: false },
      { isFeatured: true, createdAt: { lt: createdAt } },
      { isFeatured: true, createdAt, id: { lt: cursor.id } },
    ];
  }

  return [
    { isFeatured: false, createdAt: { lt: createdAt } },
    { isFeatured: false, createdAt, id: { lt: cursor.id } },
  ];
}

catalogRouter.get("/settings", async (_req, res) => {
  res.json({
    brandName: env.SITE_BRAND_NAME,
    heroTitle: env.SITE_HERO_TITLE,
    heroSubtitle: env.SITE_HERO_SUBTITLE,
    whatsapp: env.SITE_WHATSAPP,
    email: env.SITE_EMAIL,
    address: env.SITE_ADDRESS,
    businessHours: env.SITE_BUSINESS_HOURS,
    mapsUrl: env.SITE_MAPS_URL,
    bannerText: env.SITE_BANNER_TEXT,
    personalizationNotice: env.SITE_PERSONALIZATION_NOTICE
  });
});

catalogRouter.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
  res.json(categories);
});

catalogRouter.get("/products", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(1, Math.trunc(rawLimit)), maxCatalogPageSize)
    : defaultCatalogPageSize;
  const cursor = decodeCatalogCursor(typeof req.query.cursor === "string" ? req.query.cursor : undefined);
  const afterCursor = catalogCursorFilter(cursor);
  const where = catalogWhere(category, q) as Record<string, unknown>;

  if (afterCursor) {
    where.OR = afterCursor.map((clause) => ({
      AND: [catalogWhere(category, q), clause],
    }));
  }

  const products = await prisma.product.findMany({
    where,
    select: catalogListSelect,
    take: limit + 1,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });

  const hasMore = products.length > limit;
  const pageItems = hasMore ? products.slice(0, limit) : products;
  const lastItem = pageItems.at(-1);

  res.json({
    items: pageItems.map(catalogProductCardPayload),
    nextCursor: hasMore && lastItem
      ? encodeCatalogCursor({
          isFeatured: Boolean(lastItem.isFeatured),
          createdAt: lastItem.createdAt.toISOString(),
          id: lastItem.id,
        })
      : null,
    hasMore,
  });
});

catalogRouter.get("/products/:slug", async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isPublished: true },
    include: productInclude
  });
  if (!product) {
    res.status(404).json({ message: "Producto no encontrado" });
    return;
  }
  res.json(productPayload(product));
});

catalogRouter.post("/products/:slug/reviews", async (req, res) => {
  const input = createProductReviewSchema.parse(req.body);
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isPublished: true },
    select: { id: true }
  });

  if (!product) {
    res.status(404).json({ message: "Producto no encontrado" });
    return;
  }

  const review = await db.productReview.create({
    data: {
      productId: product.id,
      rating: input.rating,
      customerName: input.customerName,
      comment: input.comment,
      isApproved: true,
      source: "customer"
    }
  });

  res.status(201).json({
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  });
});

