import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "../components/ScrollToTop";

function NavigationControls() {
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate("/detalle")}>Ir al detalle</button>
      <button type="button" onClick={() => navigate(-1)}>Regresar</button>
    </>
  );
}

describe("ScrollToTop", () => {
  const scrollToMock = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);

  beforeEach(() => {
    scrollToMock.mockClear();
  });

  afterEach(() => {
    window.history.scrollRestoration = "auto";
  });

  it("sets manual restoration and scrolls to the top after going back", async () => {
    render(
      <MemoryRouter initialEntries={["/inicio"]}>
        <ScrollToTop />
        <NavigationControls />
        <Routes>
          <Route path="/inicio" element={<p>Pantalla inicial</p>} />
          <Route path="/detalle" element={<p>Pantalla detalle</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(window.history.scrollRestoration).toBe("manual");
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });

    fireEvent.click(screen.getByRole("button", { name: "Ir al detalle" }));
    await waitFor(() => expect(screen.getByText("Pantalla detalle")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Regresar" }));
    await waitFor(() => expect(screen.getByText("Pantalla inicial")).toBeInTheDocument());

    expect(scrollToMock).toHaveBeenCalledTimes(3);
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });
  });
});
