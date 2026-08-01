import { Router } from "express";
import bcrypt from "bcryptjs";
import { adminCategoryInputSchema, adminLoginSchema, adminProductInputSchema, siteSettingsSchema, updateOrderSchema } from "@artenova/shared";
import { prisma } from "../lib/prisma";
import { orderPayload, productPayload } from "../lib/serialize";
import { requireAdmin, signAdminToken } from "../middleware/auth";

export const adminRouter = Router();

const productInclude = {
  category: true,
  images: { orderBy: { position: "asc" as const } },
  priceTiers: { orderBy: { minQuantity: "asc" as const } },
  extras: true,
  customFields: { orderBy: { position: "asc" as const } }
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
    secure: process.env.NODE_ENV === "production",
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
  const [orders, products, categories] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.category.count()
  ]);
  const latestOrders = await prisma.order.findMany({
    include: { items: true, uploads: true },
    orderBy: { createdAt: "desc" },
    take: 6
  });
  res.json({ counts: { orders, products, categories }, latestOrders: latestOrders.map(orderPayload) });
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

adminRouter.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({ include: productInclude, orderBy: { createdAt: "desc" } });
  res.json(products.map(productPayload));
});

adminRouter.post("/products", async (req, res) => {
  const input = adminProductInputSchema.parse(req.body);
  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      categoryId: input.categoryId,
      basePrice: input.basePrice,
      material: input.material,
      size: input.size,
      technique: input.technique,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
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
    prisma.customField.deleteMany({ where: { productId: id } })
  ]);
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      categoryId: input.categoryId,
      basePrice: input.basePrice,
      material: input.material,
      size: input.size,
      technique: input.technique,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
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
    include: { items: true, uploads: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(orders.map(orderPayload));
});

adminRouter.put("/orders/:id", async (req, res) => {
  const input = updateOrderSchema.parse(req.body);
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: input,
    include: { items: true, uploads: true }
  });
  res.json(orderPayload(order));
});

adminRouter.get("/settings", async (_req, res) => {
  res.json(await prisma.siteSettings.findUnique({ where: { id: "site" } }));
});

adminRouter.put("/settings", async (req, res) => {
  const input = siteSettingsSchema.parse(req.body);
  const settings = await prisma.siteSettings.upsert({
    where: { id: "site" },
    create: { id: "site", ...input },
    update: input
  });
  res.json(settings);
});
