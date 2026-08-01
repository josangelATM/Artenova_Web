import type { Product, ProductExtra } from "./index";

export function getUnitPrice(product: Pick<Product, "basePrice" | "priceTiers">, quantity: number): number {
  const sorted = [...product.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
  return sorted.find((tier) => quantity >= tier.minQuantity)?.unitPrice ?? product.basePrice;
}

export function calculateLineTotal(
  product: Pick<Product, "basePrice" | "priceTiers" | "extras">,
  quantity: number,
  selectedExtraIds: string[]
): { unitPrice: number; extrasTotal: number; lineTotal: number; extras: ProductExtra[] } {
  const unitPrice = getUnitPrice(product, quantity);
  const selected = product.extras.filter((extra) => selectedExtraIds.includes(extra.id ?? ""));
  const extrasTotal = selected.reduce((sum, extra) => sum + extra.priceDelta, 0);
  return {
    unitPrice,
    extrasTotal,
    lineTotal: (unitPrice + extrasTotal) * quantity,
    extras: selected
  };
}

