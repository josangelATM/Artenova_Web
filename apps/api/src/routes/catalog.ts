import { Router } from "express";
import { productPayload } from "../lib/serialize";
import { env } from "../env";
import { prisma } from "../lib/prisma";

export const catalogRouter = Router();

const productInclude = {
  category: true,
  tags: { where: { tag: { isActive: true } }, include: { tag: true } },
  images: { orderBy: { position: "asc" as const } },
  priceTiers: { orderBy: { minQuantity: "asc" as const } },
  extras: true,
  customFields: { orderBy: { position: "asc" as const } }
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

catalogRouter.get("/tags", async (_req, res) => {
  const tags = await prisma.tag.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
  res.json(tags);
});

catalogRouter.get("/products", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      category: category ? { slug: category, isActive: true } : { isActive: true },
      tags: tag ? { some: { tag: { slug: tag, isActive: true } } } : undefined,
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { material: { contains: q, mode: "insensitive" } }
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

