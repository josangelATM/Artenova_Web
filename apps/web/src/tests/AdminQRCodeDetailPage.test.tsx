import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminQRCodeDetailPage } from "../pages/admin/AdminQRCodeDetailPage";

const load = vi.hoisted(() => vi.fn());
vi.mock("../pages/admin/adminCrudUi", () => ({
  AdminBackButton: () => <button>Volver</button>,
  AdminBreadcrumbs: () => null,
  AdminDetailSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminField: ({ label, value }: { label: string; value: React.ReactNode }) => <div>{label}{value}</div>,
}));
vi.mock("../lib/api", () => ({ api: {
  adminQRCode: load,
  qrCodeSvgUrl: () => "/code.svg",
  qrCodePngUrl: () => "/code.png",
  qrPlateUrl: (id: string, format: string, download = false) => `/api/admin/qrs/${id}/plate.${format}${download ? "?download=1" : ""}`,
} }));
afterEach(() => { cleanup(); load.mockReset(); });
describe("QR detail plate downloads", () => {
  it.each([true, false])("preserves individual downloads and shows plate only when configured (%s)", async (hasPlate) => {
    load.mockResolvedValue({ id: "qr1", name: "Mascota", token: "demo", type: "url", status: "active", scanCount: 0,
      publicUrl: "https://artenovapty.com/q/demo", destinationConfig: { url: "https://example.com" }, updatedAt: "2026-10-12T12:00:00Z",
      designConfig: { foregroundColor: "#000000", backgroundColor: "#FFFFFF", margin: 2,
        ...(hasPlate ? { plateConfig: { message: "Llamar", contacts: [{ name: "Ana", phone: "60000000" }], foregroundColor: "#FFFFFF", backgroundColor: "#40A3BE" } } : {}) },
    });
    render(<MemoryRouter initialEntries={["/admin/qrs/qr1"]}><Routes><Route path="/admin/qrs/:id" element={<AdminQRCodeDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Descargar PNG" })).toHaveAttribute("href", "/code.png");
    expect(screen.getByRole("link", { name: "Descargar SVG" })).toHaveAttribute("href", "/code.svg");
    if (hasPlate) {
      expect(screen.getByRole("link", { name: "Descargar placa SVG" })).toHaveAttribute("href", "/api/admin/qrs/qr1/plate.svg?download=1");
      expect(screen.getByRole("link", { name: "Descargar placa PNG" })).toHaveAttribute("href", "/api/admin/qrs/qr1/plate.png?download=1");
      expect(screen.getByAltText("Placa Mascota")).toBeInTheDocument();
    } else expect(screen.queryByRole("link", { name: "Descargar placa SVG" })).not.toBeInTheDocument();
  });
});
