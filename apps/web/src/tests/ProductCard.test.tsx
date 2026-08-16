import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ProductCard } from "../components/ProductCard";
import { theme } from "../theme/theme";
import type { CatalogProductCard } from "@artenova/shared";

const product: CatalogProductCard = {
  id: "p1",
  name: "Retrato grabado",
  slug: "retrato-grabado",
  sku: null,
  currencySymbol: "$",
  description: "Detalle personalizado",
  isFeatured: true,
  media: [{ id: "i1", type: "image", url: "/seed/mascotas/mascotas-2.jpg", alt: "Retrato", position: 0, posterUrl: null }],
  defaultVariant: null,
  pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
  reviewSummary: { averageRating: 4.8, reviewCount: 12 },
  extraMediaCount: 0,
};

afterEach(() => {
  cleanup();
});

describe("ProductCard", () => {
  it("shows product name, base price, and review summary", () => {
    render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <ProductCard product={product} />
        </BrowserRouter>
      </ThemeProvider>
    );

    expect(screen.getByText("Retrato grabado")).toBeTruthy();
    expect(screen.getByText("$16.00")).toBeTruthy();
    expect(screen.getByText("4.8 (12)")).toBeTruthy();
    expect(screen.queryByText("Destacado")).toBeNull();
    expect(screen.queryByText("Consultar")).toBeNull();
    expect(screen.getByRole("link", { name: /Retrato grabado/i }).getAttribute("href")).toBe("/producto/retrato-grabado");
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
              extraMediaCount: 2,
              media: [{ id: "base-1", type: "image", url: "/seed/base-1.jpg", alt: "Base uno", position: 0, posterUrl: null }],
              defaultVariant: {
                id: "v1",
                sku: "V1",
                media: [{ id: "variant-1", type: "image", url: "/seed/variant-1.jpg", alt: "Variante uno", position: 0, posterUrl: null }],
                pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
              },
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
              extraMediaCount: 2,
              defaultVariant: {
                id: "v1",
                sku: "V1",
                media: [
                  { id: "variant-1", type: "image", url: "/seed/variant-1.jpg", alt: "Variante uno", position: 0, posterUrl: null },
                  { id: "variant-2", type: "image", url: "/seed/variant-2.jpg", alt: "Variante dos", position: 1, posterUrl: null },
                ],
                pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
              },
            }}
          />
        </BrowserRouter>
      </ThemeProvider>
    );

    expect(screen.getAllByText("+2").length).toBeGreaterThan(0);
  });

  it("shows a placeholder until the image finishes loading", () => {
    render(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <ProductCard product={product} />
        </BrowserRouter>
      </ThemeProvider>
    );

    const image = document.querySelector('img[alt="Retrato"]') as HTMLImageElement | null;
    expect(image).toBeTruthy();
    expect(screen.getByTestId("product-card-image-placeholder")).toBeTruthy();

    fireEvent.load(image!);

    expect(screen.queryByTestId("product-card-image-placeholder")).toBeNull();
  });
});
