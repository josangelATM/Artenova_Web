import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Product, SiteSettings } from "@artenova/shared";
import { CatalogPage } from "../pages/CatalogPage";
import { theme } from "../theme/theme";

const productsMock = vi.fn();
const settingsMock = vi.fn();
const categoriesMock = vi.fn();
const applySeoMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    products: (...args: unknown[]) => productsMock(...args),
    settings: (...args: unknown[]) => settingsMock(...args),
    categories: (...args: unknown[]) => categoriesMock(...args),
  },
}));

vi.mock("../lib/seo", () => ({
  applySeo: (...args: unknown[]) => applySeoMock(...args),
}));

function makeProduct(id: string, name: string): Product {
  return {
    id,
    name,
    slug: id,
    description: `Descripción de ${name}`,
    categoryId: "c1",
    basePrice: 20,
    isPublished: true,
    isFeatured: id === "p1",
    isHero: false,
    heroSlot: null,
    images: [{ id: `img-${id}`, url: `/seed/${id}.jpg`, alt: name, position: 0 }],
    priceTiers: [],
    extras: [],
    customFields: [],
    productOptions: [],
    variants: [],
    reviews: [],
    reviewSummary: { averageRating: 0, reviewCount: 0 },
    discountType: null,
    discountValue: null,
    pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
  };
}

const settings: SiteSettings = {
  brandName: "Artenova",
  heroTitle: "Regalos personalizados que guardan historias",
  heroSubtitle: "Taller creativo de corte y grabado láser.",
  whatsapp: "",
  email: "hola@artenova.test",
  address: "Panamá",
  businessHours: "Lunes a viernes",
  mapsUrl: "",
  bannerText: "",
  personalizationNotice: "",
};

const categories: Category[] = [
  { id: "c1", name: "Mascotas", slug: "mascotas", description: "Para mascotas", accentColor: null, isActive: true },
];

function renderCatalog(initialEntry: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/catalogo/:categorySlug" element={<CatalogPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("CatalogPage", () => {
  beforeEach(() => {
    productsMock.mockReset();
    settingsMock.mockReset();
    categoriesMock.mockReset();
    applySeoMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows occasion cards and then goes directly to catalog controls", async () => {
    const list = [makeProduct("p1", "Producto 1"), makeProduct("p2", "Producto 2")];
    settingsMock.mockResolvedValue(settings);
    categoriesMock.mockResolvedValue(categories);
    productsMock.mockResolvedValue(list);

    renderCatalog("/catalogo");

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/busca por nombre, referencia o idea/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/explora por ocasión/i)).toBeInTheDocument();
    expect(screen.queryByText(/destacado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/piezas para empezar/i)).not.toBeInTheDocument();
    expect(screen.getByText("Categorías")).toBeInTheDocument();
  });

  it("uses clean category routes as the product filter", async () => {
    const list = [makeProduct("p1", "Producto 1")];
    settingsMock.mockResolvedValue(settings);
    categoriesMock.mockResolvedValue(categories);
    productsMock.mockResolvedValue(list);

    renderCatalog("/catalogo/mascotas");

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalledWith(expect.any(URLSearchParams));
    });

    const filteredCall = productsMock.mock.calls.find((call) => (call[0] as URLSearchParams).get("category") === "mascotas");
    expect(filteredCall).toBeTruthy();
    await waitFor(() => {
      expect(applySeoMock).toHaveBeenCalledWith(expect.objectContaining({ path: "/catalogo/mascotas", robots: "index,follow" }));
    });
  });

  it("debounces search before requesting filtered products and marks search as noindex", async () => {
    const list = [makeProduct("p1", "Producto 1"), makeProduct("p2", "Producto 2")];
    settingsMock.mockResolvedValue(settings);
    categoriesMock.mockResolvedValue(categories);
    productsMock.mockResolvedValue(list);

    renderCatalog("/catalogo");

    const search = await screen.findByPlaceholderText(/busca por nombre, referencia o idea/i);
    await waitFor(() => {
      expect(productsMock).toHaveBeenCalled();
    });
    productsMock.mockClear();
    applySeoMock.mockClear();

    fireEvent.change(search, { target: { value: "placa" } });

    expect(productsMock).not.toHaveBeenCalled();

    await waitFor(
      () => {
        expect(productsMock).toHaveBeenCalledTimes(1);
        expect((productsMock.mock.calls[0]![0] as URLSearchParams).get("q")).toBe("placa");
        expect(applySeoMock).toHaveBeenCalledWith(expect.objectContaining({ robots: "noindex,follow" }));
      },
      { timeout: 900 },
    );
  });
});
