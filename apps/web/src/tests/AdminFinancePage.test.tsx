import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminFinanceOverview } from "@artenova/shared";
import { AdminFinancePage } from "../pages/admin/AdminFinancePage";
import { theme } from "../theme/theme";

const adminFinanceOverviewMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    adminFinanceOverview: (...args: unknown[]) => adminFinanceOverviewMock(...args),
  },
}));

const overview: AdminFinanceOverview = {
  rangePreset: "custom",
  dateFrom: "2026-08-01",
  dateTo: "2026-08-13",
  summary: {
    paidIncome: 120,
    committedSales: 180,
    outstandingBalance: 60,
    expenseTotal: 55,
    netCashflow: 65,
    orderCount: 3,
    expenseCount: 2,
  },
  timeSeries: [
    { date: "2026-08-12", paidIncome: 80, expenseTotal: 10, net: 70 },
    { date: "2026-08-13", paidIncome: 40, expenseTotal: 45, net: -5 },
  ],
  expenseBreakdown: [
    { category: "servicios", total: 45, count: 1 },
    { category: "viaticos", total: 10, count: 1 },
  ],
  orderStatusBreakdown: [
    { status: "pendiente_fabricacion", total: 100, count: 1 },
    { status: "entregado", total: 80, count: 1 },
  ],
  paymentMethodBreakdown: [
    { method: "efectivo", total: 80, count: 1 },
    { method: "yappy", total: 40, count: 1 },
  ],
  topOutstandingOrders: [
    {
      id: "o1",
      code: "2608-001",
      customerName: "Ana",
      status: "pendiente_fabricacion",
      createdAt: "2026-08-05T10:00:00.000Z",
      finalPrice: 100,
      itemsTotal: 100,
      paidTotal: 40,
      balance: 60,
    },
  ],
  recentExpenses: [
    {
      id: "e1",
      expenseDate: "2026-08-13T09:00:00.000Z",
      category: "servicios",
      description: "Internet",
      amount: 45,
      paymentMethod: "transferencia",
      reference: "S-1",
    },
  ],
};

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/admin/finanzas"]}>
        <Routes>
          <Route path="/admin/finanzas" element={<AdminFinancePage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("AdminFinancePage", () => {
  beforeEach(() => {
    adminFinanceOverviewMock.mockReset();
    adminFinanceOverviewMock.mockResolvedValue(overview);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders finance KPIs and drill-down links", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Finanzas")).toBeInTheDocument();
      expect(screen.getByText("B/.120.00")).toBeInTheDocument();
    });

    expect(adminFinanceOverviewMock).toHaveBeenCalledWith(expect.any(URLSearchParams));

    const receivablesLink = screen.getByRole("link", { name: /cuentas por cobrar/i });
    expect(receivablesLink.getAttribute("href")).toContain("/admin/pedidos?");
    expect(receivablesLink.getAttribute("href")).toContain("hasBalance=true");
    expect(receivablesLink.getAttribute("href")).toContain("dateFrom=2026-08-01");
    expect(receivablesLink.getAttribute("href")).toContain("dateTo=2026-08-13");

    const categoryLink = screen.getByRole("link", { name: /materia prima|servicios/i });
    expect(categoryLink.getAttribute("href")).toContain("/admin/gastos?");
  });

  it("switches to custom dates and requests the overridden range", async () => {
    renderPage();

    await waitFor(() => {
      expect(adminFinanceOverviewMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-08-10" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-08-13" } });

    await waitFor(() => {
      const lastCall = adminFinanceOverviewMock.mock.calls.at(-1)?.[0] as URLSearchParams;
      expect(lastCall.get("rangePreset")).toBe("custom");
      expect(lastCall.get("dateFrom")).toBe("2026-08-10");
      expect(lastCall.get("dateTo")).toBe("2026-08-13");
    });
  });
});
