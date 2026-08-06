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

const imageMedia = (id: string, url: string, alt: string, position = 0) => ({
  id,
  type: "image" as const,
  url,
  alt,
  position,
  posterUrl: null,
});

const videoMedia = (id: string, url: string, alt: string, posterUrl: string | null = null, position = 0) => ({
  id,
  type: "video" as const,
  url,
  alt,
  position,
  posterUrl,
});

const settings: SiteSettings = {
  brandName: "Artenova",
  heroTitle: "Regalos personalizados que guardan historias",
  heroSubtitle: "Taller creativo de corte y grabado laser.",
  whatsapp: "50760000000",
  email: "hola@artenova.test",
  address: "Panama",
  businessHours: "Lunes a viernes",
  mapsUrl: "",
  bannerText: "",
  personalizationNotice: "",
};

const defaultVariant = {
  id: "v1",
  productId: "p1",
  name: "Pequeno",
  sku: "PEQ-01",
  selectionKey: "small",
  visualGroupKey: "same-shape",
  basePrice: 20,
  discountType: null,
  discountValue: null,
  isActive: true,
  position: 0,
  media: [
    imageMedia("img-small", "/seed/small.jpg", "Foto pequeno", 0),
    imageMedia("img-small-2", "/seed/small-2.jpg", "Foto pequeno dos", 1),
  ],
  attributes: [],
  selections: [{ optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 0 }],
  priceTiers: [],
  pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
};

const product: Product = {
  id: "p1",
  name: "Letrero acrilico",
  slug: "letrero-acrilico",
  defaultVariantId: "v1",
  currencySymbol: "$",
  description: "Ideal para recuerdos personalizados.",
  categoryId: "c1",
  basePrice: 20,
  discountType: null,
  discountValue: null,
  isPublished: true,
  isFeatured: false,
  isHero: false,
  heroSlot: null,
  media: [
    imageMedia("img-base", "/seed/base.jpg", "Foto base", 0),
    imageMedia("img-base-2", "/seed/base-2.jpg", "Foto base dos", 1),
  ],
  priceTiers: [],
  extras: [],
  customFields: [],
  productOptions: [
    {
      id: "size",
      productId: "p1",
      name: "Tamano",
      position: 0,
      values: [
        { id: "small", optionId: "size", value: "Pequeno", position: 0, swatch: null },
        { id: "large", optionId: "size", value: "Grande", position: 1, swatch: null },
      ],
    },
  ],
  variants: [
    defaultVariant,
    {
      id: "v2",
      productId: "p1",
      name: "Grande",
      sku: "GDE-01",
      selectionKey: "large",
      visualGroupKey: "large-shape",
      basePrice: 22,
      discountType: null,
      discountValue: null,
      isActive: true,
      position: 1,
      media: [imageMedia("img-large", "/seed/large.jpg", "Foto grande", 0)],
      attributes: [],
      selections: [{ optionId: "size", optionName: "Tamano", optionValueId: "large", value: "Grande", position: 0 }],
      priceTiers: [],
      pricingSummary: { originalPrice: 22, finalPrice: 22, hasDiscount: false, discountType: null, discountValue: null },
    },
  ],
  defaultVariant,
  pricingSummary: { originalPrice: 20, finalPrice: 20, hasDiscount: false, discountType: null, discountValue: null },
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
    </ThemeProvider>,
  );
}

describe("ProductPage", () => {
  beforeEach(() => {
    productMock.mockReset();
    settingsMock.mockReset();
    applySeoMock.mockReset();
  });

  it("starts from the default variant and only changes the variant when the user changes options", async () => {
    productMock.mockResolvedValue(product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /foto pequeno/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Pequeno" })).toHaveClass("MuiChip-filled");

    fireEvent.click(screen.getByLabelText("Imagen siguiente"));

    await waitFor(() => {
      expect(screen.getAllByRole("img", { name: /foto pequeno dos/i }).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pequeno" })).toHaveClass("MuiChip-filled");

    fireEvent.click(screen.getAllByRole("button", { name: "Grande" })[0]!);

    await waitFor(() => {
      expect(screen.getAllByRole("img", { name: /foto grande/i }).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("$22.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grande" })).toHaveClass("MuiChip-filled");

    expect(screen.queryByLabelText("Imagen anterior")).not.toBeInTheDocument();
    expect(screen.getByText("$22.00")).toBeInTheDocument();
  });

  it("keeps the active image when the selected variant changes inside the same visual group", async () => {
    productMock.mockResolvedValue({
      ...product,
      variants: [
        defaultVariant,
        {
          ...product.variants[1]!,
          id: "v2-same",
          name: "Grande mismo visual",
          sku: "GDE-02",
          selectionKey: "large",
          visualGroupKey: "same-shape",
          media: [imageMedia("img-small", "/seed/small.jpg", "Foto pequeno", 0)],
          pricingSummary: { originalPrice: 22, finalPrice: 22, hasDiscount: false, discountType: null, discountValue: null },
        },
      ],
      defaultVariant,
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Grande" })[0]!);

    await waitFor(() => {
      expect(screen.getByText("$22.00")).toBeInTheDocument();
    });
    expect(screen.getAllByRole("img", { name: /foto pequeno/i }).length).toBeGreaterThan(0);
  });

  it("renders the public gallery correctly when the product only has video media", async () => {
    productMock.mockResolvedValue({
      ...product,
      media: [videoMedia("video-base", "/seed/base-video.mp4", "Video base")],
      variants: [],
      defaultVariant: null,
      defaultVariantId: null,
      productOptions: [],
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getAllByLabelText(/video base/i).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByLabelText(/video base/i)[0]?.tagName.toLowerCase()).toBe("video");
  });
});
