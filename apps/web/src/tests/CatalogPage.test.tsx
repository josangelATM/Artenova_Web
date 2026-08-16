import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProductCard, CatalogProductListResponse, Category, SiteSettings } from "@artenova/shared";
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

function makeProduct(id: string, name: string): CatalogProductCard {
  return {
    id,
    name,
    slug: id,
    sku: null,
    currencySymbol: "$",
    description: `Descripcion de ${name}`,
    isFeatured: id === "p1",
    media: [{ id: `img-${id}`, type: "image", url: `/seed/${id}.jpg`, alt: name, position: 0, posterUrl: null }],
    defaultVariant: null,
    reviewSummary: { averageRating: 0, reviewCount: 0 },
    pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
    extraMediaCount: 0,
  };
}

function makeResponse(items: CatalogProductCard[], nextCursor: string | null = null, hasMore = false): CatalogProductListResponse {
  return { items, nextCursor, hasMore };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
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
  let observerCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;

  beforeEach(() => {
    productsMock.mockReset();
    settingsMock.mockReset();
    categoriesMock.mockReset();
    applySeoMock.mockReset();
    observerCallback = null;

    class IntersectionObserverMock {
      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        observerCallback = callback;
      }

      observe() {}

      disconnect() {}
    }

    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock as unknown as typeof IntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("goes directly to category controls without the collections section", async () => {
    const list = [makeProduct("p1", "Producto 1"), makeProduct("p2", "Producto 2")];
    settingsMock.mockResolvedValue(settings);
    categoriesMock.mockResolvedValue(categories);
    productsMock.mockResolvedValue(makeResponse(list));

    renderCatalog("/catalogo");

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/busca por nombre, referencia o idea/i)).toBeTruthy();
    });

    expect(screen.queryByText(/explora por ocasión/i)).toBeNull();
    expect(screen.queryByText(/destacado/i)).toBeNull();
    expect(screen.queryByText(/piezas para empezar/i)).toBeNull();
    expect(screen.getByText("Categorías")).toBeTruthy();
  });

  it("uses clean category routes as the product filter", async () => {
    const list = [makeProduct("p1", "Producto 1")];
    settingsMock.mockResolvedValue(settings);
    categoriesMock.mockResolvedValue(categories);
    productsMock.mockResolvedValue(makeResponse(list));

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
    productsMock.mockResolvedValue(makeResponse(list));

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

  it("appends the next page once when the load sentinel intersects", async () => {
    const firstPage = [makeProduct("p1", "Producto 1"), makeProduct("p2", "Producto 2")];
    const secondPage = [makeProduct("p3", "Producto 3"), makeProduct("p4", "Producto 4")];
    const deferred = createDeferred<CatalogProductListResponse>();

    settingsMock.mockResolvedValue(settings);
    categoriesMock.mockResolvedValue(categories);
    productsMock
      .mockResolvedValueOnce(makeResponse(firstPage, "cursor-1", true))
      .mockImplementationOnce(() => deferred.promise);

    renderCatalog("/catalogo");

    await screen.findByText("Producto 1");
    await screen.findByTestId("catalog-load-more-sentinel");

    observerCallback?.([{ isIntersecting: true }]);
    observerCallback?.([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(productsMock).toHaveBeenCalledTimes(2);
    });

    deferred.resolve(makeResponse(secondPage, null, false));

    await screen.findByText("Producto 4");

    expect(screen.getByText("Producto 1")).toBeTruthy();
    expect(screen.getByText("Producto 4")).toBeTruthy();
    expect((productsMock.mock.calls[1]?.[0] as URLSearchParams).get("cursor")).toBe("cursor-1");
  });
});
