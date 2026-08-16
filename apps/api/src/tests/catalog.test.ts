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
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: prismaMock,
}));

process.env.DATABASE_URL = "postgresql://artenova:artenova@localhost:5432/artenova";

function makeProduct(input: { id: string; createdAt: string; isFeatured?: boolean; ratings?: number[] }) {
  return {
    id: input.id,
    name: `Producto ${input.id}`,
    slug: `producto-${input.id}`,
    sku: `SKU-${input.id}`,
    description: `Descripcion ${input.id}`,
    basePrice: 20,
    discountType: null,
    discountValue: null,
    isFeatured: input.isFeatured ?? false,
    defaultVariantId: `${input.id}-variant`,
    createdAt: new Date(input.createdAt),
    category: { currencySymbol: "$", isActive: true, slug: "mascotas" },
    images: [{ id: `img-${input.id}`, url: `/seed/${input.id}.jpg`, type: "image", alt: `Producto ${input.id}`, position: 0, posterUrl: null }],
    variants: [{
      id: `${input.id}-variant`,
      sku: `SKU-${input.id}-V`,
      basePrice: 20,
      discountType: null,
      discountValue: null,
      images: [{ id: `img-v-${input.id}`, url: `/seed/${input.id}-v.jpg`, type: "image", alt: `Producto ${input.id} variante`, position: 0, posterUrl: null }],
      priceTiers: [],
    }],
    reviews: (input.ratings ?? []).map((rating, index) => ({ rating, id: `r-${input.id}-${index}` })),
  };
}

async function request(path: string) {
  const { catalogRouter } = await import("../routes/catalog");
  const app = express();
  app.use(catalogRouter);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    return await new Promise<{ statusCode: number; body: any }>((resolve, reject) => {
      http.get(`http://127.0.0.1:${address.port}${path}`, (response) => {
        response.setEncoding("utf8");
        let text = "";
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => resolve({ statusCode: response.statusCode ?? 0, body: JSON.parse(text) }));
      }).on("error", reject);
    });
  } finally {
    server.close();
  }
}

describe("catalog routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a paginated lightweight card payload with cursor metadata", async () => {
    prismaMock.product.findMany.mockResolvedValue([
      makeProduct({ id: "p1", createdAt: "2026-08-10T10:00:00.000Z", isFeatured: true, ratings: [5, 4] }),
      makeProduct({ id: "p2", createdAt: "2026-08-09T10:00:00.000Z", ratings: [3] }),
      makeProduct({ id: "p3", createdAt: "2026-08-08T10:00:00.000Z" }),
    ]);

    const response = await request("/products?limit=2");

    expect(response.statusCode).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.hasMore).toBe(true);
    expect(response.body.nextCursor).toEqual(expect.any(String));
    expect(response.body.items[0]).toMatchObject({
      id: "p1",
      slug: "producto-p1",
      isFeatured: true,
      reviewSummary: { averageRating: 4.5, reviewCount: 2 },
    });
    expect(response.body.items[0].reviews).toBeUndefined();
    expect(response.body.items[0].extras).toBeUndefined();
    expect(response.body.items[0].variants).toBeUndefined();

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 3,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    }));
  });

  it("applies category and search filters together with the next cursor", async () => {
    prismaMock.product.findMany.mockResolvedValue([
      makeProduct({ id: "p4", createdAt: "2026-08-07T10:00:00.000Z" }),
    ]);

    const cursor = Buffer.from(JSON.stringify({
      isFeatured: true,
      createdAt: "2026-08-10T10:00:00.000Z",
      id: "p1",
    }), "utf8").toString("base64url");

    const response = await request(`/products?limit=2&category=mascotas&q=placa&cursor=${cursor}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.hasMore).toBe(false);

    const query = prismaMock.product.findMany.mock.calls[0]?.[0];
    expect(query.take).toBe(3);
    expect(query.where.OR).toHaveLength(3);
    expect(JSON.stringify(query.where)).toContain("mascotas");
    expect(JSON.stringify(query.where)).toContain("placa");
  });
});
