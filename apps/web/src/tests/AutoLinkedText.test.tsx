import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThemeProvider, Typography } from "@mui/material";
import { AutoLinkedText, splitTextWithLinks } from "../components/AutoLinkedText";
import { theme } from "../theme/theme";

function renderText(text: string) {
  return render(
    <ThemeProvider theme={theme}>
      <Typography sx={{ whiteSpace: "pre-wrap" }}>
        <AutoLinkedText text={text} />
      </Typography>
    </ThemeProvider>,
  );
}

describe("splitTextWithLinks", () => {
  it("keeps plain text untouched when there are no urls", () => {
    expect(splitTextWithLinks("Texto simple sin enlaces.")).toEqual([{ type: "text", value: "Texto simple sin enlaces." }]);
  });

  it("parses markdown links before raw urls", () => {
    expect(splitTextWithLinks("Ver [Aqui](https://uno.test) y luego https://dos.test/final.")).toEqual([
      { type: "text", value: "Ver " },
      { type: "link", value: "Aqui", href: "https://uno.test" },
      { type: "text", value: " y luego " },
      { type: "link", value: "https://dos.test/final", href: "https://dos.test/final" },
      { type: "text", value: "." },
    ]);
  });

  it("extracts multiple urls and keeps surrounding punctuation as text", () => {
    expect(splitTextWithLinks("Ver https://uno.test, luego https://dos.test/final.")).toEqual([
      { type: "text", value: "Ver " },
      { type: "link", value: "https://uno.test", href: "https://uno.test" },
      { type: "text", value: "," },
      { type: "text", value: " luego " },
      { type: "link", value: "https://dos.test/final", href: "https://dos.test/final" },
      { type: "text", value: "." },
    ]);
  });

  it("excludes unmatched closing parentheses from the url", () => {
    expect(splitTextWithLinks("Catalogo (https://artenova.test/pieza(1))).")).toEqual([
      { type: "text", value: "Catalogo (" },
      { type: "link", value: "https://artenova.test/pieza(1)", href: "https://artenova.test/pieza(1)" },
      { type: "text", value: "))." },
    ]);
  });

  it("keeps invalid markdown links as plain text", () => {
    expect(splitTextWithLinks("Texto [Aqui](url-invalida) final.")).toEqual([
      { type: "text", value: "Texto [Aqui](url-invalida) final." },
    ]);
  });
});

describe("AutoLinkedText", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a single clickable url", () => {
    renderText("Mira https://artenovapty.com/catalogo.pdf");

    const link = screen.getByRole("link", { name: "https://artenovapty.com/catalogo.pdf" });
    expect(link).toHaveAttribute("href", "https://artenovapty.com/catalogo.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("renders markdown links with friendly text", () => {
    renderText("Catalogo [Aqui](https://artenovapty.com/catalogo.pdf)");

    const link = screen.getByRole("link", { name: "Aqui" });
    expect(link).toHaveAttribute("href", "https://artenovapty.com/catalogo.pdf");
    expect(link).toHaveTextContent("Aqui");
  });

  it("preserves line breaks around linked text", () => {
    renderText("Linea 1\n[Aqui](https://artenova.test)\nLinea 3");

    expect(screen.getByText(/Linea 1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aqui" })).toBeInTheDocument();
    expect(screen.getByText(/Linea 3/)).toBeInTheDocument();
  });

  it("treats html-like content as plain text", () => {
    renderText('<script>alert("x")</script> https://artenova.test');

    expect(screen.getByText('<script>alert("x")</script>', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "https://artenova.test" })).toHaveLength(1);
    expect(document.querySelector("script")).toBeNull();
  });
});
