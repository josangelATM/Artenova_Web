import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(async () => [
        {
          id: "p1",
          name: "Retrato grabado",
          defaultVariantId: "v1",
          basePrice: 16,
          priceTiers: [],
          extras: [{ id: "e1", name: "Dorado", type: "material", priceDelta: 2 }],
          customFields: [{ id: "name", label: "Nombre", position: 0 }],
          images: [],
          options: [],
          variants: [
            {
              id: "v1",
              productId: "p1",
              name: "Retrato grabado",
              sku: "RET-01",
              selectionKey: null,
              basePrice: 16,
              discountType: null,
              discountValue: null,
              isActive: true,
              position: 0,
              images: [],
              optionValues: [],
              priceTiers: [{ id: "t1", minQuantity: 6, unitPrice: 4.5 }],
            }
          ]
        }
      ])
    }
  }
}));

import { priceOrderItems } from "../services/pricing";

describe("priceOrderItems", () => {
  it("prices public products with optional personalization", async () => {
    const result = await priceOrderItems([
      { productId: "p1", quantity: 6, selectedExtraIds: ["e1"], personalization: { name: "Spotty" } }
    ]);

    expect(result[0]?.lineTotal).toBe(39);
  });

  it("prices products without personalization values", async () => {
    const result = await priceOrderItems([
      { productId: "p1", quantity: 1, selectedExtraIds: [], personalization: {} }
    ]);

    expect(result[0]?.lineTotal).toBe(16);
  });
});
