import { useCallback, useMemo, useState, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { describe, expect, it, vi } from "vitest";
import {
  MemoVariantCard,
  type VariantInput,
  VariantsSection,
} from "../pages/admin/AdminProductFormPage";
import { theme } from "../theme/theme";

vi.mock("../pages/admin/adminUi", () => ({
  AdminEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  ),
  AdminPageHeader: ({
    title,
    subtitle,
    action,
  }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {action}
    </header>
  ),
  AdminSection: ({
    title,
    description,
    action,
    children,
  }: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
  }) => (
    <section aria-label={title}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
      {children}
    </section>
  ),
}));

vi.mock("../pages/admin/adminCrudUi", () => ({
  AdminBackButton: ({ to, label = "Volver" }: { to: string; label?: string }) => (
    <a href={to}>{label}</a>
  ),
  AdminBreadcrumbs: ({ items }: { items: Array<{ label: string }> }) => (
    <nav>{items.map((item) => item.label).join(" / ")}</nav>
  ),
}));

vi.mock("../pages/admin/adminFormErrors", () => ({
  AdminFormErrorAlert: () => null,
}));

const baseVariants: VariantInput[] = [
  {
    id: "v-1",
    name: "Rojo / Pequeno",
    sku: "SKU-1",
    visualGroupKey: "rojo",
    basePrice: "10",
    discountType: "",
    discountValue: "",
    isActive: true,
    position: 0,
    optionValueIds: ["color-red", "size-s"],
    images: [],
    priceTiers: [],
  },
  {
    id: "v-2",
    name: "Azul / Mediano",
    sku: "SKU-2",
    visualGroupKey: "azul",
    basePrice: "12",
    discountType: "",
    discountValue: "",
    isActive: true,
    position: 1,
    optionValueIds: ["color-blue", "size-m"],
    images: [],
    priceTiers: [],
  },
];

function createOptionValueLookup() {
  return new Map<
    string,
    { optionId: string; optionName: string; value: string; position: number }
  >([
    [
      "color-red",
      { optionId: "color", optionName: "Color", value: "Rojo", position: 0 },
    ],
    [
      "size-s",
      { optionId: "size", optionName: "Talla", value: "Pequeno", position: 1 },
    ],
    [
      "color-blue",
      { optionId: "color", optionName: "Color", value: "Azul", position: 0 },
    ],
    [
      "size-m",
      { optionId: "size", optionName: "Talla", value: "Mediano", position: 1 },
    ],
  ]);
}

function renderWithTheme(node: ReactNode) {
  return render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
}

describe("AdminProductFormPage render isolation", () => {
  it("does not rerender the variants section when unrelated state changes", () => {
    const renderCounts = { variantsSection: 0 };

    function Harness() {
      const [counter, setCounter] = useState(0);
      const [variants, setVariants] = useState(baseVariants);
      const [defaultVariantId, setDefaultVariantId] = useState("v-1");
      const optionValueById = useMemo(() => createOptionValueLookup(), []);
      const visualOptionIds = useMemo(() => new Set(["color"]), []);
      const duplicateSelectionKeys = useMemo(() => new Set<string>(), []);
      const uploadVariantImages = useCallback(async () => undefined, []);
      const getSuggestedBasePrice = useCallback(() => "10", []);
      const onGenerateVariants = useCallback(() => undefined, []);
      const onSectionRender = useCallback(() => {
        renderCounts.variantsSection += 1;
      }, []);

      return (
        <>
          <button type="button" onClick={() => setCounter((value) => value + 1)}>
            bump {counter}
          </button>
          <VariantsSection
            variants={variants}
            defaultVariantId={defaultVariantId}
            setDefaultVariantId={setDefaultVariantId}
            setVariants={setVariants}
            uploadingKey=""
            uploadVariantImages={uploadVariantImages}
            optionValueById={optionValueById}
            visualOptionIds={visualOptionIds}
            duplicateSelectionKeys={duplicateSelectionKeys}
            getSuggestedBasePrice={getSuggestedBasePrice}
            onGenerateVariants={onGenerateVariants}
            onRender={onSectionRender}
          />
        </>
      );
    }

    renderWithTheme(<Harness />);
    const initialSectionRenders = renderCounts.variantsSection;

    fireEvent.click(screen.getByRole("button", { name: /bump/i }));

    expect(renderCounts.variantsSection).toBe(initialSectionRenders);
  });

  it("does not rerender sibling variant rows when editing one row", () => {
    const renderCounts = { first: 0, second: 0 };

    function Harness() {
      const [variants, setVariants] = useState(baseVariants);
      const [defaultVariantId, setDefaultVariantId] = useState("v-1");
      const optionValueById = useMemo(() => createOptionValueLookup(), []);
      const visualOptionIds = useMemo(() => new Set(["color"]), []);
      const uploadVariantImages = useCallback(async () => undefined, []);
      const getSuggestedBasePrice = useCallback(() => "10", []);
      const onFirstRender = useCallback(() => {
        renderCounts.first += 1;
      }, []);
      const onSecondRender = useCallback(() => {
        renderCounts.second += 1;
      }, []);

      return (
        <>
          {variants.map((variant, index) => (
            <MemoVariantCard
              key={variant.id}
              variant={variant}
              defaultVariantId={defaultVariantId}
              setDefaultVariantId={setDefaultVariantId}
              setVariants={setVariants}
              uploading={false}
              uploadVariantImages={uploadVariantImages}
              optionValueById={optionValueById}
              visualOptionIds={visualOptionIds}
              isDuplicateSelection={false}
              getSuggestedBasePrice={getSuggestedBasePrice}
              onRender={index === 0 ? onFirstRender : onSecondRender}
            />
          ))}
        </>
      );
    }

    renderWithTheme(<Harness />);
    const initialFirstRenders = renderCounts.first;
    const initialSecondRenders = renderCounts.second;

    fireEvent.change(screen.getAllByLabelText("Nombre visible").at(0)!, {
      target: { value: "Rojo premium" },
    });

    expect(screen.getAllByLabelText("Nombre visible").at(0)).toHaveValue(
      "Rojo premium",
    );
    expect(renderCounts.first).toBeGreaterThanOrEqual(initialFirstRenders);
    expect(renderCounts.second).toBe(initialSecondRenders);
  });
});
