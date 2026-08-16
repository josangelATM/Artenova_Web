import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProductCard, CatalogProductListResponse, SiteSettings } from "@artenova/shared";
import { HomePage } from "../pages/HomePage";
import { theme } from "../theme/theme";

const productsMock = vi.fn();
const settingsMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
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
    productsMock.mockReset();
    settingsMock.mockReset();
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
