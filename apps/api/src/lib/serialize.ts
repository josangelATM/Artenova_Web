import { getFromPrice, resolveDisplayTiers, resolvePricingSummary, resolveVariantPricing } from "@artenova/shared";

type DecimalLike = { toString(): string };

const toNumber = (value: DecimalLike | number | null | undefined) =>
  value == null ? value : Number(value.toString());

function createSyntheticVariant(product: any) {
  return {
    id: `synthetic-${product.id}`,
    productId: product.id,
    name: product.name,
    sku: product.sku ?? null,
    selectionKey: null,
    basePrice: toNumber(product.basePrice) ?? 0,
    discountType: product.discountType ?? null,
    discountValue: toNumber(product.discountValue) ?? null,
    isActive: true,
    position: 0,
    images: [],
    attributes: [],
    selections: [],
    priceTiers: (product.priceTiers ?? []).map((tier: any) => ({
      ...tier,
      unitPrice: toNumber(tier.unitPrice),
      totalPrice: toNumber(tier.totalPrice)
    }))
  };
}

export function productPayload(product: any) {
  const productOptions = (product.options ?? []).map((option: any) => ({
    ...option,
    values: (option.values ?? []).map((value: any) => ({
      ...value,
      swatch: value.swatch ?? null,
    }))
  }));

  const fallbackOptionsMap = new Map<string, { id: string; name: string; position: number; values: Array<{ id: string; optionId: string; value: string; position: number; swatch: null }> }>();

  const rawVariants = (product.variants?.length ? product.variants : [createSyntheticVariant(product)]).map((variant: any) => {
    const selections = (variant.optionValues ?? []).map((selection: any) => ({
      optionId: selection.optionValue.option.id,
      optionName: selection.optionValue.option.name,
      optionValueId: selection.optionValue.id,
      value: selection.optionValue.value,
      position: selection.optionValue.option.position ?? 0
    }));

    const legacyAttributes = (variant.attributes ?? []).map((attribute: any) => ({
      ...attribute,
    }));

    if (productOptions.length === 0 && selections.length === 0) {
      legacyAttributes.forEach((attribute: any, index: number) => {
        const optionId = `legacy-option-${attribute.name}`;
        const valueId = `legacy-value-${attribute.name}-${attribute.value}`;
        const existing: { id: string; name: string; position: number; values: Array<{ id: string; optionId: string; value: string; position: number; swatch: null }> } = fallbackOptionsMap.get(optionId) ?? {
          id: optionId,
          name: attribute.name,
          position: attribute.position ?? index,
          values: []
        };
        if (!existing.values.some((value) => value.id === valueId)) {
          existing.values.push({
            id: valueId,
            optionId,
            value: attribute.value,
            position: attribute.position ?? existing.values.length,
            swatch: null
          });
        }
        fallbackOptionsMap.set(optionId, existing);
      });
    }

    const resolvedSelections = selections.length > 0
      ? selections
      : legacyAttributes.map((attribute: any, index: number) => ({
          optionId: `legacy-option-${attribute.name}`,
          optionName: attribute.name,
          optionValueId: `legacy-value-${attribute.name}-${attribute.value}`,
          value: attribute.value,
          position: attribute.position ?? index
        }));

    const normalizedVariant = {
      ...variant,
      selectionKey: variant.selectionKey ?? null,
      basePrice: toNumber(variant.basePrice),
      discountValue: toNumber(variant.discountValue),
      images: (variant.images ?? []).map((image: any) => ({
        ...image,
      })),
      attributes: legacyAttributes,
      selections: resolvedSelections.sort((a: { position: number }, b: { position: number }) => a.position - b.position),
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

  const variants = rawVariants;
  const primaryVariant = variants.find((variant: any) => variant.isActive) ?? variants[0] ?? null;

  const reviews = product.reviews?.map(reviewPayload) ?? [];
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0 ? Number((reviews.reduce((total: number, review: any) => total + review.rating, 0) / reviewCount).toFixed(1)) : 0;
  const hasOptionSelectors = productOptions.length > 0 || fallbackOptionsMap.size > 0;
  const normalizedProduct = {
    ...product,
    basePrice: hasOptionSelectors ? toNumber(product.basePrice) : primaryVariant?.basePrice ?? toNumber(product.basePrice),
    discountType: hasOptionSelectors ? product.discountType ?? null : primaryVariant?.discountType ?? product.discountType ?? null,
    discountValue: hasOptionSelectors ? toNumber(product.discountValue) : primaryVariant?.discountValue ?? toNumber(product.discountValue),
    priceTiers: product.priceTiers?.map((tier: any) => ({
      ...tier,
      unitPrice: toNumber(tier.unitPrice),
      totalPrice: toNumber(tier.totalPrice)
    })) ?? []
  };
  const pricingSummary = {
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
  };

  const displayProductTiers = hasOptionSelectors
    ? resolveDisplayTiers(normalizedProduct)
    : (primaryVariant?.priceTiers ?? []);

  return {
    ...normalizedProduct,
    priceTiers: displayProductTiers,
    extras: product.extras?.map((extra: any) => ({
      ...extra,
      priceDelta: toNumber(extra.priceDelta)
    })) ?? [],
    customFields: product.customFields?.map((field: any) => ({
      ...field,
      options: Array.isArray(field.options) ? field.options : []
    })) ?? [],
    productOptions: (productOptions.length > 0 ? productOptions : Array.from(fallbackOptionsMap.values()).sort((a, b) => a.position - b.position)).map((option: any) => ({
      ...option,
      values: [...option.values].sort((a, b) => a.position - b.position)
    })),
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

