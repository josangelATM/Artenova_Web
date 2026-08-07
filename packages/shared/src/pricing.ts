import type { DiscountType, PriceTier, Product, ProductExtra, ProductVariant, PricingSummary } from "./index";

type Discountable = {
  basePrice: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
};

type TieredPrice = Discountable & {
  priceTiers: Array<Pick<PriceTier, "minQuantity" | "unitPrice" | "totalPrice">>;
};

export function applyDiscount(basePrice: number, discountType?: DiscountType | null, discountValue?: number | null): number {
  if (!discountType || discountValue == null || discountValue <= 0) return roundMoney(basePrice);
  const discounted = discountType === "percentage" ? basePrice * (1 - discountValue / 100) : basePrice - discountValue;
  return roundMoney(Math.max(0, discounted));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function resolveTierPrice(
  tier: Pick<PriceTier, "minQuantity" | "unitPrice" | "totalPrice">,
  discountType?: DiscountType | null,
  discountValue?: number | null
) {
  const originalUnitPrice = roundMoney(tier.unitPrice);
  const originalTotalPrice = tier.totalPrice == null ? null : roundMoney(tier.totalPrice);
  return {
    ...tier,
    originalUnitPrice,
    originalTotalPrice,
    finalUnitPrice: applyDiscount(originalUnitPrice, discountType, discountValue),
    finalTotalPrice: originalTotalPrice == null ? null : applyDiscount(originalTotalPrice, discountType, discountValue),
    hasDiscount: Boolean(discountType && discountValue != null && discountValue > 0),
  };
}

export function getUnitPrice(product: TieredPrice, quantity: number): number {
  const sorted = [...product.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
  const tier = sorted.find((item) => quantity >= item.minQuantity);
  if (tier) {
    return applyDiscount(tier.unitPrice, product.discountType, product.discountValue);
  }
  return applyDiscount(product.basePrice, product.discountType, product.discountValue);
}

export function resolvePricingSummary(item: Discountable): PricingSummary {
  return {
    originalPrice: roundMoney(item.basePrice),
    finalPrice: applyDiscount(item.basePrice, item.discountType, item.discountValue),
    hasDiscount: Boolean(item.discountType && item.discountValue != null && item.discountValue > 0),
    discountType: item.discountType ?? null,
    discountValue: item.discountValue ?? null,
  };
}

export function getFromPrice(product: Pick<Product, "basePrice" | "discountType" | "discountValue" | "variants">): number {
  if (!product.variants?.length) {
    return resolvePricingSummary(product).finalPrice;
  }

  const activeVariantPrices = product.variants
    .filter((variant) => variant.isActive)
    .map((variant) => resolvePricingSummary({
      basePrice: variant.basePrice,
      discountType: variant.discountType,
      discountValue: variant.discountValue,
    }).finalPrice);

  return activeVariantPrices.length > 0 ? Math.min(...activeVariantPrices) : resolvePricingSummary(product).finalPrice;
}

function resolveCommercialSource(
  product: Pick<Product, "basePrice" | "priceTiers" | "discountType" | "discountValue" | "defaultVariant">,
) {
  const variant = product.defaultVariant;
  if (!variant) return product;
  return {
    basePrice: variant.basePrice,
    priceTiers: variant.priceTiers,
    discountType: variant.discountType,
    discountValue: variant.discountValue,
  };
}

export function calculateLineTotal(
  product: Pick<Product, "basePrice" | "priceTiers" | "extras" | "discountType" | "discountValue" | "defaultVariant">,
  quantity: number,
  selectedExtraIds: string[]
): { unitPrice: number; extrasTotal: number; lineTotal: number; extras: ProductExtra[] } {
  const commercialSource = resolveCommercialSource(product);
  const exactTier = commercialSource.priceTiers.find((tier) => tier.totalPrice != null && tier.minQuantity === quantity);
  const discountedTier = exactTier ? resolveTierPrice(exactTier, commercialSource.discountType, commercialSource.discountValue) : null;
  const unitPrice = discountedTier?.finalTotalPrice != null ? roundMoney(discountedTier.finalTotalPrice / quantity) : getUnitPrice(commercialSource, quantity);
  const selected = product.extras.filter((extra) => selectedExtraIds.includes(extra.id ?? ""));
  const extrasUnitTotal = selected.reduce((sum, extra) => sum + extra.priceDelta, 0);
  const extrasTotal = roundMoney(extrasUnitTotal * quantity);
  return {
    unitPrice,
    extrasTotal,
    lineTotal: roundMoney((discountedTier?.finalTotalPrice ?? unitPrice * quantity) + extrasTotal),
    extras: selected
  };
}

export function resolveDisplayTiers<T extends TieredPrice>(item: T) {
  return item.priceTiers.map((tier) => resolveTierPrice(tier, item.discountType, item.discountValue));
}

export function resolveVariantPricing(variant: ProductVariant, product: Pick<Product, "discountType" | "discountValue" | "priceTiers">) {
  return {
    pricingSummary: resolvePricingSummary({
      basePrice: variant.basePrice,
      discountType: variant.discountType,
      discountValue: variant.discountValue,
    }),
    priceTiers: resolveDisplayTiers({
      basePrice: variant.basePrice,
      discountType: variant.discountType,
      discountValue: variant.discountValue,
      priceTiers: variant.priceTiers,
    }),
  };
}

