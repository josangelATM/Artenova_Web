import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      drivesVisualGroup: false,
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

function expectGalleryCounterToEndWith(total: number) {
  expect(
    screen.getByText((_, element) => (
      element?.tagName.toLowerCase() === "span"
      && (element.textContent?.endsWith(` / ${total}`) ?? false)
    ))
  ).toBeInTheDocument();
}

describe("ProductPage", () => {
  beforeEach(() => {
    productMock.mockReset();
    settingsMock.mockReset();
    applySeoMock.mockReset();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("min-width: 900px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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
    expectGalleryCounterToEndWith(5);
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

    expect(screen.getByLabelText("Imagen anterior")).toBeInTheDocument();
    expect(screen.getByText("$22.00")).toBeInTheDocument();
    expectGalleryCounterToEndWith(5);
  });

  it("renders a simple product from canonical variant media when the base gallery is empty", async () => {
    productMock.mockResolvedValue({
      ...product,
      productOptions: [],
      media: [],
      variants: [
        {
          ...defaultVariant,
          selectionKey: null,
          visualGroupKey: "default",
          selections: [],
          media: [imageMedia("img-simple", "/seed/simple.jpg", "Foto simple", 0)],
        },
      ],
      defaultVariant: {
        ...defaultVariant,
        selectionKey: null,
        visualGroupKey: "default",
        selections: [],
        media: [imageMedia("img-simple", "/seed/simple.jpg", "Foto simple", 0)],
      },
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("img", { name: /foto simple/i }).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Imagen siguiente")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Imagen anterior")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pequeno" })).not.toBeInTheDocument();
  });

  it("keeps the global total visible when the user changes to another visual group", async () => {
    productMock.mockResolvedValue({
      ...product,
      productOptions: [
        {
          id: "color",
          productId: "p1",
          name: "Color",
          drivesVisualGroup: true,
          position: 0,
          values: [
            { id: "small", optionId: "color", value: "Pequeno", position: 0, swatch: null },
            { id: "large", optionId: "color", value: "Grande", position: 1, swatch: null },
          ],
        },
      ],
      variants: [
        {
          ...defaultVariant,
          id: "v1",
          name: "Pequeno",
          selectionKey: "small",
          visualGroupKey: "small-shape",
          media: [imageMedia("img-small", "/seed/small.jpg", "Foto pequeno", 0)],
          selections: [{ optionId: "color", optionName: "Color", optionValueId: "small", value: "Pequeno", position: 0 }],
        },
        {
          ...product.variants[1]!,
          id: "v2",
          name: "Grande",
          selectionKey: "large",
          visualGroupKey: "large-shape",
          media: [imageMedia("img-large", "/seed/large.jpg", "Foto grande", 0)],
          selections: [{ optionId: "color", optionName: "Color", optionValueId: "large", value: "Grande", position: 0 }],
        },
      ],
      defaultVariant: {
        ...defaultVariant,
        id: "v1",
        name: "Pequeno",
        selectionKey: "small",
        visualGroupKey: "small-shape",
        media: [imageMedia("img-small", "/seed/small.jpg", "Foto pequeno", 0)],
        selections: [{ optionId: "color", optionName: "Color", optionValueId: "small", value: "Pequeno", position: 0 }],
      },
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expectGalleryCounterToEndWith(4);
    });

    fireEvent.click(screen.getByRole("button", { name: "Grande" }));

    await waitFor(() => {
      expect(screen.getByText("$22.00")).toBeInTheDocument();
    });
    expectGalleryCounterToEndWith(4);
  });

  it("renders markdown links in the product description", async () => {
    productMock.mockResolvedValue({
      ...product,
      description: "Catalogo:\n[Aqui](https://artenovapty.com/catalogo.pdf)",
    });
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: "Aqui" });
    expect(link).toHaveAttribute("href", "https://artenovapty.com/catalogo.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("includes the product link in the WhatsApp message", async () => {
    productMock.mockResolvedValue(product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    const consultLink = await screen.findByRole("link", { name: /consultar por whatsapp/i });
    const href = consultLink.getAttribute("href");

    expect(href).toBeTruthy();
    const url = new URL(href!);
    const text = url.searchParams.get("text");
    expect(text).toContain(`Link del producto: ${window.location.origin}/producto/letrero-acrilico`);
  });

  it("does not repeat the product name when the selected variant has the same name and no sku", async () => {
    productMock.mockResolvedValue({
      ...product,
      sku: "",
      variants: [
        {
          ...defaultVariant,
          name: "Letrero acrilico",
          sku: "",
          selections: [],
        },
      ],
      defaultVariant: {
        ...defaultVariant,
        name: "Letrero acrilico",
        sku: "",
        selections: [],
      },
      defaultVariantId: "v1",
      productOptions: [],
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    const consultLink = await screen.findByRole("link", { name: /consultar por whatsapp/i });
    const href = consultLink.getAttribute("href");

    expect(href).toBeTruthy();
    const text = new URL(href!).searchParams.get("text");
    expect(text).toContain("Hola, estoy interesado en Letrero acrilico.");
    expect(text).not.toContain("Letrero acrilico - Letrero acrilico");
    expect(text).not.toContain("REF");
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

  it("opens the fullscreen viewer with a centered large image layout", async () => {
    productMock.mockResolvedValue(product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByLabelText("Ampliar imagen")[0]!);

    const dialog = await screen.findByRole("dialog");
    const viewerImage = within(dialog).getByRole("img", { name: /foto pequeno/i });

    expect(viewerImage).toHaveStyle({ objectFit: "contain" });
    expect(viewerImage).toHaveStyle({ maxWidth: "100%" });
    expect(viewerImage).toHaveStyle({ maxHeight: "100%" });
    expect(viewerImage).not.toHaveStyle({ aspectRatio: "4 / 5" });
  });

  it("shows visible navigation controls in normal mode and moves with desktop keyboard arrows", async () => {
    productMock.mockResolvedValue(product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    const gallery = screen.getByLabelText(/galería del producto letrero acrilico/i);
    expect(screen.getByLabelText("Imagen anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Imagen siguiente")).toBeInTheDocument();

    fireEvent.focus(gallery);
    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getAllByRole("img", { name: /foto pequeno dos/i }).length).toBeGreaterThan(0);
    });

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getAllByRole("img", { name: /foto pequeno/i }).length).toBeGreaterThan(0);
    });
  });

  it("moves between images with desktop keyboard arrows while the zoom viewer is open", async () => {
    productMock.mockResolvedValue(product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByLabelText("Ampliar imagen")[0]!);
    await screen.findByRole("dialog");

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getAllByRole("img", { name: /foto pequeno dos/i }).length).toBeGreaterThan(0);
    });
  });

  it("does not render arrows when the product only has one image", async () => {
    productMock.mockResolvedValue({
      ...product,
      media: [],
      defaultVariant: {
        ...defaultVariant,
        media: [imageMedia("img-only", "/seed/only.jpg", "Foto unica", 0)],
      },
      variants: [
        {
          ...defaultVariant,
          media: [imageMedia("img-only", "/seed/only.jpg", "Foto unica", 0)],
        },
      ],
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getByText("Letrero acrilico")).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Imagen anterior")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Imagen siguiente")).not.toBeInTheDocument();
  });

  it("shows arrows and navigates across preview groups when the active gallery has one item", async () => {
    productMock.mockResolvedValue({
      ...product,
      defaultVariant: {
        ...defaultVariant,
        id: "gold-small",
        name: "Dorado pequeno",
        selectionKey: "color-gold|small",
        visualGroupKey: "dorado",
        media: [imageMedia("gold-small", "/seed/gold.jpg", "Escudo dorado", 0)],
        selections: [
          { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
          { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
        ],
      },
      defaultVariantId: "gold-small",
      productOptions: [
        {
          id: "color",
          productId: "p1",
          name: "Color",
          drivesVisualGroup: true,
          position: 0,
          values: [
            { id: "gold", optionId: "color", value: "Dorado", position: 0, swatch: null },
            { id: "silver", optionId: "color", value: "Plateado", position: 1, swatch: null },
          ],
        },
        {
          id: "size",
          productId: "p1",
          name: "Tamano",
          drivesVisualGroup: false,
          position: 1,
          values: [
            { id: "small", optionId: "size", value: "Pequeno", position: 0, swatch: null },
            { id: "large", optionId: "size", value: "Grande", position: 1, swatch: null },
          ],
        },
      ],
      variants: [
        {
          ...defaultVariant,
          id: "gold-small",
          name: "Dorado pequeno",
          selectionKey: "color-gold|small",
          visualGroupKey: "dorado",
          media: [imageMedia("gold-small", "/seed/gold.jpg", "Escudo dorado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
          ],
        },
        {
          ...defaultVariant,
          id: "gold-large",
          name: "Dorado grande",
          selectionKey: "color-gold|large",
          visualGroupKey: "dorado",
          media: [imageMedia("gold-large", "/seed/gold.jpg", "Escudo dorado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "large", value: "Grande", position: 1 },
          ],
          basePrice: 24,
          pricingSummary: { originalPrice: 24, finalPrice: 24, hasDiscount: false, discountType: null, discountValue: null },
        },
        {
          ...defaultVariant,
          id: "silver-small",
          name: "Plateado pequeno",
          selectionKey: "color-silver|small",
          visualGroupKey: "plateado",
          media: [imageMedia("silver-small", "/seed/silver.jpg", "Escudo plateado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "silver", value: "Plateado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
          ],
          basePrice: 23,
          pricingSummary: { originalPrice: 23, finalPrice: 23, hasDiscount: false, discountType: null, discountValue: null },
        },
        {
          ...defaultVariant,
          id: "silver-large",
          name: "Plateado grande",
          selectionKey: "color-silver|large",
          visualGroupKey: "plateado",
          media: [imageMedia("silver-large", "/seed/silver.jpg", "Escudo plateado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "silver", value: "Plateado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "large", value: "Grande", position: 1 },
          ],
          basePrice: 25,
          pricingSummary: { originalPrice: 25, finalPrice: 25, hasDiscount: false, discountType: null, discountValue: null },
        },
      ],
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getAllByText("Letrero acrilico").length).toBeGreaterThan(0);
    });

    expect(screen.getByLabelText("Imagen anterior")).toBeInTheDocument();
    expect(screen.getByLabelText("Imagen siguiente")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Imagen siguiente"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Plateado" })).toHaveClass("MuiChip-filled");
    });
    expect(screen.getAllByRole("img", { name: /escudo plateado/i }).length).toBeGreaterThan(0);
  });

  it("updates the selected visual option when the user chooses a thumbnail from another visual group", async () => {
    productMock.mockResolvedValue({
      ...product,
      defaultVariant: {
        ...defaultVariant,
        id: "gold-small",
        name: "Dorado pequeno",
        selectionKey: "color-gold|small",
        visualGroupKey: "dorado",
        selections: [
          { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
          { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
        ],
      },
      defaultVariantId: "gold-small",
      productOptions: [
        {
          id: "color",
          productId: "p1",
          name: "Color",
          drivesVisualGroup: true,
          position: 0,
          values: [
            { id: "gold", optionId: "color", value: "Dorado", position: 0, swatch: null },
            { id: "silver", optionId: "color", value: "Plateado", position: 1, swatch: null },
          ],
        },
        {
          id: "size",
          productId: "p1",
          name: "Tamano",
          drivesVisualGroup: false,
          position: 1,
          values: [
            { id: "small", optionId: "size", value: "Pequeno", position: 0, swatch: null },
            { id: "large", optionId: "size", value: "Grande", position: 1, swatch: null },
          ],
        },
      ],
      variants: [
        {
          ...defaultVariant,
          id: "gold-small",
          name: "Dorado pequeno",
          selectionKey: "color-gold|small",
          visualGroupKey: "dorado",
          media: [imageMedia("gold-small", "/seed/gold.jpg", "Escudo dorado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
          ],
        },
        {
          ...defaultVariant,
          id: "gold-large",
          name: "Dorado grande",
          selectionKey: "color-gold|large",
          visualGroupKey: "dorado",
          media: [imageMedia("gold-large", "/seed/gold.jpg", "Escudo dorado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "large", value: "Grande", position: 1 },
          ],
          basePrice: 24,
          pricingSummary: { originalPrice: 24, finalPrice: 24, hasDiscount: false, discountType: null, discountValue: null },
        },
        {
          ...defaultVariant,
          id: "silver-small",
          name: "Plateado pequeno",
          selectionKey: "color-silver|small",
          visualGroupKey: "plateado",
          media: [imageMedia("silver-small", "/seed/silver.jpg", "Escudo plateado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "silver", value: "Plateado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
          ],
          basePrice: 23,
          pricingSummary: { originalPrice: 23, finalPrice: 23, hasDiscount: false, discountType: null, discountValue: null },
        },
        {
          ...defaultVariant,
          id: "silver-large",
          name: "Plateado grande",
          selectionKey: "color-silver|large",
          visualGroupKey: "plateado",
          media: [imageMedia("silver-large", "/seed/silver.jpg", "Escudo plateado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "silver", value: "Plateado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "large", value: "Grande", position: 1 },
          ],
          basePrice: 25,
          pricingSummary: { originalPrice: 25, finalPrice: 25, hasDiscount: false, discountType: null, discountValue: null },
        },
      ],
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getAllByText("Letrero acrilico").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Grande" })[0]!);

    await waitFor(() => {
      expect(screen.getByText("$24.00")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /ver elemento 3/i }));

    await waitFor(() => {
      expect(screen.getByText("$25.00")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Plateado" })).toHaveClass("MuiChip-filled");
    expect(screen.getByRole("button", { name: "Grande" })).toHaveClass("MuiChip-filled");
    expect(screen.getAllByRole("img", { name: /escudo plateado/i }).length).toBeGreaterThan(0);
  });

  it("falls back to the first active variant in the chosen visual group when the current non-visual selection is unavailable", async () => {
    productMock.mockResolvedValue({
      ...product,
      defaultVariant: {
        ...defaultVariant,
        id: "gold-small",
        name: "Dorado pequeno",
        selectionKey: "color-gold|small",
        visualGroupKey: "dorado",
        selections: [
          { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
          { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
        ],
      },
      defaultVariantId: "gold-small",
      productOptions: [
        {
          id: "color",
          productId: "p1",
          name: "Color",
          drivesVisualGroup: true,
          position: 0,
          values: [
            { id: "gold", optionId: "color", value: "Dorado", position: 0, swatch: null },
            { id: "silver", optionId: "color", value: "Plateado", position: 1, swatch: null },
          ],
        },
        {
          id: "size",
          productId: "p1",
          name: "Tamano",
          drivesVisualGroup: false,
          position: 1,
          values: [
            { id: "small", optionId: "size", value: "Pequeno", position: 0, swatch: null },
            { id: "large", optionId: "size", value: "Grande", position: 1, swatch: null },
          ],
        },
      ],
      variants: [
        {
          ...defaultVariant,
          id: "gold-small",
          name: "Dorado pequeno",
          selectionKey: "color-gold|small",
          visualGroupKey: "dorado",
          media: [imageMedia("gold-small", "/seed/gold.jpg", "Escudo dorado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
          ],
        },
        {
          ...defaultVariant,
          id: "gold-large",
          name: "Dorado grande",
          selectionKey: "color-gold|large",
          visualGroupKey: "dorado",
          media: [imageMedia("gold-large", "/seed/gold.jpg", "Escudo dorado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "gold", value: "Dorado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "large", value: "Grande", position: 1 },
          ],
          basePrice: 24,
          pricingSummary: { originalPrice: 24, finalPrice: 24, hasDiscount: false, discountType: null, discountValue: null },
        },
        {
          ...defaultVariant,
          id: "silver-small",
          name: "Plateado pequeno",
          selectionKey: "color-silver|small",
          visualGroupKey: "plateado",
          media: [imageMedia("silver-small", "/seed/silver.jpg", "Escudo plateado", 0)],
          selections: [
            { optionId: "color", optionName: "Color", optionValueId: "silver", value: "Plateado", position: 0 },
            { optionId: "size", optionName: "Tamano", optionValueId: "small", value: "Pequeno", position: 1 },
          ],
          basePrice: 23,
          pricingSummary: { originalPrice: 23, finalPrice: 23, hasDiscount: false, discountType: null, discountValue: null },
        },
      ],
    } satisfies Product);
    settingsMock.mockResolvedValue(settings);

    renderProductPage();

    await waitFor(() => {
      expect(screen.getAllByText("Letrero acrilico").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Grande" })[0]!);

    await waitFor(() => {
      expect(screen.getByText("$24.00")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /ver elemento 3/i }));

    await waitFor(() => {
      expect(screen.getByText("$23.00")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Plateado" })).toHaveClass("MuiChip-filled");
    expect(screen.getByRole("button", { name: "Pequeno" })).toHaveClass("MuiChip-filled");
  });
});
