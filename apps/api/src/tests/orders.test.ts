import { describe, expect, it } from "vitest";
import { orderPayload } from "../lib/serialize";

describe("order serialization", () => {
  it("derives totals, balance and grouped item units", () => {
    const payload = orderPayload({
      id: "o1",
      code: "2608-001",
      source: "admin_manual",
      status: "pendiente_fabricacion",
      customerName: "Gabriel",
      customerWhatsapp: "6217-2806",
      contactMethod: "instagram",
      customerNote: "Pendiente entrega",
      internalNote: "Tomado el 2026-08-06",
      estimatedTotal: 24,
      finalPrice: null,
      completedAt: null,
      createdAt: new Date("2026-08-06T10:00:00Z"),
      updatedAt: new Date("2026-08-06T11:00:00Z"),
      items: [
        {
          id: "i1",
          orderId: "o1",
          productId: "p1",
          productName: "Placa mascota",
          quantity: 2,
          unitPrice: 12,
          extrasTotal: 0,
          lineTotal: 24,
          skuSnapshot: "PLA-ROJ-01",
          variantNameSnapshot: "Rojo",
          selectedExtraIds: [],
          personalization: { owner: "Gabriel" },
          isDone: true,
          units: [
            { id: "u1", position: 0, label: "Ambar", personalization: { petName: "Ambar", qr: "Si" } },
            { id: "u2", position: 1, label: "Nala", personalization: { petName: "Nala", qr: "Si" } }
          ]
        }
      ],
      payments: [
        { id: "pay-1", amount: 12, method: "yappy", reference: "YAP-001", note: null, createdAt: new Date("2026-08-06T12:00:00Z") }
      ]
    });

    expect(payload.finalPrice).toBeNull();
    expect(payload.itemsTotal).toBe(24);
    expect(payload.paidTotal).toBe(12);
    expect(payload.balance).toBe(12);
    expect(payload.isPaid).toBe(false);
    expect(payload.items[0]?.isDone).toBe(true);
    expect(payload.items[0]?.skuSnapshot).toBe("PLA-ROJ-01");
    expect(payload.items[0]?.variantNameSnapshot).toBe("Rojo");
    expect(payload.items[0]?.units[1]?.label).toBe("Nala");
    expect(payload.contactMethod).toBe("instagram");
  });

  it("keeps completedAt for delivered orders with zero balance", () => {
    const payload = orderPayload({
      id: "o2",
      code: "2608-002",
      source: "admin_manual",
      status: "entregado",
      customerName: "Mackan",
      customerWhatsapp: "6962-5607",
      contactMethod: "whatsapp",
      estimatedTotal: 35,
      finalPrice: 35,
      completedAt: new Date("2026-08-06T18:00:00Z"),
      createdAt: new Date("2026-08-06T08:00:00Z"),
      updatedAt: new Date("2026-08-06T18:00:00Z"),
      items: [],
      payments: [
        { id: "pay-2", amount: 35, method: "efectivo", reference: null, note: "Pago total", createdAt: new Date("2026-08-06T17:00:00Z") }
      ]
    });

    expect(payload.isPaid).toBe(true);
    expect(payload.balance).toBe(0);
    expect(payload.completedAt).toBe("2026-08-06T18:00:00.000Z");
  });

  it("keeps non-delivered orders without completedAt", () => {
    const payload = orderPayload({
      id: "o4",
      code: "2608-004",
      source: "admin_manual",
      status: "listo_entrega",
      customerName: "Damaris",
      customerWhatsapp: "6888-5511",
      contactMethod: "facebook",
      estimatedTotal: 18,
      finalPrice: 18,
      completedAt: null,
      createdAt: new Date("2026-08-06T15:00:00Z"),
      updatedAt: new Date("2026-08-06T16:00:00Z"),
      items: [],
      payments: [
        { id: "pay-4", amount: 18, method: "transferencia", reference: "TRF-001", note: null, createdAt: new Date("2026-08-06T15:30:00Z") }
      ]
    });

    expect(payload.isPaid).toBe(true);
    expect(payload.completedAt).toBeNull();
    expect(payload.contactMethod).toBe("facebook");
  });

  it("keeps free items without catalog product id", () => {
    const payload = orderPayload({
      id: "o3",
      code: "2608-003",
      source: "admin_manual",
      status: "nuevo",
      customerName: "Laura",
      customerWhatsapp: "6555-0192",
      contactMethod: "otro",
      estimatedTotal: 10,
      finalPrice: null,
      createdAt: new Date("2026-08-06T09:00:00Z"),
      updatedAt: new Date("2026-08-06T09:15:00Z"),
      items: [
        {
          id: "i3",
          orderId: "o3",
          productId: null,
          productName: "Artículo libre",
          quantity: 1,
          unitPrice: 10,
          extrasTotal: 0,
          lineTotal: 10,
          selectedExtraIds: [],
          personalization: { detalle: "Texto libre" },
          isDone: false,
          units: []
        }
      ],
      payments: []
    });

    expect(payload.items[0]?.productId).toBeNull();
    expect(payload.items[0]?.productName).toBe("Artículo libre");
  });
});
