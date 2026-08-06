import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QRCodePage } from "../pages/QRCodePage";
import { theme } from "../theme/theme";

const resolveQRCodeMock = vi.fn();
const qrVCardUrlMock = vi.fn((token: string) => `/api/qrs/${token}/contact.vcf`);
const applySeoMock = vi.fn();

vi.mock("../lib/api", () => ({
  api: {
    resolveQRCode: (...args: unknown[]) => resolveQRCodeMock(...args),
    qrVCardUrl: (token: string) => qrVCardUrlMock(token),
  },
}));

vi.mock("../lib/seo", () => ({
  applySeo: (...args: unknown[]) => applySeoMock(...args),
}));

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/q/token-demo"]}>
        <Routes>
          <Route path="/q/:token" element={<QRCodePage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("QRCodePage", () => {
  beforeEach(() => {
    resolveQRCodeMock.mockReset();
    qrVCardUrlMock.mockClear();
    applySeoMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders vCard information and contact download link", async () => {
    resolveQRCodeMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        token: "token-demo",
        status: "active",
        type: "vcard",
        name: "Tarjeta Ana",
        targetUrl: null,
        publicUrl: "https://artenovapty.com/q/token-demo",
        vcard: {
          fullName: "Ana Pérez",
          company: "Artenova",
          jobTitle: "Ventas",
          phone: "50760000000",
          email: "ana@artenova.test",
          website: "https://artenova.test",
          address: "Panamá",
        },
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    });
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guardar contacto" })).toHaveAttribute("href", "/api/qrs/token-demo/contact.vcf");
  });

  it("shows a controlled inactive message", async () => {
    resolveQRCodeMock.mockResolvedValue({
      ok: false,
      status: 410,
      data: { message: "QR inactivo" },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Este QR está inactivo.")).toBeInTheDocument();
    });
  });
});
