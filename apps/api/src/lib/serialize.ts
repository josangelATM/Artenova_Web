import { resolvePricingSummary, resolveVariantPricing } from "@artenova/shared";

type DecimalLike = { toString(): string };

const toNumber = (value: DecimalLike | number | null | undefined) =>
  value == null ? value : Number(value.toString());

const defaultCurrencySymbol = "B/.";

function normalizeVariant(variant: any) {
  const normalizedVariant = {
    ...variant,
    selectionKey: variant.selectionKey ?? null,
    visualGroupKey: variant.visualGroupKey ?? null,
    basePrice: toNumber(variant.basePrice) ?? 0,
    discountType: variant.discountType ?? null,
    discountValue: toNumber(variant.discountValue) ?? null,
    media: (variant.images ?? []).map((item: any) => ({
      ...item,
      type: item.type ?? "image",
      posterUrl: item.posterUrl ?? null,
    })),
    attributes: [],
    selections: (variant.optionValues ?? []).map((selection: any) => ({
      optionId: selection.optionValue.option.id,
      optionName: selection.optionValue.option.name,
      optionValueId: selection.optionValue.id,
      value: selection.optionValue.value,
      position: selection.optionValue.option.position ?? 0,
    })).sort((a: { position: number }, b: { position: number }) => a.position - b.position),
    priceTiers: (variant.priceTiers ?? []).map((tier: any) => ({
      ...tier,
      unitPrice: toNumber(tier.unitPrice),
      totalPrice: toNumber(tier.totalPrice),
    })),
  };

  const resolved = resolveVariantPricing(normalizedVariant as any, {
    discountType: null,
    discountValue: null,
    priceTiers: [],
  });

  return {
    ...normalizedVariant,
    priceTiers: resolved.priceTiers,
    pricingSummary: resolved.pricingSummary,
  };
}

export function productPayload(product: any) {
  const variants = (product.variants ?? []).map(normalizeVariant);
  const activeVariants = variants.filter((variant: any) => variant.isActive);
  const defaultVariant =
    variants.find((variant: any) => variant.id === product.defaultVariantId)
    ?? activeVariants[0]
    ?? variants[0]
    ?? null;

  const productOptions = (product.options ?? []).map((option: any) => ({
    ...option,
    values: (option.values ?? []).map((value: any) => ({
      ...value,
      swatch: value.swatch ?? null,
    })),
  }));

  const reviews = product.reviews?.map(reviewPayload) ?? [];
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0 ? Number((reviews.reduce((total: number, review: any) => total + review.rating, 0) / reviewCount).toFixed(1)) : 0;

  const defaultPricing = defaultVariant?.pricingSummary ?? resolvePricingSummary({
    basePrice: toNumber(product.basePrice) ?? 0,
    discountType: null,
    discountValue: null,
  });

  const pricingSummary = variants.length > 0
    ? {
        originalPrice: defaultPricing.originalPrice,
        finalPrice: defaultPricing.finalPrice,
        hasDiscount: defaultPricing.hasDiscount,
        discountType: defaultPricing.discountType ?? null,
        discountValue: defaultPricing.discountValue ?? null,
      }
    : defaultPricing;

  return {
    ...product,
    defaultVariantId: defaultVariant?.id ?? product.defaultVariantId ?? null,
    currencySymbol: product.category?.currencySymbol ?? defaultCurrencySymbol,
    basePrice: defaultVariant?.basePrice ?? toNumber(product.basePrice) ?? 0,
    discountType: defaultVariant?.discountType ?? null,
    discountValue: defaultVariant?.discountValue ?? null,
    priceTiers: defaultVariant?.priceTiers ?? [],
    media: (product.images ?? []).map((item: any) => ({
      ...item,
      type: item.type ?? "image",
      posterUrl: item.posterUrl ?? null,
    })),
    extras: product.extras?.map((extra: any) => ({
      ...extra,
      priceDelta: toNumber(extra.priceDelta),
    })) ?? [],
    customFields: product.customFields?.map((field: any) => ({
      ...field,
      options: Array.isArray(field.options) ? field.options : [],
    })) ?? [],
    productOptions: productOptions.map((option: any) => ({
      ...option,
      values: [...option.values].sort((a, b) => a.position - b.position),
    })),
    variants,
    defaultVariant,
    pricingSummary,
    reviews,
    reviewSummary: { averageRating, reviewCount },
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
