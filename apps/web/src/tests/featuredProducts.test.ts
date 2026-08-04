import { describe, expect, it } from "vitest";
import type { Product } from "@artenova/shared";
import { selectFeaturedProducts } from "../lib/featuredProducts";

function makeProduct(input: Partial<Product> & Pick<Product, "id" | "name" | "slug">): Product {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    description: input.description ?? "Detalle personalizado",
    categoryId: input.categoryId ?? "c1",
    basePrice: input.basePrice ?? 10,
    material: input.material ?? "MDF",
    size: input.size ?? "20 cm",
    technique: input.technique ?? "Grabado láser",
    isPublished: input.isPublished ?? true,
    isFeatured: input.isFeatured ?? false,
    isHero: input.isHero ?? false,
    heroSlot: input.heroSlot ?? null,
    images: input.images ?? [],
    priceTiers: input.priceTiers ?? [],
    extras: input.extras ?? [],
    customFields: input.customFields ?? [],
    variants: input.variants ?? [],
    reviews: input.reviews ?? [],
    reviewSummary: input.reviewSummary ?? { averageRating: 0, reviewCount: 0 },
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? null,
    pricingSummary: (input as Product).pricingSummary ?? { originalPrice: input.basePrice ?? 10, finalPrice: input.basePrice ?? 10, hasDiscount: false, discountType: null, discountValue: null },
  };
}

describe("selectFeaturedProducts", () => {
  it("prioritizes featured products and fills with the next products without duplicates", () => {
    const products = [
      makeProduct({ id: "p1", name: "Uno", slug: "uno", isFeatured: true }),
      makeProduct({ id: "p2", name: "Dos", slug: "dos", isFeatured: false }),
      makeProduct({ id: "p3", name: "Tres", slug: "tres", isFeatured: true }),
      makeProduct({ id: "p4", name: "Cuatro", slug: "cuatro", isFeatured: false }),
      makeProduct({ id: "p5", name: "Cinco", slug: "cinco", isFeatured: false }),
    ];

    expect(selectFeaturedProducts(products).map((product) => product.id)).toEqual(["p1", "p3", "p2", "p4"]);
  });

  it("returns at most four products", () => {
    const products = [
      makeProduct({ id: "p1", name: "Uno", slug: "uno", isFeatured: true }),
      makeProduct({ id: "p2", name: "Dos", slug: "dos", isFeatured: true }),
      makeProduct({ id: "p3", name: "Tres", slug: "tres", isFeatured: true }),
      makeProduct({ id: "p4", name: "Cuatro", slug: "cuatro", isFeatured: true }),
      makeProduct({ id: "p5", name: "Cinco", slug: "cinco", isFeatured: true }),
    ];

    expect(selectFeaturedProducts(products)).toHaveLength(4);
  });
});
