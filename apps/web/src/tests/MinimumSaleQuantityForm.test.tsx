import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminProductFormPage } from "../pages/admin/AdminProductFormPage";

vi.mock("@mui/x-data-grid", () => ({ DataGrid: () => null }));

const mocks = vi.hoisted(() => ({ save: vi.fn(), load: vi.fn(), toast: vi.fn() }));
vi.mock("../lib/api", () => ({
  api: {
    adminCategories: async () => [{ id: "c1", name: "Regalos", currencySymbol: "B/." }],
    adminProduct: (...args: unknown[]) => mocks.load(...args),
    saveAdminProduct: (...args: unknown[]) => mocks.save(...args),
  },
}));
vi.mock("../components/ToastProvider", () => ({
  useToast: () => ({ showToast: mocks.toast }),
  toastNavigationState: () => ({}),
}));

const product = {
  id: "p1", name: "Regalo", slug: "regalo", description: "Personalizado", categoryId: "c1",
  basePrice: 10, minimumSaleQuantity: 12, variants: [], productOptions: [], priceTiers: [],
  media: [], customFields: [], isPublished: true, isFeatured: false,
};

function renderForm(edit = true) {
  render(<MemoryRouter initialEntries={[edit ? "/products/p1" : "/products/new"]}>
    <Routes>
      <Route path="/products/new" element={<AdminProductFormPage />} />
      <Route path="/products/:id" element={<AdminProductFormPage />} />
    </Routes>
  </MemoryRouter>);
}

async function minimumInput() {
  const input = await screen.findByLabelText("Cantidad mínima de venta");
  await waitFor(() => expect(input).not.toBeDisabled());
  return input;
}

describe("minimum sale quantity form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.load.mockResolvedValue(product);
    mocks.save.mockImplementation(async (payload) => ({ ...product, ...payload }));
    vi.stubGlobal("scrollTo", vi.fn());
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("starts empty for a new product", async () => {
    renderForm(false);
    expect(await minimumInput()).toHaveValue("");
  });

  it.each(["6", ""])("loads and saves an edited minimum '%s'", async (value) => {
    renderForm();
    const input = await minimumInput();
    expect(input).toHaveValue("12");
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getAllByRole("button", { name: "Guardar producto" })[0]!);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ minimumSaleQuantity: value === "" ? null : 6 })));
  });

  it.each(["0", "-1", "1.5", "abc", "2147483648"])("rejects invalid minimum '%s' before saving", async (value) => {
    renderForm();
    fireEvent.change(await minimumInput(), { target: { value } });
    fireEvent.click(screen.getAllByRole("button", { name: "Guardar producto" })[0]!);
    expect(await screen.findByText(/Ingresa un número entero positivo/)).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
