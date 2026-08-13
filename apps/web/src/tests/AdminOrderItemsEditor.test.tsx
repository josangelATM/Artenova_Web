import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Product } from "@artenova/shared";
import { OrderItemsEditor, defaultItem, type DraftItem } from "../pages/admin/adminOrderUi";

afterEach(() => {
  cleanup();
});

function buildProduct(overrides?: Partial<Product>): Product {
  return {
    id: "prod-1",
    name: "Placa mascota",
    slug: "placa-mascota",
    sku: null,
    defaultVariantId: "var-default",
    currencySymbol: "B/.",
    description: "desc",
    categoryId: "cat-1",
    basePrice: 10,
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
    variants: [
      {
        id: "var-default",
        productId: "prod-1",
        name: "Rojo",
        sku: "ROJ-01",
        selectionKey: null,
        visualGroupKey: null,
        basePrice: 12,
        discountType: null,
        discountValue: null,
        isActive: true,
        position: 0,
        media: [],
        attributes: [],
        selections: [],
        priceTiers: [],
        pricingSummary: {
          originalPrice: 12,
          finalPrice: 12,
          hasDiscount: false,
          discountType: null,
          discountValue: null,
        },
      },
      {
        id: "var-2",
        productId: "prod-1",
        name: "Azul",
        sku: "AZU-02",
        selectionKey: null,
        visualGroupKey: null,
        basePrice: 15,
        discountType: null,
        discountValue: null,
        isActive: true,
        position: 1,
        media: [],
        attributes: [],
        selections: [],
        priceTiers: [],
        pricingSummary: {
          originalPrice: 15,
          finalPrice: 15,
          hasDiscount: false,
          discountType: null,
          discountValue: null,
        },
      },
    ],
    defaultVariant: {
      id: "var-default",
      productId: "prod-1",
      name: "Rojo",
      sku: "ROJ-01",
      selectionKey: null,
      visualGroupKey: null,
      basePrice: 12,
      discountType: null,
      discountValue: null,
      isActive: true,
      position: 0,
      media: [],
      attributes: [],
      selections: [],
      priceTiers: [],
      pricingSummary: {
        originalPrice: 12,
        finalPrice: 12,
        hasDiscount: false,
        discountType: null,
        discountValue: null,
      },
    },
    pricingSummary: {
      originalPrice: 10,
      finalPrice: 10,
      hasDiscount: false,
      discountType: null,
      discountValue: null,
    },
    reviews: [],
    reviewSummary: { averageRating: 0, reviewCount: 0 },
    ...overrides,
  };
}

function renderEditor(products: Product[], initialItems: DraftItem[]) {
  let latestItems = initialItems;
  function Harness() {
    const [items, setItems] = useState(initialItems);
    latestItems = items;
    return (
      <OrderItemsEditor
        items={items}
        products={products}
        onChange={(nextItems) => {
          latestItems = nextItems;
          setItems(nextItems);
        }}
      />
    );
  }

  const view = render(<Harness />);

  return {
    ...view,
    getItems: () => latestItems,
  };
}

describe("OrderItemsEditor", () => {
  it("shows active variants and updates snapshots and price when variant changes", () => {
    const product = buildProduct();
    const { getItems } = renderEditor([product], [defaultItem(product)]);

    const variantSelect = screen.getByRole("combobox", { name: "Variante" });
    expect(variantSelect).toHaveTextContent("Rojo");
    expect(screen.getByLabelText("Costo individual")).toHaveValue("12");

    fireEvent.mouseDown(variantSelect);
    fireEvent.click(screen.getByRole("option", { name: "Azul" }));

    expect(screen.getByLabelText("Costo individual")).toHaveValue("15");
    expect(getItems()[0]).toMatchObject({
      variantNameSnapshot: "Azul",
      skuSnapshot: "AZU-02",
      unitPrice: "15",
    });
  });

  it("does not show the variant select for products without active variants", () => {
    const product = buildProduct({
      defaultVariantId: null,
      defaultVariant: null,
      variants: [],
    });

    renderEditor([product], [defaultItem(product)]);

    expect(screen.queryByRole("combobox", { name: "Variante" })).not.toBeInTheDocument();
  });

  it("does not show the variant select for free manual items", () => {
    renderEditor([], [defaultItem(undefined, "Item libre")]);

    expect(screen.queryByRole("combobox", { name: "Variante" })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Item libre")).toBeInTheDocument();
  });
});
