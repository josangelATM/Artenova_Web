import express from "express";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminProductInputSchema } from "@artenova/shared";
import { errorHandler } from "../middleware/errors";

process.env.DATABASE_URL = "postgresql://localhost/artenova_test";

const db = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: db }));
vi.mock("../middleware/auth", () => ({
  requireAdmin: (_req: Request, _res: Response, next: NextFunction) => next(),
  signAdminToken: vi.fn(),
}));

const input = { name: "Regalo", slug: "regalo", description: "Personalizado", categoryId: "c1", basePrice: 10 };
let stored: Record<string, unknown>;
const product = {
  create: vi.fn(async ({ data }) => { stored = { id: "p1", minimumSaleQuantity: null, ...data }; return stored; }),
  update: vi.fn(async ({ data }) => { stored = { ...stored, ...data }; return stored; }),
  findUniqueOrThrow: vi.fn(async () => stored),
};

async function request(method: "POST" | "PUT", body: object) {
  const { adminRouter } = await import("../routes/admin");
  const app = express();
  app.use(express.json(), adminRouter, errorHandler);
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No test port");
    const response = await fetch(`http://127.0.0.1:${address.port}/products${method === "PUT" ? "/p1" : ""}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  } finally { server.close(); }
}

describe("product minimum sale quantity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = {};
    const collection = () => ({ deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn(async () => []) });
    const tx = {
      product,
      productVariant: { ...collection(), create: vi.fn(), update: vi.fn() },
      productOption: collection(), productImage: collection(), priceTier: collection(),
      productExtra: collection(), customField: collection(), productVariantImage: collection(),
      productVariantOptionValue: collection(), productVariantAttribute: collection(),
    };
    db.$transaction.mockImplementation(async (callback) => callback(tx));
  });

  it("creates, edits, preserves an omitted minimum, and clears it with null", async () => {
    expect((await request("POST", { ...input, minimumSaleQuantity: 12 })).body.minimumSaleQuantity).toBe(12);
    expect(stored.minimumSaleQuantity).toBe(12);
    expect((await request("PUT", { ...input, minimumSaleQuantity: 6 })).body.minimumSaleQuantity).toBe(6);
    expect((await request("PUT", input)).body.minimumSaleQuantity).toBe(6);
    expect((await request("PUT", { ...input, minimumSaleQuantity: null })).body.minimumSaleQuantity).toBeNull();
    expect(stored.minimumSaleQuantity).toBeNull();
  });

  it("creates without a minimum for existing clients", async () => {
    const result = await request("POST", input);
    expect(result.status).toBe(201);
    expect(result.body.minimumSaleQuantity).toBeNull();
  });

  it.each([0, -1, 1.5, 2147483648, "12"])("rejects invalid minimum %s before a transaction", async (minimumSaleQuantity) => {
    const result = await request("POST", { ...input, minimumSaleQuantity });
    expect(result.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("preserves optional versus null in the shared input contract", () => {
    expect(adminProductInputSchema.parse(input)).not.toHaveProperty("minimumSaleQuantity");
    expect(adminProductInputSchema.parse({ ...input, minimumSaleQuantity: null }).minimumSaleQuantity).toBeNull();
  });
});
