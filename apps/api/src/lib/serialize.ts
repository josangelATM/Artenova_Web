type DecimalLike = { toString(): string };

const toNumber = (value: DecimalLike | number | null | undefined) =>
  value == null ? value : Number(value.toString());

export function productPayload(product: any) {
  const reviews = product.reviews?.map(reviewPayload) ?? [];
  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0 ? Number((reviews.reduce((total: number, review: any) => total + review.rating, 0) / reviewCount).toFixed(1)) : 0;

  return {
    ...product,
    basePrice: toNumber(product.basePrice),
    tags: product.tags?.map((item: any) => item.tag ?? item) ?? [],
    priceTiers: product.priceTiers?.map((tier: any) => ({
      ...tier,
      unitPrice: toNumber(tier.unitPrice),
      totalPrice: toNumber(tier.totalPrice)
    })) ?? [],
    extras: product.extras?.map((extra: any) => ({
      ...extra,
      priceDelta: toNumber(extra.priceDelta)
    })) ?? [],
    customFields: product.customFields?.map((field: any) => ({
      ...field,
      options: Array.isArray(field.options) ? field.options : []
    })) ?? [],
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

