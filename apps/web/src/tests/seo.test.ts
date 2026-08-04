import { beforeEach, describe, expect, it } from "vitest";
import { applySeo } from "../lib/seo";

describe("applySeo", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    window.history.replaceState(null, "", "/catalogo");
  });

  it("writes absolute canonical, robots, locale, and social image tags", () => {
    applySeo({
      title: "Catálogo",
      description: "Regalos personalizados en Panamá.",
      path: "/catalogo",
      image: "/brand/artenova-icon-512.png",
      robots: "noindex,follow",
      type: "website",
    });

    expect(document.title).toBe("Catálogo | Artenova");
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3000/catalogo");
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
    expect(document.querySelector('meta[property="og:locale"]')).toHaveAttribute("content", "es_PA");
    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute("content", "http://localhost:3000/brand/artenova-icon-512.png");
  });

  it("replaces managed JSON-LD scripts instead of duplicating them", () => {
    applySeo({
      title: "Producto",
      description: "Detalle personalizado.",
      path: "/producto/placa",
      jsonLd: { "@context": "https://schema.org", "@type": "Product", name: "Placa" },
    });

    applySeo({
      title: "Contacto",
      description: "Contacto Artenova.",
      path: "/contacto",
      jsonLd: { "@context": "https://schema.org", "@type": "LocalBusiness", name: "Artenova" },
    });

    const scripts = document.querySelectorAll('script[type="application/ld+json"][data-artenova-seo="true"]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.textContent).toContain('"@type":"LocalBusiness"');
    expect(scripts[0]?.textContent).not.toContain('"@type":"Product"');
  });
});
