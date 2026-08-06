import { describe, expect, it } from "vitest";
import { buildExpenseSummaryBounds, parseDateOnly } from "../lib/expenseDates";
import { expensePayload } from "../lib/serialize";

describe("expense helpers", () => {
  it("builds summary bounds that exclude future dates from the current month", () => {
    const bounds = buildExpenseSummaryBounds(new Date("2026-08-06T15:30:00Z"));

    expect(bounds.monthStart.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(bounds.todayStart.toISOString()).toBe("2026-08-06T00:00:00.000Z");
    expect(bounds.todayEnd.toISOString()).toBe("2026-08-06T23:59:59.999Z");
    expect(parseDateOnly("2026-08-20") > bounds.todayEnd).toBe(true);
  });

  it("serializes expense dates and optional fields", () => {
    const payload = expensePayload({
      id: "exp-1",
      category: "servicios",
      amount: 42.5,
      expenseDate: new Date("2026-08-05T00:00:00Z"),
      description: "Pago de internet",
      paymentMethod: null,
      reference: null,
      notes: "Plan mensual",
      createdAt: new Date("2026-08-06T09:00:00Z"),
      updatedAt: new Date("2026-08-06T10:15:00Z")
    });

    expect(payload.amount).toBe(42.5);
    expect(payload.expenseDate).toBe("2026-08-05T00:00:00.000Z");
    expect(payload.paymentMethod).toBeNull();
    expect(payload.notes).toBe("Plan mensual");
  });
});
