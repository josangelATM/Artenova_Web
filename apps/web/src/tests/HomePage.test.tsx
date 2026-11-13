import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProductCard, CatalogProductListResponse, SiteSettings } from "@artenova/shared";
import { HomePage } from "../pages/HomePage";
import { theme } from "../theme/theme";

const categoriesMock = vi.fn();
const productsMock = vi.fn();
const settingsMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    featuredCategories: () => categoriesMock(),
    products: (...args: unknown[]) => productsMock(...args),
    settings: (...args: unknown[]) => settingsMock(...args),
  },
}));

vi.mock("../lib/seo", () => ({
  applySeo: vi.fn(),
}));

function makeProduct(id: string, name: string, isFeatured = false): CatalogProductCard {
  return {
    id,
    name,
    slug: id,
    sku: null,
    currencySymbol: "$",
    description: `Descripcion de ${name}`,
    isFeatured,
    media: [{ id: `img-${id}`, type: "image", url: `/seed/${id}.jpg`, alt: name, position: 0, posterUrl: null }],
    defaultVariant: null,
    reviewSummary: { averageRating: 0, reviewCount: 0 },
    pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
    extraMediaCount: 0,
  };
}

function makeResponse(items: CatalogProductCard[]): CatalogProductListResponse {
  return { items, nextCursor: null, hasMore: false };
}

const settings: SiteSettings = {
  brandName: "Artenova",
  heroTitle: "Regalos personalizados que guardan historias",
  heroSubtitle: "Taller creativo de corte y grabado laser.",
  whatsapp: "",
  email: "hola@artenova.test",
  address: "Panama",
  businessHours: "Lunes a viernes",
  mapsUrl: "",
  bannerText: "",
  personalizationNotice: "",
};

describe("HomePage", () => {
  beforeEach(() => {
    cleanup();
    categoriesMock.mockReset().mockResolvedValue([]);
    productsMock.mockReset();
    settingsMock.mockReset();
  });

  it("shows every selected catalog after products with links and image fallback", async () => {
    settingsMock.mockResolvedValue(settings);
    productsMock.mockResolvedValue(makeResponse([]));
    categoriesMock.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({
      id: String(index), name: `Colección ${index}`, slug: `coleccion-${index}`,
      href: `/catalogo/coleccion-${index}`, description: "Detalles personalizados",
      imageUrl: index === 0 ? "/cover.jpg" : null,
    })));
    render(<ThemeProvider theme={theme}><MemoryRouter><HomePage /></MemoryRouter></ThemeProvider>);
    const section = await screen.findByRole("region", { name: "Catálogos destacados" });
    expect(screen.getAllByRole("link", { name: /^Ver catálogo:/ })).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Ver catálogo: Colección 0" }).getAttribute("href")).toBe("/catalogo/coleccion-0");
    expect(screen.getByText("Productos destacados").compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.error(screen.getByRole("img", { name: "Colección 0" }));
    expect(screen.getByRole("img", { name: "Catálogo Colección 0 sin imagen" })).toBeTruthy();
  });

  it("keeps the home usable if the independent catalog request fails", async () => {
    settingsMock.mockResolvedValue(settings);
    productsMock.mockResolvedValue(makeResponse([makeProduct("p1", "Producto visible", true)]));
    categoriesMock.mockRejectedValue(new Error("Unavailable"));
    render(<ThemeProvider theme={theme}><MemoryRouter><HomePage /></MemoryRouter></ThemeProvider>);
    await screen.findByText("Producto visible");
    expect(screen.queryByRole("region", { name: "Catálogos destacados" })).toBeNull();
  });

  it("renders a compact home hero with four featured slots and no catalog filters", async () => {
    settingsMock.mockResolvedValue(settings);
    productsMock.mockResolvedValue(makeResponse([
      makeProduct("p1", "Producto 1", true),
      makeProduct("p2", "Producto 2", false),
      makeProduct("p3", "Producto 3", true),
      makeProduct("p4", "Producto 4", false),
      makeProduct("p5", "Producto 5", false),
    ]));

    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getAllByRole("link", { name: /ver cat.+logo completo/i })[0]?.getAttribute("href")).toBe("/catalogo");
    expect(screen.getByRole("link", { name: /ver cédulas personalizadas para mascotas/i }).getAttribute("href")).toBe(
      "https://artenovapty.com/producto/cedulas-personalizadas-mascotas",
    );
    expect(screen.queryByText(/c.+mo trabajamos/i)).toBeNull();

    await waitFor(() => {
      const productLinks = screen
        .getAllByRole("link")
        .filter((element) => element.getAttribute("href")?.startsWith("/producto/"));
      expect(productLinks).toHaveLength(4);
    });

    expect(screen.queryByPlaceholderText(/buscar por producto o referencia/i)).toBeNull();
    expect(screen.queryByText(/categor.+as/i)).toBeNull();
  });
});
