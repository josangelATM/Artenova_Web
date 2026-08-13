import { describe, expect, it } from "vitest";
import { adminExpenseQuerySchema, adminFinanceOverviewSchema, adminFinanceQuerySchema, createAdminExpenseSchema, expenseCategoryLabels } from "./index";

describe("admin expense schemas", () => {
  it("accepts a valid expense with optional payment method omitted", () => {
    const payload = createAdminExpenseSchema.parse({
      category: "viaticos",
      amount: "18.75",
      expenseDate: "2026-08-06",
      description: "Taxi al taller",
      reference: "REC-18",
      notes: "Visita a proveedor"
    });

    expect(payload).toMatchObject({
      category: "viaticos",
      amount: 18.75
    });
    expect("paymentMethod" in payload).toBe(false);
  });

  it("rejects zero amount and blank description", () => {
    expect(() => createAdminExpenseSchema.parse({
      category: "otros",
      amount: 0,
      expenseDate: "2026-08-06",
      description: "   "
    })).toThrow();
  });

  it("parses paginated query filters", () => {
    expect(adminExpenseQuerySchema.parse({
      page: "2",
      pageSize: "20",
      category: "publicidad",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      q: "campaña agosto"
    })).toMatchObject({
      page: 2,
      pageSize: 20,
      category: "publicidad",
      q: "campaña agosto"
    });
  });

  it("keeps accented labels for UI", () => {
    expect(expenseCategoryLabels.viaticos).toBe("Viáticos");
  });

  it("accepts credit card as expense payment method", () => {
    const payload = createAdminExpenseSchema.parse({
      category: "servicios",
      amount: 32.4,
      expenseDate: "2026-08-06",
      description: "Pago de suscripción",
      paymentMethod: "tarjeta_credito"
    });

    expect(payload.paymentMethod).toBe("tarjeta_credito");
  });

  it("parses finance query presets and custom ranges", () => {
    expect(adminFinanceQuerySchema.parse({})).toMatchObject({
      rangePreset: "thisMonth",
    });

    expect(adminFinanceQuerySchema.parse({
      rangePreset: "last30",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-13",
    })).toMatchObject({
      rangePreset: "last30",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-13",
    });
  });

  it("accepts a finance overview payload", () => {
    const payload = adminFinanceOverviewSchema.parse({
      rangePreset: "thisMonth",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-13",
      summary: {
        paidIncome: 120,
        committedSales: 180,
        outstandingBalance: 60,
        expenseTotal: 45,
        netCashflow: 75,
        netProfit: 75,
        orderCount: 3,
        expenseCount: 2,
      },
      timeSeries: [
        { date: "2026-08-13", paidIncome: 20, expenseTotal: 5, net: 15 },
      ],
      expenseBreakdown: [
        { category: "servicios", total: 45, count: 2 },
      ],
      orderStatusBreakdown: [
        { status: "pendiente_fabricacion", total: 180, count: 3 },
      ],
      paymentMethodBreakdown: [
        { method: "yappy", total: 120, count: 2 },
      ],
      topOutstandingOrders: [
        {
          id: "o1",
          code: "2608-001",
          customerName: "Ana",
          status: "pendiente_fabricacion",
          createdAt: "2026-08-13T10:00:00.000Z",
          finalPrice: 100,
          itemsTotal: 100,
          paidTotal: 40,
          balance: 60,
        },
      ],
      recentExpenses: [
        {
          id: "e1",
          expenseDate: "2026-08-13T12:00:00.000Z",
          category: "servicios",
          description: "Pago mensual",
          amount: 45,
          paymentMethod: "transferencia",
          reference: "TRX-1",
        },
      ],
    });

    expect(payload.summary.netCashflow).toBe(75);
    expect(payload.summary.netProfit).toBe(75);
    expect(payload.topOutstandingOrders[0]?.balance).toBe(60);
  });
});
