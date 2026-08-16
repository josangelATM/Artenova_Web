import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "../components/ToastProvider";
import { theme } from "../theme/theme";

function renderWithProvider(initialEntries: Array<string | { pathname: string; state?: unknown }>, element: React.ReactNode) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route
            path="*"
            element={(
              <ToastProvider>
                {element}
              </ToastProvider>
            )}
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function LocalToastButton() {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast({ message: "Producto guardado", severity: "success" })}>
      Mostrar toast
    </button>
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a local success toast", async () => {
    renderWithProvider(["/admin/productos/1/editar"], <LocalToastButton />);

    fireEvent.click(screen.getByRole("button", { name: "Mostrar toast" }));

    expect(await screen.findByText("Producto guardado")).toBeInTheDocument();
  });

  it("consumes flash toast from navigation state once", async () => {
    renderWithProvider(
      [{ pathname: "/admin/productos", state: { toast: { message: "Producto guardado", severity: "success" } } }],
      <div>Pantalla destino</div>,
    );

    const toasts = await screen.findAllByText("Producto guardado");
    expect(toasts).toHaveLength(1);

  });
});
