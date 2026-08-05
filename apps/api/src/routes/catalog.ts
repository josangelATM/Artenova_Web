import { Router } from "express";
import { createProductReviewSchema } from "@artenova/shared";
import { productPayload } from "../lib/serialize";
import { env } from "../env";
import { prisma } from "../lib/prisma";

export const catalogRouter = Router();
const db = prisma as any;

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
  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      category: category ? { slug: category, isActive: true } : { isActive: true },
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } }
          ]
        : undefined
    },
    include: productInclude,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
  });
  res.json(products.map(productPayload));
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

