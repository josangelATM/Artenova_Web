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
  discountType: null,
  discountValue: null,
  material: "MDF",
  size: "20 cm",
  technique: "Grabado laser",
  isPublished: true,
  isFeatured: true,
  isHero: false,
  heroSlot: null,
  images: [],
  priceTiers: [],
  extras: [],
  customFields: [],
  variants: [],
  pricingSummary: { originalPrice: 16, finalPrice: 16, hasDiscount: false, discountType: null, discountValue: null },
  reviewSummary: { averageRating: 4.5, reviewCount: 2 },
  reviews: [
    {
      id: "r1",
      productId: "p1",
      rating: 5,
      customerName: "Ana",
      comment: "Quedo precioso.",
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

    expect(screen.getByRole("textbox", { name: /tu nombre/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /comentario/i })).toBeInTheDocument();
    expect(screen.getByText(/Ana/i)).toBeInTheDocument();
    expect(screen.getByText(/Quedo precioso/i)).toBeInTheDocument();
  });
});
