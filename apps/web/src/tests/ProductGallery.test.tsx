import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProductGallery, type ProductGalleryItem } from "../components/ProductGallery";

const imageItem = (key: string, url: string, alt: string): ProductGalleryItem => ({
  key,
  media: { id: `${key}-id`, type: "image", url, alt, position: 0, posterUrl: null },
});

const videoItem = (key: string, url: string, alt: string, posterUrl: string | null = null): ProductGalleryItem => ({
  key,
  media: { id: `${key}-id`, type: "video", url, alt, position: 0, posterUrl },
});

describe("ProductGallery", () => {
  afterEach(() => {
    cleanup();
  });

  it("precarga solo el siguiente video navegable cuando el activo no es video", () => {
    render(
      <ProductGallery
        productName="Producto demo"
        items={[
          imageItem("img-1", "/seed/uno.jpg", "Imagen uno"),
          videoItem("video-1", "/seed/demo.mp4", "Video uno"),
          imageItem("img-2", "/seed/dos.jpg", "Imagen dos"),
        ]}
        activeKey="img-1"
        onActiveKeyChange={vi.fn()}
      />,
    );

    const preloader = screen.getByTestId("gallery-video-preloader-video-1");
    expect(preloader).toHaveAttribute("preload", "auto");
    expect(preloader).toHaveAttribute("src", "/seed/demo.mp4");
  });

  it("precarga el siguiente video con busqueda circular cuando el activo esta al final", () => {
    render(
      <ProductGallery
        productName="Producto demo"
        items={[
          videoItem("video-1", "/seed/demo.mp4", "Video uno"),
          imageItem("img-1", "/seed/uno.jpg", "Imagen uno"),
          imageItem("img-2", "/seed/dos.jpg", "Imagen dos"),
        ]}
        activeKey="img-2"
        onActiveKeyChange={vi.fn()}
      />,
    );

    const preloader = screen.getAllByTestId("gallery-video-preloader-video-1").at(-1);
    expect(preloader).toHaveAttribute("src", "/seed/demo.mp4");
  });

  it("muestra un estado visual de video en miniatura cuando no existe poster persistido", () => {
    render(
      <ProductGallery
        productName="Producto demo"
        items={[
          videoItem("video-1", "/seed/demo.mp4", "Video uno"),
          imageItem("img-1", "/seed/uno.jpg", "Imagen uno"),
        ]}
        activeKey="video-1"
        activeThumbnailKey="video-1"
        onActiveKeyChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Video").length).toBeGreaterThan(0);
    const visibleVideo = screen.getAllByLabelText(/video uno/i).find((node) => node.tagName.toLowerCase() === "video");
    expect(visibleVideo).toHaveAttribute("autoplay");
    expect(visibleVideo).toHaveAttribute("preload", "auto");
  });

  it("hace autoplay del video al navegar hacia el dentro del zoom", () => {
    function ControlledGallery() {
      const [activeKey, setActiveKey] = useState("img-1");

      return (
        <ProductGallery
          productName="Producto demo"
          items={[
            imageItem("img-1", "/seed/uno.jpg", "Imagen uno"),
            videoItem("video-1", "/seed/demo.mp4", "Video uno"),
          ]}
          activeKey={activeKey}
          onActiveKeyChange={setActiveKey}
        />
      );
    }

    render(
      <ControlledGallery />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Ampliar imagen" }).at(-1)!);
    fireEvent.click(screen.getAllByRole("button", { name: "Imagen siguiente" }).at(-1)!);

    const viewerVideo = screen.getAllByLabelText(/video uno/i).find((node) => node.tagName.toLowerCase() === "video" && node.hasAttribute("controls"));
    expect(viewerVideo).toBeInTheDocument();
    expect(viewerVideo).toHaveAttribute("preload", "auto");
  });

  it("usa un rail de miniaturas contenido cuando hay muchas imagenes", () => {
    render(
      <ProductGallery
        productName="Producto demo"
        items={Array.from({ length: 8 }, (_, index) => imageItem(`img-${index + 1}`, `/seed/${index + 1}.jpg`, `Imagen ${index + 1}`))}
        activeKey="img-1"
        onActiveKeyChange={vi.fn()}
      />,
    );

    const rail = screen.getByTestId("product-gallery-thumbnails");
    expect(rail).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /ver elemento/i })).toHaveLength(8);
  });

  it("renders the global total when the active group has fewer items than the product total", () => {
    render(
      <ProductGallery
        productName="Producto demo"
        items={[imageItem("img-1", "/seed/uno.jpg", "Imagen uno")]}
        thumbnailItems={[
          imageItem("img-1", "/seed/uno.jpg", "Imagen uno"),
          imageItem("img-2", "/seed/dos.jpg", "Imagen dos"),
        ]}
        activeKey="img-1"
        totalItemsCount={5}
        onActiveKeyChange={vi.fn()}
      />,
    );

    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });
});
