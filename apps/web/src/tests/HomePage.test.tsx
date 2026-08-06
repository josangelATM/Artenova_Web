import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product, SiteSettings } from "@artenova/shared";
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

function makeProduct(id: string, name: string, isFeatured = false): Product {
  return {
    id,
    name,
    slug: id,
    currencySymbol: "$",
    description: `Descripcion de ${name}`,
    categoryId: "c1",
    basePrice: 20,
    isPublished: true,
    isFeatured,
    isHero: false,
    heroSlot: null,
    media: [{ id: `img-${id}`, type: "image", url: `/seed/${id}.jpg`, alt: name, position: 0, posterUrl: null }],
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
    productsMock.mockResolvedValue([
      makeProduct("p1", "Producto 1", true),
      makeProduct("p2", "Producto 2", false),
      makeProduct("p3", "Producto 3", true),
      makeProduct("p4", "Producto 4", false),
      makeProduct("p5", "Producto 5", false),
    ]);

    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getAllByRole("link", { name: /ver catálogo completo/i })[0]).toHaveAttribute("href", "/catalogo");
    expect(screen.queryByText(/cómo trabajamos/i)).not.toBeInTheDocument();

    await waitFor(() => {
      const productLinks = screen
        .getAllByRole("link")
        .filter((element) => element.getAttribute("href")?.startsWith("/producto/"));
      expect(productLinks).toHaveLength(4);
    });

    expect(screen.queryByPlaceholderText(/buscar por producto o referencia/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Categorías")).not.toBeInTheDocument();
  });
});
