import { describe, expect, it } from "vitest";
import { adminExpenseQuerySchema, createAdminExpenseSchema, expenseCategoryLabels } from "./index";

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
});
