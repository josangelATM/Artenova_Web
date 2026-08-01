import { describe, expect, it } from "vitest";
import { calculateLineTotal, getUnitPrice } from "./pricing";

const product = {
  basePrice: 16,
  priceTiers: [
    { id: "tier-6", minQuantity: 6, unitPrice: 4.5 },
    { id: "tier-12", minQuantity: 12, unitPrice: 4 }
  ],
  extras: [{ id: "gold", name: "Acrilico dorado", type: "material", priceDelta: 2 }]
};

describe("pricing", () => {
  it("uses base price below tier quantity", () => {
    expect(getUnitPrice(product, 1)).toBe(16);
  });

  it("uses the highest matching tier", () => {
    expect(getUnitPrice(product, 12)).toBe(4);
  });

  it("adds extras per unit", () => {
    expect(calculateLineTotal(product, 2, ["gold"]).lineTotal).toBe(36);
  });
});

