import { describe, expect, it } from "vitest";
import { adminQRCodeInputSchema, qrCodePreviewSchema } from "./index";

describe("QR code schemas", () => {
  it("accepts URL QR payloads", () => {
    expect(adminQRCodeInputSchema.parse({
      name: "Landing promo",
      type: "url",
      status: "active",
      designConfig: {
        foregroundColor: "#111827",
        backgroundColor: "#FFFFFF",
        margin: 2,
      },
      destinationConfig: {
        url: "https://artenova.com/promos",
      },
    })).toMatchObject({
      type: "url",
      destinationConfig: { url: "https://artenova.com/promos" },
    });
  });

  it("accepts WhatsApp and vCard payloads", () => {
    expect(adminQRCodeInputSchema.parse({
      name: "Atención WhatsApp",
      type: "whatsapp",
      status: "inactive",
      designConfig: {
        foregroundColor: "#0F172A",
        backgroundColor: "#FFFFFF",
        margin: 1,
      },
      destinationConfig: {
        phone: "50760000000",
        message: "Hola",
      },
    })).toMatchObject({
      type: "whatsapp",
      status: "inactive",
    });

    expect(qrCodePreviewSchema.parse({
      type: "vcard",
      designConfig: {
        foregroundColor: "#0F172A",
        backgroundColor: "#FFFFFF",
        margin: 2,
      },
      destinationConfig: {
        fullName: "Ana Pérez",
        company: "Artenova",
        jobTitle: "Ventas",
        phone: "50760000000",
        email: "ana@artenova.test",
        website: "https://artenova.test",
        address: "Panamá",
      },
    })).toMatchObject({
      type: "vcard",
      destinationConfig: { fullName: "Ana Pérez" },
    });
  });

  it("rejects invalid destination payloads", () => {
    expect(() => adminQRCodeInputSchema.parse({
      name: "Inválido",
      type: "url",
      status: "active",
      designConfig: {
        foregroundColor: "#111827",
        backgroundColor: "#FFFFFF",
        margin: 2,
      },
      destinationConfig: {
        url: "no-es-url",
      },
    })).toThrow();
  });
});
