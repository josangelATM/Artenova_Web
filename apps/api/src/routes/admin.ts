import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { adminCategoryInputSchema, adminLoginSchema, adminProductInputSchema, adminProductReviewInputSchema, adminTagInputSchema, updateOrderSchema, updateReviewApprovalSchema } from "@artenova/shared";
import { prisma } from "../lib/prisma";
import { orderPayload, productPayload, reviewPayload } from "../lib/serialize";
import { requireAdmin, signAdminToken } from "../middleware/auth";
import { uploadProductImage } from "../services/uploadService";

export const adminRouter = Router();
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

const productInclude = {
  category: true,
  tags: { include: { tag: true } },
  images: { orderBy: { position: "asc" as const } },
  priceTiers: { orderBy: { minQuantity: "asc" as const } },
  extras: true,
  customFields: { orderBy: { position: "asc" as const } },
  reviews: { orderBy: { createdAt: "desc" as const } }
};

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
  const [orders, products, categories, tags, reviews] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.productReview.count()
  ]);
  const latestOrders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 6
  });
  res.json({ counts: { orders, products, categories, tags, reviews }, latestOrders: latestOrders.map(orderPayload) });
});

adminRouter.get("/categories", async (_req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
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

adminRouter.get("/tags", async (_req, res) => {
  res.json(await prisma.tag.findMany({ orderBy: { name: "asc" } }));
});

adminRouter.post("/tags", async (req, res) => {
  const input = adminTagInputSchema.parse(req.body);
  const tag = await prisma.tag.create({ data: input });
  res.status(201).json(tag);
});

adminRouter.put("/tags/:id", async (req, res) => {
  const input = adminTagInputSchema.parse(req.body);
  const tag = await prisma.tag.update({ where: { id: req.params.id }, data: input });
  res.json(tag);
});

adminRouter.delete("/tags/:id", async (req, res) => {
  const tag = await prisma.tag.update({
    where: { id: req.params.id },
    data: { isActive: false }
  });
  res.json(tag);
});

adminRouter.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({ include: productInclude, orderBy: { createdAt: "desc" } });
  res.json(products.map(productPayload));
});

adminRouter.get("/reviews", async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const productId = typeof req.query.productId === "string" ? req.query.productId : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const reviews = await prisma.productReview.findMany({
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

adminRouter.post("/reviews", async (req, res) => {
  const input = adminProductReviewInputSchema.parse(req.body);
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
  if (!product) {
    res.status(404).json({ message: "Producto no encontrado" });
    return;
  }

  const review = await prisma.productReview.create({
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
  const review = await prisma.productReview.update({
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
  const review = await prisma.productReview.update({
    where: { id: req.params.id },
    data: { isApproved: input.isApproved },
    include: { product: { select: { name: true, slug: true } } }
  });
  res.json(reviewPayload(review));
});

adminRouter.delete("/reviews/:id", async (req, res) => {
  await prisma.productReview.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

adminRouter.post("/products/images", imageUpload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "Debe subir una imagen" });
    return;
  }
  const slug = typeof req.body.slug === "string" ? req.body.slug : "product";
  const alt = typeof req.body.alt === "string" && req.body.alt.trim() ? req.body.alt.trim() : file.originalname;
  const position = Number.isFinite(Number(req.body.position)) ? Number(req.body.position) : 0;
  const stored = await uploadProductImage(file, slug);
  res.status(201).json({ url: stored.url, alt, position });
});

adminRouter.post("/products", async (req, res) => {
  const input = adminProductInputSchema.parse(req.body);
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      sku: input.sku || null,
      description: input.description,
      categoryId: input.categoryId,
      basePrice: input.basePrice,
      material: input.material,
      size: input.size,
      technique: input.technique,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      isHero: input.isHero,
      heroSlot: input.isHero ? input.heroSlot ?? "primary" : null,
      tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
      images: { create: input.images },
      priceTiers: { create: input.priceTiers },
      extras: { create: input.extras },
      customFields: { create: input.customFields.map((field, position) => ({ ...field, position })) }
    },
    include: productInclude
  });
  res.status(201).json(productPayload(product));
});

adminRouter.put("/products/:id", async (req, res) => {
  const input = adminProductInputSchema.parse(req.body);
  const id = req.params.id;
  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: id } }),
    prisma.priceTier.deleteMany({ where: { productId: id } }),
    prisma.productExtra.deleteMany({ where: { productId: id } }),
    prisma.customField.deleteMany({ where: { productId: id } }),
    prisma.productTag.deleteMany({ where: { productId: id } })
  ]);
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.slug,
      sku: input.sku || null,
      description: input.description,
      categoryId: input.categoryId,
      basePrice: input.basePrice,
      material: input.material,
      size: input.size,
      technique: input.technique,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      isHero: input.isHero,
      heroSlot: input.isHero ? input.heroSlot ?? "primary" : null,
      tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
      images: { create: input.images },
      priceTiers: { create: input.priceTiers },
      extras: { create: input.extras },
      customFields: { create: input.customFields.map((field, position) => ({ ...field, position })) }
    },
    include: productInclude
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

