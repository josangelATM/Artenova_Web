import { describe, expect, it } from "vitest";
import { mapGraduationCatalogToSeedData, parseGraduationCatalogPages } from "../lib/graduationCatalog";

const samplePages = [
  `Cátalogo de Graduación
1. Recordatorio de
acrílico esmerilado
Recordatorio de acrílico
esmerilado con foto de
impresión vinil brillante
aprueba de agua, marco
acrílico dorado espejo
tamaño de 12.5 cm de alto x
16.8 cm de ancho
Valor Valor
6 uds 12 uds
B/.39.00 B/.72.00
Valor Valor
18 uds 24 uds
B/.99.00 B/.120.00
2. Reconocimiento en
acrílico transparente
Reconocimiento vertical en
acrílico transparente, con foto
de impresión vinil brillante,
marco acrílico plateado espejo
texto en grabado láser.
Tamaño de 16 cm x 12 cm
Valor Valor
6 uds 12 uds
B/.39.00 B/.72.00
Valor Valor
18 uds 24 uds
B/.99.00 B/.120.00`,
  `3. Recordatorio de
acrílico esmerilado
Recordatorio de acrílico
esmerilado con foto de
impresión vinil brillante
aprueba de agua, marco
acrílico dorado espejo
tamaño de 16 cm de alto x 11.8
cm de ancho, técnica grabado
en láser
Valor Valor
6 uds 12 uds
B/.39.00 B/.72.00
Valor Valor
18 uds 24 uds
B/.99.00 B/.120.00
4. Recordatorio en
madera
Reconocimiento en madera ,
con foto de impresión vinil
brillante, marco de madera
técnica en grabado láser
Tamaño de 12.1 cm de alto x
10.2 cm de ancho
Valor Valor
6 uds 12 uds
B/.27.00 B/.48.00
Valor Valor
18 uds 24 uds
B/.67.50 B/.84.00`,
  `5. Recordatorio de
acrílico pequeño
Recordatorio de acrílico
transparente completamente
grabado en láser
Tamaño de 7.2 cm de alto x
3.1 cm de ancho
Valor Valor
6 uds 12 uds
B/.22.50 B/.42.00
Valor Valor
18 uds 24 uds
B/.58.50 B/.72.00
6. Recordatorio en
acrílico esmerilado
Reconocimiento pequeño en
acrílico Esmerilado, con
foto de impresión vinil
brillante con técnica de
grabado láser
Tamaño de 7 cm de alto x
10 cm de ancho
Valor Valor
6 uds 12 uds
B/.24.00 B/.45.00
Valor Valor
18 uds 24 uds
B/.63.00 B/.78.00`,
  `7. Recordatorio de acrílico
transparente y dorado
Recordatorio de
acrílico transparente
con foto de impresión
vinil brillante aprueba
de agua, marco acrílico
dorado espejo
tamaño de 14 cm de
alto x 11.8 cm de ancho,
con opción de grabado
láser en la base
Valor Valor
6 uds 12 uds
B/.30.00 B/.54.00
Valor Valor
18 uds 24 uds
B/.76.50 B/.96.00
8. Recordatorio de
acrílico dorado
Recordatorio de acrílico
transparente con dorado espejo ,
grabado láser en dorado, silueta,
tamaño de 15 cm x 9 cm
aproximadamente
Valor Valor
6 uds 12 uds
B/.30.00 B/.54.00
Valor Valor
18 uds 24 uds
B/.76.50 B/.96.00`,
];

describe("parseGraduationCatalogPages", () => {
  it("convierte el PDF extraído en un catálogo portable con 8 productos", () => {
    const catalog = parseGraduationCatalogPages(samplePages, "Catálogo de Graduación.pdf");

    expect(catalog.meta.itemCount).toBe(8);
    expect(catalog.products).toHaveLength(8);
    expect(catalog.products[0]).toMatchObject({
      sourceIndex: 1,
      slug: "recordatorio-de-acrilico-esmerilado-1",
      basePrice: 6.5,
    });
    expect(catalog.products[2]).toMatchObject({
      sourceIndex: 3,
      slug: "recordatorio-de-acrilico-esmerilado-3",
    });
    expect(catalog.products[7]?.tiers.map((tier) => tier.minQuantity)).toEqual([6, 12, 18, 24]);
    expect(catalog.products[7]?.tiers.map((tier) => tier.totalPrice)).toEqual([30, 54, 76.5, 96]);
    expect(catalog.products[0]?.description).toContain("a prueba de agua");
    expect(catalog.products[3]?.description).toContain("Tamaño de 12.1 cm de alto x 10.2 cm de ancho");
  });

  it("mapea el catalogo a productos simples compatibles con el seed", () => {
    const catalog = parseGraduationCatalogPages(samplePages, "Catálogo de Graduación.pdf");
    const seedData = mapGraduationCatalogToSeedData(catalog);

    expect(seedData.category).toMatchObject({
      slug: "graduacion",
      isActive: true,
    });
    expect(seedData.products).toHaveLength(8);
    expect(seedData.products[0]).toMatchObject({
      categorySlug: "graduacion",
      featured: false,
      defaultVariantKey: "default",
    });
    expect(seedData.products[0]?.variants[0]?.priceTiers.map((tier) => tier.minQuantity)).toEqual([6, 12, 18, 24]);
  });
});
