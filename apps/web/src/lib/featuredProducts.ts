import type { Product } from "@artenova/shared";

export function selectFeaturedProducts(products: Product[], limit = 4) {
  const selected: Product[] = [];
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
