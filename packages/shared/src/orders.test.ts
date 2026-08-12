import { describe, expect, it } from "vitest";
import { adminOrderPaymentInputSchema, createAdminOrderSchema, updateAdminOrderSchema } from "./index";

describe("admin order schemas", () => {
  it("accepts quick admin order creation without items", () => {
    expect(createAdminOrderSchema.parse({
      customerName: "Mackan",
      customerWhatsapp: "6962-5607",
      customerNote: "Separado por WhatsApp"
    })).toMatchObject({
      status: "nuevo",
      items: [],
      payments: []
    });
  });

  it("accepts grouped item details and frozen prices", () => {
    const payload = updateAdminOrderSchema.parse({
      customerName: "Gabriel",
      customerWhatsapp: "6217-2806",
      customerNote: "",
      internalNote: "Pedido de jueves 6 de agosto de 2026",
      status: "pendiente_fabricacion",
      finalPrice: 24,
      items: [
        {
          productId: "prod-1",
          productName: "Placa mascota",
          quantity: 2,
          unitPrice: 12,
          extrasTotal: 0,
          isDone: true,
          personalization: { owner: "Gabriel" },
          units: [
            { label: "Ambar", personalization: { petName: "Ambar", color: "Fucsia", qr: "Si" } },
            { label: "Nala", personalization: { petName: "Nala", color: "Rojo", qr: "Si" } }
          ]
        }
      ]
    });

    expect(payload.items[0]?.units).toHaveLength(2);
    expect(payload.items[0]?.isDone).toBe(true);
    expect(payload.items[0]?.units[0]?.personalization.petName).toBe("Ambar");
  });

  it("accepts free admin items with manual name", () => {
    const payload = createAdminOrderSchema.parse({
      customerName: "Paola",
      customerWhatsapp: "6000-1122",
      items: [
        {
          productId: null,
          productName: "Llavero especial",
          quantity: 1,
          unitPrice: 8,
          extrasTotal: 0,
          personalization: { detalle: "Texto libre" },
        },
      ],
      payments: [
        { amount: 4, method: "efectivo", note: "Separado" },
      ],
    });

    expect(payload.items[0]?.productId).toBeNull();
    expect(payload.items[0]?.productName).toBe("Llavero especial");
    expect(payload.payments[0]?.amount).toBe(4);
  });

  it("accepts manual applied adjustments with the item quantity", () => {
    const payload = createAdminOrderSchema.parse({
      customerName: "Rosa",
      customerWhatsapp: "6111-2233",
      items: [
        {
          productId: "prod-2",
          productName: "Cuadro QR",
          quantity: 3,
          unitPrice: 10,
          extrasTotal: 4.5,
          appliedAdjustments: [
            { label: "QR", unitAmount: 1.5, quantity: 3, totalAmount: 4.5 },
          ],
          personalization: {},
        },
      ],
    });

    expect(payload.items[0]?.appliedAdjustments[0]).toMatchObject({
      label: "QR",
      unitAmount: 1.5,
      quantity: 3,
      totalAmount: 4.5,
    });
  });

  it("rejects legacy order statuses", () => {
    expect(() => updateAdminOrderSchema.parse({
      customerName: "Legacy",
      customerWhatsapp: "6000-0000",
      customerNote: "",
      internalNote: null,
      status: "completado",
      items: [],
    })).toThrow();
  });

  it("rejects legacy option-linked adjustment fields", () => {
    expect(() => createAdminOrderSchema.parse({
      customerName: "Legacy",
      customerWhatsapp: "6000-0000",
      items: [
        {
          productId: "prod-1",
          productName: "Placa",
          quantity: 1,
          unitPrice: 10,
          extrasTotal: 2,
          selectedOptionValueIds: ["value-1"],
          appliedAdjustments: [
            {
              label: "QR",
              sourceOptionId: "opt-1",
              sourceOptionValueId: "value-1",
              sourceOptionName: "Acabado",
              sourceOptionValue: "QR",
              unitAmount: 2,
              quantity: 1,
              totalAmount: 2,
            },
          ],
          personalization: {},
        },
      ],
    })).toThrow();
  });

  it("validates payment movements", () => {
    expect(adminOrderPaymentInputSchema.parse({ amount: "12.5", method: "yappy", reference: "YAP-001" })).toMatchObject({
      amount: 12.5,
      method: "yappy"
    });
  });

  it("accepts short admin contacts like IG", () => {
    const payload = createAdminOrderSchema.parse({
      customerName: "Fernando",
      customerWhatsapp: "IG",
      items: [],
      payments: [],
    });

    expect(payload.customerWhatsapp).toBe("IG");
  });

  it("accepts empty whatsapp for admin orders", () => {
    const payload = createAdminOrderSchema.parse({
      customerName: "Fernando",
      customerWhatsapp: "",
      items: [],
      payments: [],
    });

    expect(payload.customerWhatsapp).toBe("");
  });
});
