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

  it("uses exact total price tiers without rounding drift", () => {
    const exactProduct = {
      basePrice: 10,
      priceTiers: [
        { minQuantity: 3, unitPrice: 7.67, totalPrice: 23 },
        { minQuantity: 6, unitPrice: 6.33, totalPrice: 38 }
      ],
      extras: [{ id: "qr", name: "QR trasero", type: "personalizacion", priceDelta: 2 }]
    };

    expect(calculateLineTotal(exactProduct, 3, []).lineTotal).toBe(23);
    expect(calculateLineTotal(exactProduct, 6, []).lineTotal).toBe(38);
    expect(calculateLineTotal(exactProduct, 3, ["qr"]).lineTotal).toBe(29);
  });
});

