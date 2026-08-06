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
      status: "en_proceso",
      finalPrice: 24,
      items: [
        {
          productId: "prod-1",
          productName: "Placa mascota",
          quantity: 2,
          unitPrice: 12,
          extrasTotal: 0,
          personalization: { owner: "Gabriel" },
          units: [
            { label: "Ambar", personalization: { petName: "Ambar", color: "Fucsia", qr: "Si" } },
            { label: "Nala", personalization: { petName: "Nala", color: "Rojo", qr: "Si" } }
          ]
        }
      ]
    });

    expect(payload.items[0]?.units).toHaveLength(2);
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

  it("validates payment movements", () => {
    expect(adminOrderPaymentInputSchema.parse({ amount: "12.5", method: "yappy", reference: "YAP-001" })).toMatchObject({
      amount: 12.5,
      method: "yappy"
    });
  });
});
