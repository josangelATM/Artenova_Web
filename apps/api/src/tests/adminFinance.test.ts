import { describe, expect, it } from "vitest";
import { buildAdminFinanceOverview, resolveAdminFinanceRange } from "../lib/adminFinance";

describe("admin finance overview", () => {
  it("calculates paid income from payments and keeps committed sales separate", () => {
    const overview = buildAdminFinanceOverview(
      {
        rangePreset: "thisMonth",
      },
      {
        now: new Date("2026-08-13T12:00:00Z"),
        orders: [
          {
            id: "o1",
            code: "2608-001",
            source: "admin_manual",
            status: "pendiente_fabricacion",
            customerName: "Ana",
            customerWhatsapp: "6000-0001",
            estimatedTotal: 100,
            finalPrice: 100,
            createdAt: new Date("2026-08-05T10:00:00Z"),
            updatedAt: new Date("2026-08-05T10:00:00Z"),
            items: [],
            payments: [
              { id: "p1", amount: 40, method: "yappy", createdAt: new Date("2026-08-06T10:00:00Z") },
            ],
          },
          {
            id: "o2",
            code: "2608-002",
            source: "admin_manual",
            status: "entregado",
            customerName: "Beto",
            customerWhatsapp: "6000-0002",
            estimatedTotal: 80,
            finalPrice: null,
            createdAt: new Date("2026-08-08T10:00:00Z"),
            updatedAt: new Date("2026-08-08T10:00:00Z"),
            items: [
              {
                id: "i1",
                productName: "Caja",
                quantity: 1,
                unitPrice: 80,
                extrasTotal: 0,
                lineTotal: 80,
                selectedExtraIds: [],
                personalization: {},
                isDone: false,
                units: [],
              },
            ],
            payments: [
              { id: "p2", amount: 80, method: "efectivo", createdAt: new Date("2026-08-08T11:00:00Z") },
            ],
          },
          {
            id: "o3",
            code: "2607-001",
            source: "admin_manual",
            status: "nuevo",
            customerName: "Fuera de rango",
            customerWhatsapp: "6000-0003",
            estimatedTotal: 25,
            finalPrice: 25,
            createdAt: new Date("2026-07-28T10:00:00Z"),
            updatedAt: new Date("2026-07-28T10:00:00Z"),
            items: [],
            payments: [],
          },
        ],
        payments: [
          { amount: 40, method: "yappy", createdAt: new Date("2026-08-06T10:00:00Z") },
          { amount: 80, method: "efectivo", createdAt: new Date("2026-08-08T11:00:00Z") },
          { amount: 15, method: "transferencia", createdAt: new Date("2026-07-29T11:00:00Z") },
        ],
        expenses: [
          {
            id: "e1",
            category: "servicios",
            amount: 45,
            expenseDate: new Date("2026-08-07T09:00:00Z"),
            description: "Internet",
            paymentMethod: "transferencia",
            reference: "S-1",
            notes: null,
            createdAt: new Date("2026-08-07T09:00:00Z"),
            updatedAt: new Date("2026-08-07T09:00:00Z"),
          },
          {
            id: "e2",
            category: "viaticos",
            amount: 10,
            expenseDate: new Date("2026-08-13T09:00:00Z"),
            description: "Taxi",
            paymentMethod: "efectivo",
            reference: null,
            notes: null,
            createdAt: new Date("2026-08-13T09:00:00Z"),
            updatedAt: new Date("2026-08-13T09:00:00Z"),
          },
        ],
      },
    );

    expect(overview.summary.paidIncome).toBe(120);
    expect(overview.summary.committedSales).toBe(180);
    expect(overview.summary.outstandingBalance).toBe(60);
    expect(overview.summary.expenseTotal).toBe(55);
    expect(overview.summary.netCashflow).toBe(65);
    expect(overview.summary.netProfit).toBe(65);
    expect(overview.paymentMethodBreakdown.map((item) => item.method)).toEqual(["efectivo", "yappy"]);
    expect(overview.expenseBreakdown[0]).toMatchObject({ category: "servicios", total: 45 });
    expect(overview.topOutstandingOrders[0]).toMatchObject({ code: "2608-001", balance: 60 });
  });

  it("supports custom ranges over preset values", () => {
    const overview = buildAdminFinanceOverview(
      {
        rangePreset: "last30",
        dateFrom: "2026-08-10",
        dateTo: "2026-08-13",
      },
      {
        now: new Date("2026-08-13T12:00:00Z"),
        orders: [
          {
            id: "o1",
            code: "2608-010",
            source: "admin_manual",
            status: "nuevo",
            customerName: "Carla",
            customerWhatsapp: "6000-0004",
            estimatedTotal: 30,
            finalPrice: 30,
            createdAt: new Date("2026-08-09T10:00:00Z"),
            updatedAt: new Date("2026-08-09T10:00:00Z"),
            items: [],
            payments: [],
          },
          {
            id: "o2",
            code: "2608-011",
            source: "admin_manual",
            status: "nuevo",
            customerName: "Dora",
            customerWhatsapp: "6000-0005",
            estimatedTotal: 50,
            finalPrice: 50,
            createdAt: new Date("2026-08-12T10:00:00Z"),
            updatedAt: new Date("2026-08-12T10:00:00Z"),
            items: [],
            payments: [],
          },
        ],
        payments: [
          { amount: 30, method: "yappy", createdAt: new Date("2026-08-09T10:30:00Z") },
          { amount: 50, method: "yappy", createdAt: new Date("2026-08-12T10:30:00Z") },
        ],
        expenses: [
          {
            id: "e1",
            category: "otros",
            amount: 20,
            expenseDate: new Date("2026-08-13T08:00:00Z"),
            description: "Varios",
            paymentMethod: "efectivo",
            reference: null,
            notes: null,
            createdAt: new Date("2026-08-13T08:00:00Z"),
            updatedAt: new Date("2026-08-13T08:00:00Z"),
          },
        ],
      },
    );

    expect(overview.rangePreset).toBe("custom");
    expect(overview.dateFrom).toBe("2026-08-10");
    expect(overview.summary.orderCount).toBe(1);
    expect(overview.summary.paidIncome).toBe(50);
    expect(overview.timeSeries).toHaveLength(4);
    expect(overview.timeSeries[0]?.date).toBe("2026-08-10");
  });

  it("resolves preset bounds using August 13, 2026 as current date", () => {
    const range = resolveAdminFinanceRange(
      { rangePreset: "last7" },
      new Date("2026-08-13T12:00:00Z"),
    );

    expect(range.rangePreset).toBe("last7");
    expect(range.dateFrom.toISOString()).toBe("2026-08-07T00:00:00.000Z");
    expect(range.dateTo.toISOString()).toBe("2026-08-13T23:59:59.999Z");
  });
});
