import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@artenova/shared";
import { AdminProductDetailPage } from "../pages/admin/AdminProductDetailPage";
import { theme } from "../theme/theme";

const adminProductMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    adminProduct: (...args: unknown[]) => adminProductMock(...args),
  },
}));

vi.mock("../pages/admin/adminCrudUi", () => ({
  AdminBackButton: ({ to, label = "Volver" }: { to: string; label?: string }) => <a href={to}>{label}</a>,
  AdminBreadcrumbs: ({ items }: { items: Array<{ label: string }> }) => <nav>{items.map((item) => item.label).join(" / ")}</nav>,
  AdminDetailSection: ({ title, children }: { title: string; children: React.ReactNode }) => <section aria-label={title}>{children}</section>,
  AdminField: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <div>{value}</div>
    </div>
  ),
}));

vi.mock("../pages/admin/adminUi", () => ({
  AdminPageHeader: ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {action}
    </header>
  ),
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
}));

const variant = {
  id: "v1",
  productId: "p1",
  name: "Base",
  sku: "LET-01",
  selectionKey: null,
  visualGroupKey: "base",
  basePrice: 20,
  discountType: null,
  discountValue: null,
  isActive: true,
  position: 0,
  media: [],
  attributes: [],
  selections: [],
  priceTiers: [],
  pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
};

const product: Product = {
  id: "p1",
  name: "Letrero acrilico",
  slug: "letrero-acrilico",
  sku: "LET-01",
  defaultVariantId: "v1",
  currencySymbol: "$",
  description: "Ficha tecnica:\n[Aqui](https://artenovapty.com/catalogo.pdf)",
  categoryId: "c1",
  basePrice: 20,
  discountType: null,
  discountValue: null,
  isPublished: true,
  isFeatured: false,
  isHero: false,
  heroSlot: null,
  media: [],
  priceTiers: [],
  extras: [],
  customFields: [],
  productOptions: [],
  variants: [variant],
  defaultVariant: variant,
  pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
  reviews: [],
  reviewSummary: { averageRating: 0, reviewCount: 0 },
};

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/admin/productos/p1"]}>
        <Routes>
          <Route path="/admin/productos/:id" element={<AdminProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("AdminProductDetailPage", () => {
  beforeEach(() => {
    adminProductMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders markdown links in the product description", async () => {
    adminProductMock.mockResolvedValue(product);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: "Aqui" });
    expect(link).toHaveAttribute("href", "https://artenovapty.com/catalogo.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });
});
