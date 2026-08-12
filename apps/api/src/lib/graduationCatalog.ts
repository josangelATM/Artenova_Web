import { z } from "zod";

const expectedTierQuantities = [6, 12, 18, 24] as const;

const graduationTierSchema = z.object({
  minQuantity: z.number().int().positive(),
  unitPrice: z.number().positive().finite(),
  totalPrice: z.number().positive().finite(),
  label: z.string().min(1),
});

const graduationProductSchema = z.object({
  sourceIndex: z.number().int().positive(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(2),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  basePrice: z.number().positive().finite(),
  tiers: z.array(graduationTierSchema).length(expectedTierQuantities.length),
});

export const graduationCatalogSchema = z.object({
  category: z.object({
    name: z.string().min(2),
    slug: z.literal("graduacion"),
    description: z.string().min(2),
    isActive: z.boolean(),
  }),
  products: z.array(graduationProductSchema).length(8),
  meta: z.object({
    sourcePdfName: z.string().min(1),
    extractedAt: z.string().datetime(),
    itemCount: z.literal(8),
  }),
});

export type GraduationCatalogFile = z.infer<typeof graduationCatalogSchema>;
export type GraduationCatalogProduct = GraduationCatalogFile["products"][number];
export type GraduationSeedCategory = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
};
export type GraduationSeedProduct = {
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  featured: boolean;
  variants: Array<{
    key: "default";
    name: string;
    basePrice: number;
    priceTiers: GraduationCatalogProduct["tiers"];
  }>;
  defaultVariantKey: "default";
};

type ParsedProductBlock = {
  sourceIndex: number;
  name: string;
  descriptionText: string;
  dimensionsText: string;
  tiers: GraduationCatalogProduct["tiers"];
};

const ocrReplacements: Array<[RegExp, string]> = [
  [/\s+,/g, ","],
  [/\s+\./g, "."],
  [/\s+:/g, ":"],
  [/\s+;/g, ";"],
  [(/\(\s+/g) as RegExp, "("],
  [(/\s+\)/g) as RegExp, ")"],
  [/\baprueba de agua\b/gi, "a prueba de agua"],
  [/\bAproximadamente\b/g, "aproximadamente"],
  [/\bEsmerilado\b/g, "esmerilado"],
  [/\s{2,}/g, " "],
];

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeLine(line: string) {
  let normalized = line
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [pattern, replacement] of ocrReplacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.trim();
}

function normalizeParagraph(text: string) {
  return normalizeLine(text)
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function ensureSentenceEnding(text: string) {
  const normalized = normalizeParagraph(text);
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function sentenceCase(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function joinDescription(descriptionText: string, dimensionsText: string) {
  return `${ensureSentenceEnding(descriptionText)} ${sentenceCase(normalizeParagraph(dimensionsText))}`.trim();
}

function slugify(value: string) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitBlocks(pageText: string) {
  const normalizedPage = pageText.replace(/\r\n/g, "\n").trim();
  return Array.from(normalizedPage.match(/\d+\.\s[\s\S]*?(?=\n\d+\.\s|$)/g) ?? [])
    .map((block) => block.trim())
    .filter(Boolean);
}

function parsePrices(blockText: string, sourceIndex: number) {
  const quantities = Array.from(blockText.matchAll(/(\d+)\s*uds/gi)).map((match) => Number(match[1]));
  const amounts = Array.from(blockText.matchAll(/B\/\.\s*([0-9]+(?:\.[0-9]{2})?)/g)).map((match) => Number(match[1]));

  if (quantities.length !== expectedTierQuantities.length || amounts.length !== expectedTierQuantities.length) {
    throw new Error(`No se pudieron resolver los 4 precios del producto ${sourceIndex}.`);
  }

  expectedTierQuantities.forEach((quantity, index) => {
    if (quantities[index] !== quantity) {
      throw new Error(`Las cantidades del producto ${sourceIndex} no coinciden con 6, 12, 18 y 24.`);
    }
  });

  return quantities.map((quantity, index) => {
    const totalPrice = amounts[index]!;
    return {
      minQuantity: quantity,
      unitPrice: Number((totalPrice / quantity).toFixed(2)),
      totalPrice,
      label: `${quantity} unidades`,
    };
  });
}

function parseProductBlock(block: string): ParsedProductBlock {
  const lines = block
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const firstLine = lines.shift();
  if (!firstLine) {
    throw new Error("Se encontro un bloque vacio en el PDF.");
  }

  const firstLineMatch = firstLine.match(/^(\d+)\.\s*(.+)$/);
  if (!firstLineMatch) {
    throw new Error(`No se pudo leer el encabezado del bloque: ${firstLine}`);
  }

  const sourceIndex = Number(firstLineMatch[1]);
  const titleLines = [firstLineMatch[2]!.trim()];
  if (lines.length < 2) {
    throw new Error(`El producto ${sourceIndex} no tiene suficiente texto para titulo y descripcion.`);
  }
  titleLines.push(lines.shift()!);

  const firstValueIndex = lines.findIndex((line) => /^valor\b/i.test(stripAccents(line).toLowerCase()));
  if (firstValueIndex < 0) {
    throw new Error(`El producto ${sourceIndex} no contiene la seccion de precios.`);
  }

  const contentLines = lines.slice(0, firstValueIndex);
  const priceLines = lines.slice(firstValueIndex);
  const dimensionIndex = contentLines.findIndex((line) => stripAccents(line).toLowerCase().startsWith("tamano"));

  if (dimensionIndex < 0) {
    throw new Error(`El producto ${sourceIndex} no contiene la linea de tamano.`);
  }

  const descriptionLines = contentLines.slice(0, dimensionIndex);
  const dimensionsLines = contentLines.slice(dimensionIndex);

  if (descriptionLines.length === 0) {
    throw new Error(`El producto ${sourceIndex} no contiene descripcion comercial suficiente.`);
  }

  return {
    sourceIndex,
    name: normalizeParagraph(titleLines.join(" ")),
    descriptionText: normalizeParagraph(descriptionLines.join(" ")),
    dimensionsText: normalizeParagraph(dimensionsLines.join(" ")),
    tiers: parsePrices(priceLines.join(" "), sourceIndex),
  };
}

function assignUniqueSlugs(products: ParsedProductBlock[]) {
  const counts = new Map<string, number>();
  for (const product of products) {
    const baseSlug = slugify(product.name);
    counts.set(baseSlug, (counts.get(baseSlug) ?? 0) + 1);
  }

  const used = new Set<string>();
  return products.map((product) => {
    const baseSlug = slugify(product.name);
    let slug = baseSlug;
    if ((counts.get(baseSlug) ?? 0) > 1) {
      slug = `${baseSlug}-${product.sourceIndex}`;
    }
    if (used.has(slug)) {
      throw new Error(`Se produjo un slug duplicado para el producto ${product.sourceIndex}: ${slug}`);
    }
    used.add(slug);
    return slug;
  });
}

export function parseGraduationCatalogPages(pages: string[], sourcePdfName: string): GraduationCatalogFile {
  const parsedBlocks = pages
    .flatMap(splitBlocks)
    .map(parseProductBlock)
    .sort((left, right) => left.sourceIndex - right.sourceIndex);

  if (parsedBlocks.length !== 8) {
    throw new Error(`Se esperaban 8 productos en el PDF, pero se detectaron ${parsedBlocks.length}.`);
  }

  parsedBlocks.forEach((product, index) => {
    const expectedIndex = index + 1;
    if (product.sourceIndex !== expectedIndex) {
      throw new Error(`Se esperaba el producto ${expectedIndex}, pero se detecto ${product.sourceIndex}.`);
    }
  });

  const slugs = assignUniqueSlugs(parsedBlocks);
  const products = parsedBlocks.map((product, index) => ({
    sourceIndex: product.sourceIndex,
    name: product.name,
    slug: slugs[index]!,
    description: joinDescription(product.descriptionText, product.dimensionsText),
    isPublished: true,
    isFeatured: false,
    basePrice: product.tiers[0]!.unitPrice,
    tiers: product.tiers,
  }));

  return graduationCatalogSchema.parse({
    category: {
      name: "Graduacion",
      slug: "graduacion",
      description: "Catalogo de graduacion importado desde PDF.",
      isActive: true,
    },
    products,
    meta: {
      sourcePdfName,
      extractedAt: new Date().toISOString(),
      itemCount: products.length,
    },
  });
}

export function defaultVariantIdForProductSlug(productSlug: string) {
  return `variant-${productSlug}`;
}

export function defaultGraduationCatalogJsonRelativePath() {
  return "../data/catalog-imports/graduacion.catalog.json";
}

export function mapGraduationCatalogToSeedData(catalog: GraduationCatalogFile): {
  category: GraduationSeedCategory;
  products: GraduationSeedProduct[];
} {
  return {
    category: {
      name: catalog.category.name,
      slug: catalog.category.slug,
      description: catalog.category.description,
      isActive: catalog.category.isActive,
    },
    products: catalog.products.map((product) => ({
      categorySlug: catalog.category.slug,
      name: product.name,
      slug: product.slug,
      description: product.description,
      featured: false,
      variants: [
        {
          key: "default",
          name: product.name,
          basePrice: product.basePrice,
          priceTiers: product.tiers,
        },
      ],
      defaultVariantKey: "default",
    })),
  };
}
