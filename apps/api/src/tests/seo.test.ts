import express from "express";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: prismaMock,
}));

process.env.DATABASE_URL = "postgresql://artenova:artenova@localhost:5432/artenova";
process.env.APP_BASE_URL = "https://artenova.example";
process.env.WEB_INTERNAL_BASE_URL = "http://web";
process.env.SITE_HERO_SUBTITLE = "Taller creativo de corte y grabado láser en Panamá.";

function makeProduct(slug = "placa-mascota") {
  return {
    id: "p1",
    name: "Placa para mascota",
    slug,
    sku: "PM-1",
    description: "Placa personalizada para mascotas.",
    categoryId: "c1",
    basePrice: 18,
    discountType: null,
    discountValue: null,
    isPublished: true,
    isFeatured: true,
    isHero: false,
    heroSlot: null,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    updatedAt: new Date("2026-08-02T10:00:00Z"),
    category: { id: "c1", name: "Mascotas", slug: "mascotas", description: "Detalles para mascotas.", accentColor: null, isActive: true },
    images: [{ id: "i1", productId: "p1", url: "/seed/mascotas/mascotas-1.jpg", alt: "Placa para mascota", position: 0, createdAt: new Date() }],
    priceTiers: [],
    options: [],
    variants: [],
    extras: [],
    customFields: [],
    reviews: [
      { id: "r1", productId: "p1", rating: 5, customerName: "Ana", comment: "Excelente", isApproved: true, source: "customer", createdAt: new Date("2026-08-01T10:00:00Z"), updatedAt: new Date("2026-08-01T10:00:00Z") },
    ],
  };
}

async function request(path: string) {
  const { seoRouter } = await import("../routes/seo");
  const app = express();
  app.use(seoRouter);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    return await new Promise<{ statusCode: number; text: string }>((resolve, reject) => {
      http.get(`http://127.0.0.1:${address.port}${path}`, (response) => {
        response.setEncoding("utf8");
        let text = "";
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => resolve({ statusCode: response.statusCode ?? 0, text }));
      }).on("error", reject);
    });
  } finally {
    server.close();
  }
}

describe("seo routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<!doctype html><html lang=\"es\"><head><title>Old</title></head><body><div id=\"root\"></div></body></html>"),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves robots.txt with private routes blocked and an absolute sitemap", async () => {
    const response = await request("/robots.txt");
    const { text } = response;

    expect(text).toContain("Disallow: /admin");
    expect(text).toContain("Disallow: /carrito");
    expect(text).toContain("Disallow: /pedido");
    expect(text).toContain("Sitemap: https://artenova.example/sitemap.xml");
  });

  it("serves sitemap with clean category URLs and no query catalog URLs", async () => {
    prismaMock.product.findMany.mockResolvedValue([{ slug: "placa-mascota", updatedAt: new Date("2026-08-02T10:00:00Z") }]);
    prismaMock.category.findMany.mockResolvedValue([{ slug: "mascotas", updatedAt: new Date("2026-08-02T09:00:00Z") }]);

    const response = await request("/sitemap.xml");
    const xml = response.text;

    expect(xml).toContain("https://artenova.example/catalogo/mascotas");
    expect(xml).toContain("https://artenova.example/producto/placa-mascota");
    expect(xml).not.toContain("?category=");
    expect(xml).not.toContain("/carrito");
    expect(xml).not.toContain("/pedido/");
  });

  it("injects product canonical, Open Graph, and Product JSON-LD", async () => {
    prismaMock.product.findFirst.mockResolvedValue(makeProduct());

    const response = await request("/producto/placa-mascota");
    const html = response.text;

    expect(html).toContain("<title>Placa para mascota | Artenova</title>");
    expect(html).toContain('<link rel="canonical" href="https://artenova.example/producto/placa-mascota" />');
    expect(html).toContain('<meta property="og:type" content="product" />');
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('"aggregateRating"');
  });

  it("injects category canonical and ItemList JSON-LD", async () => {
    prismaMock.category.findFirst.mockResolvedValue({ name: "Mascotas", slug: "mascotas", description: "Detalles para mascotas.", updatedAt: new Date() });
    prismaMock.product.findMany.mockResolvedValue([makeProduct()]);

    const response = await request("/catalogo/mascotas");
    const html = response.text;

    expect(html).toContain("<title>Mascotas personalizados | Artenova</title>");
    expect(html).toContain('<link rel="canonical" href="https://artenova.example/catalogo/mascotas" />');
    expect(html).toContain('"@type":"ItemList"');
    expect(html).toContain("https://artenova.example/producto/placa-mascota");
  });
});
