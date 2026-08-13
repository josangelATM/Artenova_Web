import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProductCard } from "../components/ProductCard";
import { theme } from "../theme/theme";
import type { Product } from "@artenova/shared";

const product: Product = {
  id: "p1",
  name: "Retrato grabado",
  slug: "retrato-grabado",
  currencySymbol: "$",
  description: "Detalle personalizado",
  categoryId: "c1",
  basePrice: 16,
  discountType: null,
  discountValue: null,
  isPublished: true,
  isFeatured: true,
  isHero: false,
  heroSlot: null,
  media: [{ id: "i1", type: "image", url: "/seed/mascotas/mascotas-2.jpg", alt: "Retrato", position: 0, posterUrl: null }],
  priceTiers: [],
  extras: [],
  customFields: [],
  productOptions: [],
  variants: [],
  pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
  reviews: [],
  reviewSummary: { averageRating: 4.8, reviewCount: 12 },
};

describe("ProductCard", () => {
  it("shows product name, base price, and review summary", () => {
    render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <ProductCard product={product} />
        </BrowserRouter>
      </ThemeProvider>
    );

    expect(screen.getByText("Retrato grabado")).toBeInTheDocument();
    expect(screen.getByText("$16.00")).toBeInTheDocument();
    expect(screen.getByText("4.8 (12)")).toBeInTheDocument();
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
    expect(screen.queryByText("Consultar")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Retrato grabado/i })).toHaveAttribute("href", "/producto/retrato-grabado");
  });

  it("renders an inline video preview when the product only has video media", () => {
    render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <ProductCard
            product={{
              ...product,
              media: [{ id: "v1", type: "video", url: "/seed/demo.mp4", alt: "Video demo", position: 0, posterUrl: null }],
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    );

    expect(screen.getByLabelText(/video demo/i).tagName.toLowerCase()).toBe("video");
  });

  it("counts base and active variant media together without duplicating repeats", () => {
    render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <ProductCard
            product={{
              ...product,
              media: [{ id: "base-1", type: "image", url: "/seed/base-1.jpg", alt: "Base uno", position: 0, posterUrl: null }],
              variants: [
                {
                  id: "v1",
                  productId: "p1",
                  name: "Variante uno",
                  sku: "V1",
                  selectionKey: "v1",
                  visualGroupKey: "grupo-1",
                  basePrice: 16,
                  discountType: null,
                  discountValue: null,
                  isActive: true,
                  position: 0,
                  media: [
                    { id: "variant-1", type: "image", url: "/seed/variant-1.jpg", alt: "Variante uno", position: 0, posterUrl: null },
                    { id: "base-1", type: "image", url: "/seed/base-1.jpg", alt: "Duplicada", position: 1, posterUrl: null },
                  ],
                  attributes: [],
                  selections: [],
                  priceTiers: [],
                  pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
                },
                {
                  id: "v2",
                  productId: "p1",
                  name: "Variante dos",
                  sku: "V2",
                  selectionKey: "v2",
                  visualGroupKey: "grupo-2",
                  basePrice: 16,
                  discountType: null,
                  discountValue: null,
                  isActive: true,
                  position: 1,
                  media: [
                    { id: "variant-2", type: "image", url: "/seed/variant-2.jpg", alt: "Variante dos", position: 0, posterUrl: null },
                  ],
                  attributes: [],
                  selections: [],
                  priceTiers: [],
                  pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
                },
              ],
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    );

    expect(screen.getAllByText("+2").length).toBeGreaterThan(0);
  });

  it("counts active variant media when the product has no base media", () => {
    render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <ProductCard
            product={{
              ...product,
              media: [],
              variants: [
                {
                  id: "v1",
                  productId: "p1",
                  name: "Variante uno",
                  sku: "V1",
                  selectionKey: "v1",
                  visualGroupKey: "grupo-1",
                  basePrice: 16,
                  discountType: null,
                  discountValue: null,
                  isActive: true,
                  position: 0,
                  media: [
                    { id: "variant-1", type: "image", url: "/seed/variant-1.jpg", alt: "Variante uno", position: 0, posterUrl: null },
                    { id: "variant-2", type: "image", url: "/seed/variant-2.jpg", alt: "Variante dos", position: 1, posterUrl: null },
                  ],
                  attributes: [],
                  selections: [],
                  priceTiers: [],
                  pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
                },
                {
                  id: "v2",
                  productId: "p1",
                  name: "Variante dos",
                  sku: "V2",
                  selectionKey: "v2",
                  visualGroupKey: "grupo-2",
                  basePrice: 16,
                  discountType: null,
                  discountValue: null,
                  isActive: true,
                  position: 1,
                  media: [
                    { id: "variant-3", type: "image", url: "/seed/variant-3.jpg", alt: "Variante tres", position: 0, posterUrl: null },
                  ],
                  attributes: [],
                  selections: [],
                  priceTiers: [],
                  pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
                },
              ],
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    );

    expect(screen.getAllByText("+2").length).toBeGreaterThan(0);
  });
});
