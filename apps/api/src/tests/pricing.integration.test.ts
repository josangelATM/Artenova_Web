import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(async () => [
        {
          id: "p1",
          name: "Retrato grabado",
          basePrice: 16,
          priceTiers: [{ id: "t1", minQuantity: 6, unitPrice: 4.5 }],
          extras: [{ id: "e1", name: "Dorado", type: "material", priceDelta: 2 }],
          customFields: [{ id: "name", label: "Nombre", required: true }],
          images: []
        }
      ])
    }
  }
}));

import { priceOrderItems } from "../services/pricing";

describe("priceOrderItems", () => {
  it("prices public products with required personalization", async () => {
    const result = await priceOrderItems([
      { productId: "p1", quantity: 6, selectedExtraIds: ["e1"], personalization: { name: "Spotty" } }
    ]);

    expect(result[0]?.lineTotal).toBe(39);
  });

  it("rejects missing required personalization", async () => {
    await expect(
      priceOrderItems([{ productId: "p1", quantity: 1, selectedExtraIds: [], personalization: {} }])
    ).rejects.toThrow("Faltan datos requeridos");
  });
});

