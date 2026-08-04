import { getFromPrice, resolveDisplayTiers, resolvePricingSummary, resolveVariantPricing } from "@artenova/shared";

type DecimalLike = { toString(): string };

const toNumber = (value: DecimalLike | number | null | undefined) =>
  value == null ? value : Number(value.toString());

export function productPayload(product: any) {
  const variants = (product.variants ?? []).map((variant: any) => {
    const normalizedVariant = {
      ...variant,
      basePrice: toNumber(variant.basePrice),
      discountValue: toNumber(variant.discountValue),
      images: (variant.images ?? []).map((image: any) => ({
        ...image,
      })),
      attributes: (variant.attributes ?? []).map((attribute: any) => ({
        ...attribute,
      })),
      priceTiers: (variant.priceTiers ?? []).map((tier: any) => ({
        ...tier,
        unitPrice: toNumber(tier.unitPrice),
        totalPrice: toNumber(tier.totalPrice)
      }))
    };

    const resolved = resolveVariantPricing(normalizedVariant, {
      discountType: product.discountType ?? null,
      discountValue: toNumber(product.discountValue) ?? null,
      priceTiers: (product.priceTiers ?? []).map((tier: any) => ({
        ...tier,
        unitPrice: toNumber(tier.unitPrice),
        totalPrice: toNumber(tier.totalPrice)
      }))
    });

    return {
      ...normalizedVariant,
      priceTiers: resolved.priceTiers,
      pricingSummary: resolved.pricingSummary
    };
  });

  const reviews = product.reviews?.map(reviewPayload) ?? [];
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0 ? Number((reviews.reduce((total: number, review: any) => total + review.rating, 0) / reviewCount).toFixed(1)) : 0;
  const normalizedProduct = {
    ...product,
    basePrice: toNumber(product.basePrice),
    discountValue: toNumber(product.discountValue),
    priceTiers: product.priceTiers?.map((tier: any) => ({
      ...tier,
      unitPrice: toNumber(tier.unitPrice),
      totalPrice: toNumber(tier.totalPrice)
    })) ?? [],
  };
  const pricingSummary = variants.length > 0
    ? {
        originalPrice: getFromPrice({
          basePrice: normalizedProduct.basePrice,
          discountType: null,
          discountValue: null,
          variants: variants.map((variant: any) => ({
            ...variant,
            discountType: null,
            discountValue: null,
          }))
        } as any),
        finalPrice: getFromPrice({
          basePrice: normalizedProduct.basePrice,
          discountType: normalizedProduct.discountType ?? null,
          discountValue: normalizedProduct.discountValue ?? null,
          variants
        } as any),
        hasDiscount: variants.some((variant: any) => variant.pricingSummary.hasDiscount),
        discountType: null,
        discountValue: null
      }
    : resolvePricingSummary(normalizedProduct);

  return {
    ...normalizedProduct,
    priceTiers: resolveDisplayTiers(normalizedProduct),
    extras: product.extras?.map((extra: any) => ({
      ...extra,
      priceDelta: toNumber(extra.priceDelta)
    })) ?? [],
    customFields: product.customFields?.map((field: any) => ({
      ...field,
      options: Array.isArray(field.options) ? field.options : []
    })) ?? [],
    variants,
    pricingSummary,
    reviews,
    reviewSummary: { averageRating, reviewCount }
  };
}

export function reviewPayload(review: any) {
  return {
    ...review,
    productName: review.product?.name ?? review.productName,
    productSlug: review.product?.slug ?? review.productSlug,
    createdAt: review.createdAt?.toISOString?.() ?? review.createdAt,
    updatedAt: review.updatedAt?.toISOString?.() ?? review.updatedAt
  };
}

export function orderPayload(order: any) {
  return {
    ...order,
    estimatedTotal: toNumber(order.estimatedTotal),
    finalPrice: toNumber(order.finalPrice),
    createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
    updatedAt: order.updatedAt?.toISOString?.() ?? order.updatedAt,
    items: order.items?.map((item: any) => ({
      ...item,
      unitPrice: toNumber(item.unitPrice),
      extrasTotal: toNumber(item.extrasTotal),
      lineTotal: toNumber(item.lineTotal),
      selectedExtraIds: Array.isArray(item.selectedExtraIds) ? item.selectedExtraIds : [],
      personalization: item.personalization ?? {}
    })) ?? []
  };
}

