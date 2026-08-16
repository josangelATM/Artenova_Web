import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminQRCodeFormPage } from "../pages/admin/AdminQRCodeFormPage";
import { theme } from "../theme/theme";

const saveAdminQRCodeMock = vi.fn();
const previewQRCodeMock = vi.fn();
const adminQRCodeMock = vi.fn();
const showToastMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    saveAdminQRCode: (...args: unknown[]) => saveAdminQRCodeMock(...args),
    previewQRCode: (...args: unknown[]) => previewQRCodeMock(...args),
    adminQRCode: (...args: unknown[]) => adminQRCodeMock(...args),
  },
}));

vi.mock("../components/ToastProvider", () => ({
  useToast: () => ({ showToast: showToastMock }),
  toastNavigationState: (toast: unknown) => ({ toast }),
}));

vi.mock("../pages/admin/adminCrudUi", () => ({
  AdminBackButton: ({ label = "Volver" }: { label?: string }) => <button type="button">{label}</button>,
  AdminBreadcrumbs: () => <div>breadcrumbs</div>,
}));

vi.mock("../pages/admin/adminUi", () => ({
  AdminPageHeader: ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      {action}
    </div>
  ),
  AdminSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/admin/qrs/nuevo"]}>
        <Routes>
          <Route path="/admin/qrs/nuevo" element={<AdminQRCodeFormPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function firstByLabelText(label: string) {
  return screen.getAllByLabelText(label)[0] as HTMLElement;
}

function textboxAt(index: number) {
  return screen.getAllByRole("textbox")[index] as HTMLElement;
}

describe("AdminQRCodeFormPage", () => {
  beforeEach(() => {
    saveAdminQRCodeMock.mockReset();
    previewQRCodeMock.mockReset();
    adminQRCodeMock.mockReset();
    showToastMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render the logo field and keeps preview manual", async () => {
    previewQRCodeMock.mockResolvedValue({
      resolvedTarget: "https://artenova.com/promos",
      previewUrl: "https://artenovapty.com/q/preview",
      svg: "<svg></svg>",
    });

    renderPage();

    expect(screen.queryByLabelText(/logo url/i)).not.toBeInTheDocument();

    fireEvent.change(textboxAt(0), { target: { value: "Promo QR" } });
    fireEvent.change(textboxAt(1), { target: { value: "https://artenova.com/promos" } });

    await waitFor(() => {
      expect(previewQRCodeMock).not.toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));

    await waitFor(() => {
      expect(previewQRCodeMock).toHaveBeenCalledTimes(1);
    });
  });

  it("supports transparent background without auto-refreshing the preview", async () => {
    previewQRCodeMock.mockResolvedValue({
      resolvedTarget: "https://artenova.com/promos",
      previewUrl: "https://artenovapty.com/q/preview",
      svg: "<svg></svg>",
    });

    renderPage();

    fireEvent.change(textboxAt(0), { target: { value: "Promo QR" } });
    fireEvent.change(textboxAt(1), { target: { value: "https://artenova.com/promos" } });

    const transparentToggle = firstByLabelText("Fondo transparente");
    fireEvent.click(transparentToggle);

    const backgroundField = firstByLabelText("Color de fondo");
    expect(backgroundField).toBeDisabled();
    expect(previewQRCodeMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));

    await waitFor(() => {
      expect(previewQRCodeMock).toHaveBeenCalledTimes(1);
    });

    expect(previewQRCodeMock).toHaveBeenCalledWith(expect.objectContaining({
      designConfig: expect.objectContaining({
        transparentBackground: true,
      }),
    }));
  });
});
