import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "@artenova/shared";
import { ProductReviews } from "../components/ProductReviews";
import { theme } from "../theme/theme";

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
  images: [],
  priceTiers: [],
  extras: [],
  customFields: [],
  tags: [],
  reviewSummary: { averageRating: 4.5, reviewCount: 2 },
  reviews: [
    {
      id: "r1",
      productId: "p1",
      rating: 5,
      customerName: "Ana",
      comment: "Quedó precioso.",
      isApproved: true,
      source: "customer",
      createdAt: "2026-08-01T10:00:00.000Z"
    }
  ]
};

describe("ProductReviews", () => {
  it("shows review summary, comments, and public form", () => {
    render(
      <ThemeProvider theme={theme}>
        <ProductReviews product={product} onReviewCreated={vi.fn()} />
      </ThemeProvider>
    );

    expect(screen.getByText("Reseñas")).toBeInTheDocument();
    expect(screen.getByText("4.5 de 5 · 2 reseñas")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Quedó precioso.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Comentario")).toBeInTheDocument();
  });
});
