import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QRCodePlate } from "@artenova/shared";
import { QRPlateEditor } from "../pages/admin/QRPlateEditor";

const preview = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({ api: { previewQRPlate: preview } }));
vi.mock("../pages/admin/adminUi", () => ({ AdminSection: ({ children }: { children: React.ReactNode }) => <section>{children}</section> }));

function Editor() {
  const [enabled, toggle] = useState(false);
  const [value, change] = useState<QRCodePlate>({ message: "Si estoy perdido", contacts: [{ name: "", phone: "" }], backgroundColor: "#40A3BE", foregroundColor: "#FFFFFF" });
  return <QRPlateEditor enabled={enabled} value={value} onToggle={toggle} onChange={change} fieldError={() => undefined} />;
}
afterEach(() => { cleanup(); preview.mockReset(); });
describe("QRPlateEditor", () => {
  it("requires complete contacts and manually refreshes an outdated preview", async () => {
    preview.mockResolvedValue({ svg: "<svg/>", previewUrl: "https://artenovapty.com/q/preview" });
    render(<Editor />);
    fireEvent.click(screen.getByLabelText("Habilitar placa con QR"));
    expect(screen.getByRole("button", { name: "Generar vista previa de la placa" })).toBeDisabled();
    const nameField = screen.getByLabelText("Nombre del contacto 1");
    expect(nameField.tagName).toBe("TEXTAREA");
    fireEvent.change(nameField, { target: { value: "Ana\n\nGómez" } });
    fireEvent.change(screen.getByLabelText("Teléfono del contacto 1"), { target: { value: "6000-0000" } });
    expect(preview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Generar vista previa de la placa" }));
    await screen.findByAltText("Vista previa de la placa");
    expect(preview).toHaveBeenCalledWith(undefined, expect.objectContaining({ contacts: [{ name: "Ana\n\nGómez", phone: "6000-0000" }] }));
    fireEvent.change(screen.getByLabelText("Mensaje de la placa"), { target: { value: "Por favor llamar" } });
    expect(screen.queryByAltText("Vista previa de la placa")).not.toBeInTheDocument();
    expect(screen.getByText(/quedó desactualizada/)).toBeInTheDocument();
    expect(preview).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Agregar segundo contacto" }));
    expect(screen.getByRole("button", { name: "Actualizar vista previa de la placa" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Quitar segundo contacto" }));
    fireEvent.click(screen.getByRole("button", { name: "Actualizar vista previa de la placa" }));
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(2));
  });
});
