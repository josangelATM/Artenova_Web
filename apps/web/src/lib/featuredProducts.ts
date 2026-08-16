type FeaturedProductLike = {
  id: string;
  isFeatured: boolean;
};

export function selectFeaturedProducts<T extends FeaturedProductLike>(products: T[], limit = 4) {
  const selected: T[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    if (!product.isFeatured) continue;
    selected.push(product);
    seen.add(product.id);
    if (selected.length === limit) return selected;
  }

  for (const product of products) {
    if (seen.has(product.id)) continue;
    selected.push(product);
    if (selected.length === limit) return selected;
  }

  return selected;
}
