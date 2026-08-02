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
  description: "Detalle personalizado",
  categoryId: "c1",
  basePrice: 16,
  material: "MDF",
  size: "20 cm",
  technique: "Grabado láser",
  isPublished: true,
  isFeatured: true,
  isHero: false,
  heroSlot: null,
  images: [{ id: "i1", url: "/seed/mascotas/mascotas-2.jpg", alt: "Retrato", position: 0 }],
  priceTiers: [],
  extras: [],
  customFields: [],
  reviews: [],
  reviewSummary: { averageRating: 4.8, reviewCount: 12 },
  tags: [
    { id: "t1", name: "Regalo", slug: "regalo", description: null, accentColor: "#ef798a", isActive: true },
    { id: "t2", name: "Mascotas", slug: "mascotas", description: null, accentColor: "#8ac6d1", isActive: true }
  ]
};

describe("ProductCard", () => {
  it("shows product name, base price, and useful tags only", () => {
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
    expect(screen.getByText("Mascotas")).toBeInTheDocument();
    expect(screen.queryByText("Regalo")).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
    expect(screen.queryByText("Consultar")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Retrato grabado/i })).toHaveAttribute("href", "/producto/retrato-grabado");
  });
});

