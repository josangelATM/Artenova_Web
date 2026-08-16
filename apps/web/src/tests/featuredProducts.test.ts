import { describe, expect, it } from "vitest";
import type { CatalogProductCard } from "@artenova/shared";
import { selectFeaturedProducts } from "../lib/featuredProducts";

function makeProduct(input: Partial<CatalogProductCard> & Pick<CatalogProductCard, "id" | "name" | "slug">): CatalogProductCard {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    sku: input.sku ?? null,
    currencySymbol: input.currencySymbol ?? "$",
    description: input.description ?? "Detalle personalizado",
    isFeatured: input.isFeatured ?? false,
    media: input.media ?? [],
    defaultVariant: input.defaultVariant ?? null,
    reviewSummary: input.reviewSummary ?? { averageRating: 0, reviewCount: 0 },
    pricingSummary:
      input.pricingSummary ?? {
        originalPrice: 10,
        finalPrice: 10,
        hasDiscount: false,
        discountType: null,
        discountValue: null,
      },
    extraMediaCount: input.extraMediaCount ?? 0,
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
