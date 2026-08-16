import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { GridColDef } from "@mui/x-data-grid";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order, Product } from "@artenova/shared";
import { AdminOrderFormPage } from "../pages/admin/AdminOrderFormPage";
import { AdminOrderDetailPage } from "../pages/admin/AdminOrderDetailPage";
import { AdminOrdersPage } from "../pages/admin/AdminOrdersPage";
import { theme } from "../theme/theme";

const adminProductsMock = vi.fn();
const createAdminOrderMock = vi.fn();
const adminOrderMock = vi.fn();
const updateAdminOrderMock = vi.fn();
const adminOrdersMock = vi.fn();
const updateAdminOrderStatusMock = vi.fn();
const createOrderPaymentMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    adminProducts: (...args: unknown[]) => adminProductsMock(...args),
    createAdminOrder: (...args: unknown[]) => createAdminOrderMock(...args),
    adminOrder: (...args: unknown[]) => adminOrderMock(...args),
    updateAdminOrder: (...args: unknown[]) => updateAdminOrderMock(...args),
    adminOrders: (...args: unknown[]) => adminOrdersMock(...args),
    updateAdminOrderStatus: (...args: unknown[]) => updateAdminOrderStatusMock(...args),
    createOrderPayment: (...args: unknown[]) => createOrderPaymentMock(...args),
  },
}));

vi.mock("../pages/admin/adminUi", () => ({
  AdminPageHeader: ({ title, action }: { title: string; action?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {action}
    </div>
  ),
  AdminSection: ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
    <section aria-label={title}>
      <h2>{title}</h2>
      {action}
      {children}
    </section>
  ),
  StatusChip: ({ status }: { status: string }) => <span>{status}</span>,
  adminSurfaceSx: {},
}));

vi.mock("../pages/admin/adminFormErrors", () => ({
  AdminFormErrorAlert: () => null,
}));

vi.mock("../pages/admin/adminOrderUi", () => ({
  defaultItem: () => ({
    productId: "",
    productName: "",
    quantity: "1",
    unitPrice: "0",
    skuSnapshot: "",
    variantNameSnapshot: "",
    appliedAdjustments: [],
    personalization: {},
    isDone: false,
  }),
  buildDraftItemsPayload: () => [],
  buildDraftPaymentsPayload: () => [],
  emptyPaymentDraft: { amount: "", method: "yappy", reference: "", note: "" },
  getBalance: () => 0,
  getItemsTotal: () => 0,
  getPaidTotal: () => 0,
  moneyInputAdornment: null,
  OrderItemsEditor: () => <div>items-editor</div>,
  OrderSummaryStrip: () => <div>summary-strip</div>,
  orderToDraft: (order: Order) => ({
    customerName: order.customerName,
    customerWhatsapp: order.customerWhatsapp,
    contactMethod: order.contactMethod,
    note: order.customerNote ?? "",
    status: order.status,
    items: [],
  }),
  toNumberOrZero: (value: string) => Number(value) || 0,
}));

vi.mock("../pages/admin/adminCrudUi", () => ({
  AdminBackButton: ({ label = "Volver" }: { label?: string }) => <button type="button">{label}</button>,
  AdminBreadcrumbs: () => <div>breadcrumbs</div>,
  AdminListToolbar: ({ search, onSearchChange, searchLabel, secondaryAction }: { search: string; onSearchChange: (value: string) => void; searchLabel: string; secondaryAction?: ReactNode }) => (
    <div>
      <label>
        {searchLabel}
        <input aria-label={searchLabel} value={search} onChange={(event) => onSearchChange(event.target.value)} />
      </label>
      {secondaryAction}
    </div>
  ),
  AdminGridAction: ({ label, to, onClick, disabled }: { label: string; to?: string; onClick?: () => void; disabled?: boolean }) => (
    <button type="button" data-to={to} onClick={onClick} disabled={disabled}>{label}</button>
  ),
  adminGridActionIcons: {},
  AdminDataGrid: ({ rows, columns }: { rows: Order[]; columns: GridColDef<Order>[] }) => {
    const customerColumn = columns.find((column) => column.field === "customerName");
    return (
      <div>
        {rows.map((row) => (
          <div key={row.id}>
            {customerColumn?.renderCell ? customerColumn.renderCell({ row } as never) : row.customerName}
          </div>
        ))}
      </div>
    );
  },
}));

function buildOrder(overrides?: Partial<Order>): Order {
  return {
    id: "order-1",
    code: "A-001",
    source: "admin_manual",
    status: "nuevo",
    customerName: "Fernando",
    customerWhatsapp: "@fernando",
    contactMethod: "instagram",
    customerNote: "",
    estimatedTotal: 0,
    finalPrice: 0,
    adminNote: null,
    internalNote: null,
    createdAt: "2026-08-16T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
    completedAt: null,
    itemsTotal: 0,
    paidTotal: 0,
    balance: 0,
    isPaid: true,
    items: [],
    payments: [],
    ...overrides,
  };
}

function renderWithRouter(initialEntry: string, element: React.ReactNode) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/pedidos/nuevo" element={element} />
          <Route path="/admin/pedidos/:id/editar" element={element} />
          <Route path="/admin/pedidos" element={element} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("admin orders contact method", () => {
  beforeEach(() => {
    adminProductsMock.mockReset();
    createAdminOrderMock.mockReset();
    adminOrderMock.mockReset();
    updateAdminOrderMock.mockReset();
    adminOrdersMock.mockReset();
    updateAdminOrderStatusMock.mockReset();
    createOrderPaymentMock.mockReset();
    adminProductsMock.mockResolvedValue([] satisfies Product[]);
  });

  afterEach(() => {
    cleanup();
  });

  it("creates admin orders with contactMethod and relabeled account field", async () => {
    createAdminOrderMock.mockResolvedValue(buildOrder());

    renderWithRouter("/admin/pedidos/nuevo", <AdminOrderFormPage />);

    await waitFor(() => {
      expect(adminProductsMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByLabelText("WhatsApp o cuenta")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre del cliente"), { target: { value: "Laura" } });
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]!);
    fireEvent.click(await screen.findByRole("option", { name: "Facebook" }));
    fireEvent.change(screen.getByLabelText("WhatsApp o cuenta"), { target: { value: "laura.fb" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar pedido" }));

    await waitFor(() => {
      expect(createAdminOrderMock).toHaveBeenCalledWith(expect.objectContaining({
        customerName: "Laura",
        contactMethod: "facebook",
        customerWhatsapp: "laura.fb",
      }));
    });
  });

  it("loads and updates contactMethod in order detail", async () => {
    const order = buildOrder({ contactMethod: "facebook", customerWhatsapp: "cliente.fb" });
    adminOrderMock.mockResolvedValue(order);
    updateAdminOrderMock.mockResolvedValue({ ...order, contactMethod: "tiktok", customerWhatsapp: "@cliente.tiktok" });

    renderWithRouter("/admin/pedidos/order-1/editar", <AdminOrderDetailPage />);

    await waitFor(() => {
      expect(adminOrderMock).toHaveBeenCalledWith("order-1");
    });

    expect(screen.getByLabelText("WhatsApp o cuenta")).toHaveValue("cliente.fb");
    fireEvent.mouseDown(screen.getAllByRole("combobox")[0]!);
    fireEvent.click(await screen.findByRole("option", { name: "Tiktok" }));
    fireEvent.change(screen.getByLabelText("WhatsApp o cuenta"), { target: { value: "@cliente.tiktok" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(updateAdminOrderMock).toHaveBeenCalledWith("order-1", expect.objectContaining({
        contactMethod: "tiktok",
        customerWhatsapp: "@cliente.tiktok",
      }));
    });
  });

  it("shows method and account in the orders list", async () => {
    adminOrdersMock.mockResolvedValue([
      buildOrder({ contactMethod: "instagram", customerWhatsapp: "@artenova_cliente" }),
    ]);

    renderWithRouter("/admin/pedidos", <AdminOrdersPage />);

    await waitFor(() => {
      expect(adminOrdersMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("@artenova_cliente")).toBeInTheDocument();
  });
});
