import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product, SiteSettings } from "@artenova/shared";
import { ProductPage } from "../pages/ProductPage";
import { theme } from "../theme/theme";

const productMock = vi.fn();
const settingsMock = vi.fn();
const applySeoMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    product: (...args: unknown[]) => productMock(...args),
    settings: (...args: unknown[]) => settingsMock(...args),
  },
}));

vi.mock("../lib/seo", () => ({
  applySeo: (...args: unknown[]) => applySeoMock(...args),
  productSeoDescription: ({ name, price }: { name: string; price: number }) => `${name} ${price}`,
}));

const settings: SiteSettings = {
  brandName: "Artenova",
  heroTitle: "Regalos personalizados que guardan historias",
  heroSubtitle: "Taller creativo de corte y grabado láser.",
  whatsapp: "50760000000",
  email: "hola@artenova.test",
  address: "Panamá",
  businessHours: "Lunes a viernes",
  mapsUrl: "",
  bannerText: "",
  personalizationNotice: "",
};

const product: Product = {
  id: "p1",
  name: "Letrero acrílico",
  slug: "letrero-acrilico",
  description: "Ideal para recuerdos personalizados.",
  categoryId: "c1",
  basePrice: 15,
  discountType: null,
  discountValue: null,
  isPublished: true,
  isFeatured: false,
  isHero: false,
  heroSlot: null,
  images: [
    { id: "img-base", url: "/seed/base.jpg", alt: "Foto base", position: 0 },
    { id: "img-base-2", url: "/seed/base-2.jpg", alt: "Foto base dos", position: 1 },
  ],
  priceTiers: [],
  extras: [],
  customFields: [],
  productOptions: [
    {
      id: "size",
      productId: "p1",
      name: "Tamaño",
      position: 0,
      values: [
        { id: "small", optionId: "size", value: "Pequeño", position: 0, swatch: null },
        { id: "large", optionId: "size", value: "Grande", position: 1, swatch: null },
      ],
    },
  ],
  variants: [
    {
      id: "v1",
      productId: "p1",
      name: "Pequeño",
      sku: "PEQ-01",
      selectionKey: "small",
      basePrice: 20,
      discountType: null,
      discountValue: null,
      isActive: true,
      position: 0,
      images: [
        { id: "img-small", url: "/seed/small.jpg", alt: "Foto pequeño", position: 0 },
        { id: "img-small-2", url: "/seed/small-2.jpg", alt: "Foto pequeño dos", position: 1 },
      ],
      attributes: [],
      selections: [{ optionId: "size", optionName: "Tamaño", optionValueId: "small", value: "Pequeño", position: 0 }],
      priceTiers: [],
      pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
    },
    {
      id: "v2",
      productId: "p1",
      name: "Grande",
      sku: "GDE-01",
      selectionKey: "large",
      basePrice: 22,
      discountType: null,
      discountValue: null,
      isActive: true,
      position: 1,
      images: [{ id: "img-large", url: "/seed/large.jpg", alt: "Foto grande", position: 0 }],
      attributes: [],
      selections: [{ optionId: "size", optionName: "Tamaño", optionValueId: "large", value: "Grande", position: 0 }],
      priceTiers: [],
      pricingSummary: { originalPrice: 22, finalPrice: 22, hasDiscount: false, discountType: null, discountValue: null },
    },
  ],
  pricingSummary: { originalPrice: 15, finalPrice: 15, hasDiscount: false, discountType: null, discountValue: null },
  reviews: [],
  reviewSummary: { averageRating: 0, reviewCount: 0 },
};

function renderProductPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/producto/letrero-acrilico"]}>
        <Routes>
          <Route path="/producto/:slug" element={<ProductPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("ProductPage", () => {
  beforeEach(() => {
    productMock.mockReset();
    settingsMock.mockReset();
    applySeoMock.mockReset();
  });

  it("navigates across base and variant images while syncing the selected variant", async () => {
    productMock.mockResolvedValue(product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrílico")).toBeInTheDocument();
    });

    expect(screen.queryByText("Presentación elegida")).not.toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Imagen anterior")).toHaveLength(1);
    expect(screen.getAllByLabelText("Imagen siguiente")).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: /foto base/i }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("Imagen siguiente"));

    await waitFor(() => {
      expect(screen.getAllByRole("img", { name: /foto base dos/i }).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("$15.00")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Imagen siguiente"));

    await waitFor(() => {
      expect(screen.getByText("$20.00")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("img", { name: /foto pequeño/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Pequeño" })).toHaveClass("MuiChip-filled");
    expect(screen.queryByText("Presentación elegida")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Imagen anterior"));

    await waitFor(() => {
      expect(screen.getByText("$15.00")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("img", { name: /foto base dos/i }).length).toBeGreaterThan(0);
  });
});
