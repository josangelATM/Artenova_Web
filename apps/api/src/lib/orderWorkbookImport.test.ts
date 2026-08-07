import { describe, expect, it } from "vitest";
import { buildWorkbookImportPlan, type PetTagImportRow, type RegularImportRow } from "./orderWorkbookImport";

function regularRow(overrides: Partial<RegularImportRow> = {}): RegularImportRow {
  return {
    sheetName: "Pedidos regulares",
    rowNumber: 4,
    originalDate: new Date("2026-08-07T00:00:00Z"),
    dateKey: "2026-08-07",
    customerName: "Diex",
    customerNameKey: "diex",
    customerWhatsapp: "6968-3525",
    customerWhatsappKey: "6968-3525",
    detail: "Escudo Arsenal",
    quantity: 1,
    unitCost: 14,
    total: 28,
    paid: 8.4,
    balance: 19.6,
    ...overrides,
  };
}

function petRow(overrides: Partial<PetTagImportRow> = {}): PetTagImportRow {
  return {
    sheetName: "Cédulas de mascota",
    rowNumber: 4,
    originalDate: new Date("2026-08-07T00:00:00Z"),
    dateKey: "2026-08-07",
    customerName: "Felix",
    customerNameKey: "felix",
    customerWhatsapp: "6671-8948",
    customerWhatsappKey: "6671-8948",
    petName: "Rosco",
    plateSize: "Mediano",
    plateColor: "Rojo",
    qr: "Sí",
    quantity: 1,
    unitCost: 8.4,
    total: 8.4,
    paid: 4.5,
    balance: 3.9,
    ...overrides,
  };
}

describe("orderWorkbookImport", () => {
  it("groups regular duplicate rows only when there is zero-total complement evidence", () => {
    const plan = buildWorkbookImportPlan({
      regularRows: [
        regularRow({ rowNumber: 13 }),
        regularRow({ rowNumber: 14, detail: "Escudo Real Madrid", total: 0, paid: 0, balance: 0 }),
      ],
      petRows: [],
    });

    expect(plan.automaticOrders).toHaveLength(1);
    expect(plan.automaticOrders[0]?.mode).toBe("grouped");
    expect(plan.automaticOrders[0]?.input.items).toHaveLength(2);
    expect(plan.reviewGroups).toHaveLength(0);
  });

  it("keeps pet rows separate when the only repeated clue is the same IG contact", () => {
    const plan = buildWorkbookImportPlan({
      regularRows: [],
      petRows: [
        petRow({ rowNumber: 50, customerName: "Fernando", customerNameKey: "fernando", customerWhatsapp: "IG", customerWhatsappKey: "ig", paid: 6.3, balance: 14.7, total: 21, unitCost: 21 }),
        petRow({ rowNumber: 51, customerName: "Fernando", customerNameKey: "fernando", customerWhatsapp: "IG", customerWhatsappKey: "ig", petName: "Kiraneth", total: 0, paid: 0, balance: 0, unitCost: 0 }),
      ],
    });

    expect(plan.automaticOrders).toHaveLength(2);
    expect(plan.automaticOrders.every((order) => order.mode === "single")).toBe(true);
  });

  it("groups pet rows with repeated shared partial payment evidence", () => {
    const plan = buildWorkbookImportPlan({
      regularRows: [],
      petRows: [
        petRow({ rowNumber: 10, petName: "Rosco" }),
        petRow({ rowNumber: 11, petName: "Oslo", qr: "si" }),
      ],
    });

    expect(plan.automaticOrders).toHaveLength(1);
    expect(plan.automaticOrders[0]?.mode).toBe("grouped");
    expect(plan.automaticOrders[0]?.input.payments[0]?.amount).toBe(4.5);
  });

  it("sends potential grouped rows to review when the payment values conflict", () => {
    const plan = buildWorkbookImportPlan({
      regularRows: [],
      petRows: [
        petRow({ rowNumber: 31, customerName: "Olga", customerNameKey: "olga", customerWhatsapp: "6949-3956", customerWhatsappKey: "6949-3956", paid: 6.3, balance: 14.7, total: 21, unitCost: 21 }),
        petRow({ rowNumber: 32, customerName: "Olga", customerNameKey: "olga", customerWhatsapp: "6949-3956", customerWhatsappKey: "6949-3956", petName: "Capo", paid: 4, balance: 0, total: 0, unitCost: 0 }),
      ],
    });

    expect(plan.automaticOrders).toHaveLength(0);
    expect(plan.reviewGroups).toHaveLength(1);
    expect(plan.reviewGroups[0]?.reason).toMatch(/Pagos inconsistentes/i);
  });
});
