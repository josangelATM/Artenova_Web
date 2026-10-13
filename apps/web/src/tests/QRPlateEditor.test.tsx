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
  const [value, change] = useState<QRCodePlate>({ message: "Si estoy perdido", contactText: "", size: "medium", foregroundColor: "#FFFFFF", backgroundColor: "#40A3BE", transparentBackground: false });
  return <QRPlateEditor enabled={enabled} value={value} onToggle={toggle} onChange={change} fieldError={() => undefined} />;
}
afterEach(() => { cleanup(); preview.mockReset(); });
describe("QRPlateEditor", () => {
  it("requires complete contacts and manually refreshes an outdated preview", async () => {
    preview.mockResolvedValue({ svg: "<svg/>", previewUrl: "https://artenovapty.com/q/preview" });
    render(<Editor />);
    fireEvent.click(screen.getByLabelText("Habilitar placa con QR"));
    expect(screen.getByLabelText("Tamaño de la plaquita")).toHaveTextContent("Mediana");
    fireEvent.mouseDown(screen.getByLabelText("Tamaño de la plaquita"));
    fireEvent.click(screen.getByRole("option", { name: /Pequeña/ }));
    expect(screen.getByLabelText("Fondo de la plaquita")).toBeEnabled();
    fireEvent.click(screen.getByLabelText("Fondo transparente de la plaquita"));
    expect(screen.getByLabelText("Fondo de la plaquita")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Color del texto y QR"), { target: { value: "#FAFAFA" } });
    expect(screen.getByRole("button", { name: "Generar vista previa de la placa" })).toBeDisabled();
    const nameField = screen.getByLabelText("Datos de contacto");
    expect(nameField.tagName).toBe("TEXTAREA");
    fireEvent.change(nameField, { target: { value: "Ana\n\nGómez\n6000-0000" } });
    expect(screen.queryByLabelText("Nombre del contacto 1")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Teléfono del contacto 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar segundo contacto" })).not.toBeInTheDocument();
    expect(preview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Generar vista previa de la placa" }));
    await screen.findByAltText("Vista previa de la placa");
    expect(preview).toHaveBeenCalledWith(undefined, expect.objectContaining({ contactText: "Ana\n\nGómez\n6000-0000" }));
    expect(preview).toHaveBeenCalledWith(undefined, expect.objectContaining({ size: "small", foregroundColor: "#fafafa", transparentBackground: true }));
    fireEvent.change(screen.getByLabelText("Mensaje de la placa"), { target: { value: "Por favor llamar" } });
    expect(screen.queryByAltText("Vista previa de la placa")).not.toBeInTheDocument();
    expect(screen.getByText(/quedó desactualizada/)).toBeInTheDocument();
    expect(preview).toHaveBeenCalledTimes(1);
    fireEvent.change(nameField, { target: { value: "\n " } });
    expect(screen.getByRole("button", { name: "Actualizar vista previa de la placa" })).toBeDisabled();
    fireEvent.change(nameField, { target: { value: "Ana\n6000-0000\n\nJosé\n6111-1111" } });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar vista previa de la placa" }));
    await waitFor(() => expect(preview).toHaveBeenCalledTimes(2));
  });
});
