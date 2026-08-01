import { Router } from "express";
import { productPayload } from "../lib/serialize";
import { prisma } from "../lib/prisma";

export const catalogRouter = Router();

const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" as const } },
  priceTiers: { orderBy: { minQuantity: "asc" as const } },
  extras: true,
  customFields: { orderBy: { position: "asc" as const } }
};

catalogRouter.get("/settings", async (_req, res) => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "site" } });
  res.json(settings);
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
      category: category ? { slug: category } : undefined,
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
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

