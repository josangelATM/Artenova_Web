import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Product } from "@artenova/shared";
import { OrderItemsEditor, buildDraftItemsPayload, defaultItem, type DraftItem } from "../pages/admin/adminOrderUi";

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

function renderEditorWithDelayedState(products: Product[], initialItems: DraftItem[]) {
  let latestItems = initialItems;
  function Harness() {
    const [items, setItems] = useState(initialItems);
    latestItems = items;
    return (
      <OrderItemsEditor
        items={items}
        products={products}
        onChange={(nextItems) => {
          setTimeout(() => {
            latestItems = nextItems;
            setItems(nextItems);
          }, 0);
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
    expect(variantSelect.textContent).toContain("Rojo");
    expect((screen.getByLabelText("Costo individual") as HTMLInputElement).value).toBe("12");

    fireEvent.mouseDown(variantSelect);
    fireEvent.click(screen.getByRole("option", { name: "Azul" }));

    expect((screen.getByLabelText("Costo individual") as HTMLInputElement).value).toBe("15");
    expect(getItems()[0]).toMatchObject({
      variantNameSnapshot: "Azul",
      skuSnapshot: "AZU-02",
      unitPrice: "15",
    });
  });

  it("duplicates decimal money fields without truncating them", () => {
    const { getItems } = renderEditor([], [{
      ...defaultItem(undefined, "Item libre"),
      quantity: "2",
      unitPrice: "12.75",
      appliedAdjustments: [{
        label: "Grabado",
        unitAmount: "1.25",
        quantity: 2,
        totalAmount: 2.5,
      }],
    }]);

    fireEvent.click(screen.getByRole("button", { name: "Copiar línea" }));

    const unitPrices = screen.getAllByLabelText("Costo individual");
    expect(unitPrices).toHaveLength(2);
    expect((unitPrices[0] as HTMLInputElement).value).toBe("12.75");
    expect((unitPrices[1] as HTMLInputElement).value).toBe("12.75");

    const adjustmentAmounts = screen.getAllByLabelText("Monto por unidad");
    expect(adjustmentAmounts).toHaveLength(2);
    expect((adjustmentAmounts[0] as HTMLInputElement).value).toBe("1.25");
    expect((adjustmentAmounts[1] as HTMLInputElement).value).toBe("1.25");

    expect(getItems()[1]).toMatchObject({
      unitPrice: "12.75",
      appliedAdjustments: [{ unitAmount: "1.25", totalAmount: 2.5 }],
    });
  });

  it("duplicates the manually edited unit price instead of resetting to the product original price", () => {
    const product = buildProduct();
    const { getItems } = renderEditor([product], [defaultItem(product)]);

    fireEvent.change(screen.getByLabelText("Costo individual"), { target: { value: "18.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Copiar línea" }));

    const unitPrices = screen.getAllByLabelText("Costo individual");
    expect(unitPrices).toHaveLength(2);
    expect(unitPrices[0]).toHaveValue("18.5");
    expect(unitPrices[1]).toHaveValue("18.5");

    expect(getItems()[1]).toMatchObject({
      productId: "prod-1",
      variantNameSnapshot: "Rojo",
      skuSnapshot: "ROJ-01",
      unitPrice: "18.5",
    });
  });

  it("duplicates the latest edited variant and price even when parent state sync is delayed", async () => {
    vi.useFakeTimers();
    try {
      const product = buildProduct({
        variants: [
          {
            id: "var-default",
            productId: "prod-1",
            name: "Pequena / Rojo",
            sku: "PEQ-ROJ",
            selectionKey: null,
            visualGroupKey: null,
            basePrice: 10,
            discountType: null,
            discountValue: null,
            isActive: true,
            position: 0,
            media: [],
            attributes: [],
            selections: [],
            priceTiers: [],
            pricingSummary: {
              originalPrice: 10,
              finalPrice: 10,
              hasDiscount: false,
              discountType: null,
              discountValue: null,
            },
          },
          {
            id: "var-2",
            productId: "prod-1",
            name: "Grande / Rojo",
            sku: "GRA-ROJ",
            selectionKey: null,
            visualGroupKey: null,
            basePrice: 6.8,
            discountType: null,
            discountValue: null,
            isActive: true,
            position: 1,
            media: [],
            attributes: [],
            selections: [],
            priceTiers: [],
            pricingSummary: {
              originalPrice: 6.8,
              finalPrice: 6.8,
              hasDiscount: false,
              discountType: null,
              discountValue: null,
            },
          },
        ],
        defaultVariant: {
          id: "var-default",
          productId: "prod-1",
          name: "Pequena / Rojo",
          sku: "PEQ-ROJ",
          selectionKey: null,
          visualGroupKey: null,
          basePrice: 10,
          discountType: null,
          discountValue: null,
          isActive: true,
          position: 0,
          media: [],
          attributes: [],
          selections: [],
          priceTiers: [],
          pricingSummary: {
            originalPrice: 10,
            finalPrice: 10,
            hasDiscount: false,
            discountType: null,
            discountValue: null,
          },
        },
      });

      renderEditorWithDelayedState([product], [defaultItem(product)]);

      const variantSelect = screen.getByRole("combobox", { name: "Variante" });
      fireEvent.mouseDown(variantSelect);
      fireEvent.click(screen.getByRole("option", { name: "Grande / Rojo" }));
      fireEvent.change(screen.getByLabelText("Costo individual"), { target: { value: "6.80" } });
      fireEvent.click(screen.getByRole("button", { name: "Copiar línea" }));

      await act(async () => {
        vi.runAllTimers();
      });

      const variantSelects = screen.getAllByRole("combobox", { name: "Variante" });
      expect(variantSelects).toHaveLength(2);
      expect(variantSelects[0]).toHaveTextContent("Grande / Rojo");
      expect(variantSelects[1]).toHaveTextContent("Grande / Rojo");

      const unitPrices = screen.getAllByLabelText("Costo individual");
      expect(unitPrices[0]).toHaveValue("6.80");
      expect(unitPrices[1]).toHaveValue("6.80");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not show the variant select for products without active variants", () => {
    const product = buildProduct({
      defaultVariantId: null,
      defaultVariant: null,
      variants: [],
    });

    renderEditor([product], [defaultItem(product)]);

    expect(screen.queryByRole("combobox", { name: "Variante" })).toBeNull();
  });

  it("does not show the variant select for free manual items", () => {
    renderEditor([], [defaultItem(undefined, "Item libre")]);

    expect(screen.queryByRole("combobox", { name: "Variante" })).toBeNull();
    expect(screen.getByDisplayValue("Item libre")).toBeTruthy();
  });

  it("renders boolean custom fields as checkboxes and preserves boolean payloads", () => {
    const product = buildProduct({
      customFields: [
        { id: "qr", label: "QR", type: "boolean", position: 0 },
        { id: "owner", label: "Nombre", type: "text", position: 1 },
      ],
    });
    const initialItem: DraftItem = {
      ...defaultItem(product),
      personalization: { qr: "true", owner: "Gabriel" },
    };

    const { getItems } = renderEditor([product], [initialItem]);

    const checkbox = screen.getByRole("checkbox", { name: "QR" });
    expect((checkbox as HTMLInputElement).checked).toBe(true);

    fireEvent.click(checkbox);

    expect(getItems()[0]?.personalization.qr).toBe(false);

    const payload = buildDraftItemsPayload(getItems());
    expect(payload[0]?.personalization).toEqual({ qr: false, owner: "Gabriel" });
  });
});
