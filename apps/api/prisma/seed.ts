import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { graduationCatalogSchema, mapGraduationCatalogToSeedData } from "../src/lib/graduationCatalog";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://artenova:artenova_dev@localhost:5432/artenova?schema=public";
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const uploadDriver = process.env.UPLOAD_DRIVER ?? (process.env.NODE_ENV === "production" ? "s3" : "local");
const s3Endpoint = process.env.S3_ENDPOINT;
const s3Region = process.env.S3_REGION ?? "us-east-1";
const s3Bucket = process.env.S3_BUCKET;
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
const seedAssetsRoot = fileURLToPath(new URL("./seed-assets/", import.meta.url));
const s3 = uploadDriver === "s3" && s3Endpoint && s3Bucket && s3AccessKeyId && s3SecretAccessKey
  ? new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
      },
    })
  : null;

type SeedTier = {
  minQuantity: number;
  unitPrice: number;
  totalPrice?: number | null;
  label?: string | null;
};

type SeedExtra = {
  name: string;
  type: string;
  priceDelta: number;
};

type SeedCustomField = {
  label: string;
  type: "text" | "date" | "select" | "image" | "note";
  required: boolean;
  options: string[];
  helpText?: string | null;
  position: number;
};

type SeedOptionValue = {
  key: string;
  value: string;
  swatch?: string | null;
};

type SeedOption = {
  key: string;
  name: string;
  values: SeedOptionValue[];
};

type SeedVariant = {
  key: string;
  name: string;
  sku?: string | null;
  visualGroupKey?: string;
  basePrice: number;
  discountType?: "percentage" | "fixed" | null;
  discountValue?: number | null;
  isActive?: boolean;
  image?: string;
  imageUrl?: string;
  media?: Array<{
    type: "image" | "video";
    sourcePath: string;
    url?: string;
    alt?: string;
    position?: number;
  }>;
  optionValueKeys?: string[];
  priceTiers?: SeedTier[];
};

type SeedMediaSource = {
  type: "image" | "video";
  sourcePath: string;
  alt: string;
  position: number;
};

type SeedProduct = {
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  featured: boolean;
  isHero?: boolean;
  heroSlot?: "primary" | "secondary" | null;
  extras?: SeedExtra[];
  customFields?: SeedCustomField[];
  options?: SeedOption[];
  variants: SeedVariant[];
  defaultVariantKey?: string;
};

type SeedCategory = {
  name: string;
  slug: string;
  description: string;
  accentColor?: string;
  currencySymbol?: string;
  isActive?: boolean;
};

type SeedResolvedMedia = {
  type: "image" | "video";
  url: string;
  alt: string;
  position: number;
  posterUrl: string | null;
};

type SeedResolvedMediaCollections = {
  productMediaBySlug: Map<string, SeedResolvedMedia[]>;
  variantMediaById: Map<string, SeedResolvedMedia[]>;
};

function assertSeedS3Config() {
  const missing: string[] = [];
  if (uploadDriver !== "s3") missing.push("UPLOAD_DRIVER=s3");
  if (!s3Endpoint) missing.push("S3_ENDPOINT");
  if (!s3Bucket) missing.push("S3_BUCKET");
  if (!s3AccessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!s3SecretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (!s3PublicBaseUrl) missing.push("S3_PUBLIC_BASE_URL");

  if (missing.length > 0 || !s3) {
    throw new Error(`El seed comercial requiere S3 real. Configuración faltante: ${missing.join(", ")}`);
  }
}

function sanitizeObjectSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function contentTypeForExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    default:
      throw new Error(`Tipo de archivo no soportado para seed: ${extension}`);
  }
}

function resolveSeedAssetPath(sourcePath: string) {
  const normalized = sourcePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const relative = normalized.startsWith("seed/") ? normalized.slice("seed/".length) : normalized;
  return path.resolve(seedAssetsRoot, relative);
}

function mediaSourcesForVariant(product: SeedProduct, variant: SeedVariant) {
  if (variant.media && variant.media.length > 0) {
    return variant.media.map((item, index) => ({
      type: item.type,
      sourcePath: item.sourcePath,
      alt: item.alt ?? product.name,
      position: item.position ?? index,
    }));
  }

  if (variant.image) {
    return [
      {
        type: "image" as const,
        sourcePath: variant.image,
        alt: product.name,
        position: 0,
      },
    ];
  }

  return [];
}

function mediaSourceSignature(media: SeedMediaSource) {
  return JSON.stringify([media.type, media.sourcePath, media.alt, media.position]);
}

function sharedMediaSources(variantMediaCollections: SeedMediaSource[][]) {
  if (variantMediaCollections.length === 0) return [];

  const orderedSignatures = variantMediaCollections[0]!.map((media) => mediaSourceSignature(media));
  const sharedSignatures = new Set(orderedSignatures);

  for (const mediaCollection of variantMediaCollections.slice(1)) {
    const nextSignatures = new Set(mediaCollection.map((media) => mediaSourceSignature(media)));
    for (const signature of Array.from(sharedSignatures)) {
      if (!nextSignatures.has(signature)) {
        sharedSignatures.delete(signature);
      }
    }
  }

  return variantMediaCollections[0]!.filter((media) => sharedSignatures.has(mediaSourceSignature(media)));
}

async function uploadSeedObject(objectKey: string, buffer: Buffer, contentType: string) {
  assertSeedS3Config();
  await s3!.send(
    new PutObjectCommand({
      Bucket: s3Bucket!,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${s3PublicBaseUrl!}/${objectKey}`;
}

async function uploadSeedAsset(
  productSlug: string,
  sourcePath: string,
) {
  const localPath = resolveSeedAssetPath(sourcePath);
  const buffer = await readFile(localPath).catch((error) => {
    throw new Error(`No se encontró el asset seed "${sourcePath}" para ${productSlug}: ${String(error)}`);
  });

  const parsed = path.parse(localPath);
  const safeProductSlug = sanitizeObjectSegment(productSlug);
  const safeName = sanitizeObjectSegment(parsed.name) || "asset";

  const extension = parsed.ext.toLowerCase();
  const normalizedFileName = `${safeName}${extension}`;
  const objectKey = `products/${safeProductSlug}/${normalizedFileName}`;
  const url = await uploadSeedObject(objectKey, buffer, contentTypeForExtension(extension));
  return { objectKey, url };
}

async function resolveSeedMediaCollection(
  productSlug: string,
  mediaSources: SeedMediaSource[],
  uploadCache: Map<string, { url: string }>,
) {
  const resolvedMedia: SeedResolvedMedia[] = [];

  for (const media of mediaSources) {
    const assetCacheKey = `${productSlug}|media|${media.sourcePath}`;
    const uploadedMedia = uploadCache.get(assetCacheKey)
      ?? { url: (await uploadSeedAsset(productSlug, media.sourcePath)).url };
    uploadCache.set(assetCacheKey, uploadedMedia);

    resolvedMedia.push({
      type: media.type,
      url: uploadedMedia.url,
      alt: media.alt,
      position: media.position,
      posterUrl: null,
    });
  }

  return resolvedMedia;
}

async function syncSeedMedia(products: SeedProduct[]) {
  const variantMediaSources = products.map((product) =>
    product.variants.map((variant) => ({
      variantId: variantId(product.slug, variant.key),
      mediaSources: mediaSourcesForVariant(product, variant),
    }))
  );

  const hasMediaSources = variantMediaSources.some((productVariants) =>
    productVariants.some((variant) => variant.mediaSources.length > 0)
  );

  if (!hasMediaSources) {
    return {
      productMediaBySlug: new Map<string, SeedResolvedMedia[]>(),
      variantMediaById: new Map<string, SeedResolvedMedia[]>(),
    } satisfies SeedResolvedMediaCollections;
  }

  assertSeedS3Config();

  const uploadCache = new Map<string, { url: string }>();
  const productMediaBySlug = new Map<string, SeedResolvedMedia[]>();
  const variantMediaById = new Map<string, SeedResolvedMedia[]>();

  for (const [productIndex, product] of products.entries()) {
    const productVariantMediaSources = variantMediaSources[productIndex] ?? [];
    const variantMediaSourcesForProduct = productVariantMediaSources.map((variant) => ({
      variantId: variantId(product.slug, variant.key),
      mediaSources: variant.mediaSources,
    }));
    const sharedSources = sharedMediaSources(
      variantMediaSourcesForProduct.map((variant) => variant.mediaSources),
    );
    const sharedSignatures = new Set(sharedSources.map((media) => mediaSourceSignature(media)));

    productMediaBySlug.set(
      product.slug,
      await resolveSeedMediaCollection(product.slug, sharedSources, uploadCache),
    );

    for (const variant of variantMediaSourcesForProduct) {
      const residualSources = variant.mediaSources.filter(
        (media) => !sharedSignatures.has(mediaSourceSignature(media)),
      );
      variantMediaById.set(
        variant.variantId,
        await resolveSeedMediaCollection(product.slug, residualSources, uploadCache),
      );
    }
  }

  return {
    productMediaBySlug,
    variantMediaById,
  } satisfies SeedResolvedMediaCollections;
}

const escudoTamanos: SeedOption = {
  key: "tamano",
  name: "Tamaño",
  values: [
    { key: "17-5cm", value: "17.5 cm" },
    { key: "10cm", value: "10 cm" },
    { key: "6-8cm", value: "6.8 cm" },
  ],
};

const weddingFields: SeedCustomField[] = [
  {
    label: "Nombres",
    type: "text",
    required: true,
    options: [],
    helpText: "Ejemplo: Max & Milagros",
    position: 0,
  },
  {
    label: "Fecha del evento",
    type: "date",
    required: true,
    options: [],
    helpText: "Fecha que irá grabada",
    position: 1,
  },
  {
    label: "Texto o dedicatoria",
    type: "note",
    required: false,
    options: [],
    helpText: "Mensaje corto si aplica",
    position: 2,
  },
];

const petFields: SeedCustomField[] = [
  {
    label: "Nombre de la mascota",
    type: "text",
    required: true,
    options: [],
    helpText: "Nombre que irá grabado",
    position: 0,
  },
  {
    label: "Foto de referencia",
    type: "image",
    required: false,
    options: [],
    helpText: "Compártela por WhatsApp al coordinar el pedido",
    position: 1,
  },
  {
    label: "Detalle especial",
    type: "note",
    required: false,
    options: [],
    helpText: "Color, frase o indicación importante",
    position: 2,
  },
];

/* const petIdFields: SeedCustomField[] = [
  {
    label: "Nombre de la mascota",
    type: "text",
    required: true,
    options: [],
    helpText: "Nombre que irá en la cédula",
    position: 0,
  },
  {
    label: "Fecha de nacimiento",
    type: "date",
    required: false,
    options: [],
    helpText: "Opcional",
    position: 1,
  },
  {
    label: "Especie",
    type: "text",
    required: false,
    options: [],
    helpText: "Ejemplo: canino o felino",
    position: 2,
  },
  {
    label: "Raza",
    type: "text",
    required: false,
    options: [],
    helpText: "Opcional",
    position: 3,
  },
  {
    label: "Sexo",
    type: "select",
    required: false,
    options: ["Macho", "Hembra"],
    helpText: "Opcional",
    position: 4,
  },
  {
    label: "Teléfono de contacto",
    type: "text",
    required: true,
    options: [],
    helpText: "Número que aparecerá en la cédula",
    position: 5,
  },
  {
    label: "Foto de la mascota",
    type: "image",
    required: false,
    options: [],
    helpText: "Comparte la foto de referencia al coordinar el pedido",
    position: 6,
  },
  {
    label: "Tamaño",
    type: "select",
    required: true,
    options: ["Grande", "Mediana", "Pequeña"],
    helpText: "Elige el tamaño de la cédula",
    position: 7,
  },
];

const petIdTiers: SeedTier[] = [
  { minQuantity: 1, unitPrice: 10, totalPrice: 10, label: "1 unidad - $10.00" },
  { minQuantity: 2, unitPrice: 9, totalPrice: 18, label: "2 unidades - $18.00" },
  { minQuantity: 3, unitPrice: 7.67, totalPrice: 23, label: "3 unidades - $23.00" },
  { minQuantity: 4, unitPrice: 7, totalPrice: 28, label: "4 unidades - $28.00" },
  { minQuantity: 5, unitPrice: 6.8, totalPrice: 34, label: "5 unidades - $34.00" },
  { minQuantity: 6, unitPrice: 6.33, totalPrice: 38, label: "6 unidades - $38.00" },
];

];
*/

const petIdFields: SeedCustomField[] = [
  {
    label: "Nombre",
    type: "text",
    required: true,
    options: [],
    helpText: "Nombre que ira en la cedula",
    position: 0,
  },
  {
    label: "Fecha de Nacimiento",
    type: "date",
    required: false,
    options: [],
    helpText: "Opcional",
    position: 1,
  },
  {
    label: "Especie",
    type: "text",
    required: false,
    options: [],
    helpText: "Ejemplo: canino o felino",
    position: 2,
  },
  {
    label: "Raza",
    type: "text",
    required: false,
    options: [],
    helpText: "Opcional",
    position: 3,
  },
  {
    label: "Sexo",
    type: "select",
    required: false,
    options: ["Macho", "Hembra"],
    helpText: "Opcional",
    position: 4,
  },
  {
    label: "Celular",
    type: "text",
    required: true,
    options: [],
    helpText: "Numero que aparecera en la cedula",
    position: 5,
  },
];

const petIdTiers: SeedTier[] = [
  { minQuantity: 1, unitPrice: 10, totalPrice: 10, label: "1 unidad - $10.00" },
  { minQuantity: 2, unitPrice: 9, totalPrice: 18, label: "2 unidades - $18.00" },
  { minQuantity: 3, unitPrice: 7.67, totalPrice: 23, label: "3 unidades - $23.00" },
  { minQuantity: 4, unitPrice: 7, totalPrice: 28, label: "4 unidades - $28.00" },
  { minQuantity: 5, unitPrice: 6.8, totalPrice: 34, label: "5 unidades - $34.00" },
  { minQuantity: 6, unitPrice: 6.33, totalPrice: 38, label: "6 unidades - $38.00" },
];

const petIdFieldsV2: SeedCustomField[] = [
  { label: "Nombre", type: "text", required: true, options: [], helpText: "Nombre que ira en la cedula", position: 0 },
  { label: "Fecha de Nacimiento", type: "date", required: false, options: [], helpText: "Opcional", position: 1 },
  { label: "Especie", type: "text", required: false, options: [], helpText: "Ejemplo: canino o felino", position: 2 },
  { label: "Raza", type: "text", required: false, options: [], helpText: "Opcional", position: 3 },
  { label: "Sexo", type: "select", required: false, options: ["Macho", "Hembra"], helpText: "Opcional", position: 4 },
  { label: "Celular", type: "text", required: true, options: [], helpText: "Numero que aparecera en la cedula", position: 5 },
];

const petIdColorValues: SeedOptionValue[] = [
  { key: "fucsia", value: "Fucsia", swatch: "#d81b60" },
  { key: "azul", value: "Azul", swatch: "#1e88e5" },
  { key: "negro", value: "Negro", swatch: "#212121" },
  { key: "rojo", value: "Rojo", swatch: "#e53935" },
  { key: "verde", value: "Verde", swatch: "#43a047" },
];

const petIdSizeValues: SeedOptionValue[] = [
  { key: "grande", value: "Grande - 2 x 1.42 in / 5.08 x 3.61 cm" },
  { key: "mediana", value: "Mediana - 1.7 x 1.23 in / 4.32 x 3.14 cm" },
  { key: "pequena", value: "Pequena - 1.2 x 1.11 in / 3.81 x 2.83 cm" },
];

function buildPetIdVariantsV2(): SeedVariant[] {
  const sizeMeta = [
    { key: "grande", name: "Grande", skuSuffix: "G" },
    { key: "mediana", name: "Mediana", skuSuffix: "M" },
    { key: "pequena", name: "Pequena", skuSuffix: "P" },
  ] as const;
  const colorMeta = [
    { key: "fucsia", name: "Fucsia", skuSuffix: "FUC" },
    { key: "azul", name: "Azul", skuSuffix: "AZU" },
    { key: "negro", name: "Negro", skuSuffix: "NEG" },
    { key: "rojo", name: "Rojo", skuSuffix: "ROJ" },
    { key: "verde", name: "Verde", skuSuffix: "VER" },
  ] as const;

  return sizeMeta.flatMap((size) =>
    colorMeta.map((color) => ({
      key: `${size.key}-${color.key}`,
      name: `${size.name} / ${color.name}`,
      sku: `PET-ID-${size.skuSuffix}-${color.skuSuffix}`,
      visualGroupKey: color.key,
      basePrice: 10,
      optionValueKeys: [`tamano:${size.key}`, `color:${color.key}`],
      priceTiers: petIdTiers,
    })),
  );
}

const weddingTiersMdf: SeedTier[] = [
  { minQuantity: 6, unitPrice: 4.5, label: "6 unidades - $27.00" },
  { minQuantity: 12, unitPrice: 4, label: "12 unidades - $48.00" },
  { minQuantity: 18, unitPrice: 4, label: "18 unidades - $72.00" },
  { minQuantity: 24, unitPrice: 4, label: "24 unidades - $96.00" },
];

const weddingTiersAcrylic: SeedTier[] = [
  { minQuantity: 6, unitPrice: 5, label: "6 unidades - $30.00" },
  { minQuantity: 12, unitPrice: 4.5, label: "12 unidades - $54.00" },
  { minQuantity: 18, unitPrice: 4, label: "18 unidades - $72.00" },
  { minQuantity: 24, unitPrice: 4, label: "24 unidades - $96.00" },
];

const baseCategories: SeedCategory[] = [
  {
    name: "Mascotas",
    slug: "mascotas",
    description: "Retratos, huellas, llaveros y recuerdos para tu mejor compañía.",
    accentColor: "#b982d9",
  },
  {
    name: "Bodas",
    slug: "bodas",
    description: "Recordatorios personalizados para celebrar y agradecer.",
    accentColor: "#f07086",
  },
  {
    name: "Recordatorios memoriales",
    slug: "recordatorios-memoriales",
    description:
      "Línea de homenajes personalizados en acrílico, madera o cartón comprimido para conmemorar y honrar la memoria de un ser querido.",
    accentColor: "#c8ab8b",
  },
  {
    name: "Deportes",
    slug: "deportes",
    description:
      "Escudos decorativos y personalizados de clubes y selecciones para exhibir con presencia y detalle.",
    accentColor: "#1f4c8f",
    currencySymbol: "$",
  },
];

const baseProducts: SeedProduct[] = [
  {
    categorySlug: "mascotas",
    name: "Cedulas personalizadas para mascotas",
    slug: "cedulas-personalizadas-mascotas",
    description:
      "Cedulas de identificacion personalizadas para mascotas, resistentes al agua, con acabado brillante y capa de resina para mayor durabilidad. Disponibles en tamano Grande, Mediana y Pequena, con variantes por color fucsia, azul, negro, rojo y verde.",
    featured: true,
    isHero: true,
    heroSlot: "primary",
    customFields: petIdFieldsV2,
    extras: [{ name: "QR trasero", type: "personalizacion", priceDelta: 2 }],
    options: [
      { key: "tamano", name: "Tamano", values: petIdSizeValues },
      { key: "color", name: "Color", values: petIdColorValues },
    ],
    variants: buildPetIdVariantsV2(),
    defaultVariantKey: "grande-fucsia",
  },
  {
    categorySlug: "mascotas",
    name: "Cédulas personalizadas para mascotas",
    slug: "cedulas-personalizadas-mascotas",
    description:
      "Cédulas de identificación personalizadas para mascotas, resistentes al agua, con acabado brillante y capa de resina para mayor durabilidad.",
    featured: true,
    isHero: true,
    heroSlot: "primary",
    customFields: petIdFields,
    extras: [{ name: "QR trasero", type: "personalización", priceDelta: 2 }],
    variants: [
      {
        key: "default",
        name: "Cédulas personalizadas para mascotas",
        sku: "PET-ID-001",
        basePrice: 10,
        priceTiers: petIdTiers,
      },
    ],
    defaultVariantKey: "default",
  },
  {
    categorySlug: "mascotas",
    name: "Retrato grabado en láser en MDF",
    slug: "retrato-grabado-mdf",
    description:
      "Retrato personalizado con la foto de tu mascota, ideal para regalar o decorar un espacio especial.",
    featured: true,
    customFields: petFields,
    variants: [
      {
        key: "default",
        name: "Retrato grabado en láser en MDF",
        sku: "PET-RET-001",
        basePrice: 16,
      },
    ],
    defaultVariantKey: "default",
  },
  {
    categorySlug: "mascotas",
    name: "Retrato mediano grabado en MDF",
    slug: "retrato-mediano-grabado-mdf",
    description: "Formato mediano para conservar un recuerdo personalizado de tu mascota.",
    featured: false,
    customFields: petFields,
    variants: [
      {
        key: "default",
        name: "Retrato mediano grabado en MDF",
        sku: "PET-RET-002",
        basePrice: 13,
      },
    ],
    defaultVariantKey: "default",
  },
  {
    categorySlug: "mascotas",
    name: "Huellas que jamás se olvidan",
    slug: "huellas-que-jamas-se-olvidan",
    description: "Marco decorativo con fotos para honrar y guardar un recuerdo especial.",
    featured: true,
    customFields: petFields,
    variants: [
      {
        key: "default",
        name: "Huellas que jamás se olvidan",
        sku: "PET-RET-003",
        basePrice: 18,
      },
    ],
    defaultVariantKey: "default",
  },
  {
    categorySlug: "mascotas",
    name: "Huella de amor",
    slug: "huella-de-amor",
    description: "Marco decorativo personalizado con fotos de tu mascota.",
    featured: false,
    customFields: petFields,
    variants: [
      {
        key: "default",
        name: "Huella de amor",
        sku: "PET-RET-004",
        basePrice: 15,
      },
    ],
    defaultVariantKey: "default",
  },
  {
    categorySlug: "mascotas",
    name: "Recuerdo en acrílico transparente",
    slug: "recuerdo-acrilico-transparente",
    description: "Pieza acrílica con foto personalizada y mensaje conmemorativo.",
    featured: false,
    customFields: petFields,
    variants: [
      {
        key: "default",
        name: "Recuerdo en acrílico transparente",
        sku: "PET-RET-005",
        basePrice: 16,
      },
    ],
    defaultVariantKey: "default",
  },
  {
    categorySlug: "mascotas",
    name: "Llavero personalizado en acrílico dorado espejo",
    slug: "llavero-personalizado-acrilico-dorado",
    description: "Detalle pequeño para llevar siempre a tu mascota contigo.",
    featured: false,
    customFields: petFields,
    variants: [
      {
        key: "default",
        name: "Llavero personalizado en acrílico dorado espejo",
        sku: "PET-KEY-001",
        basePrice: 6,
      },
    ],
    defaultVariantKey: "default",
  },
  {
    categorySlug: "mascotas",
    name: "Portallaves personalizado",
    slug: "portallaves-personalizado",
    description: "Portallaves con forma de huella y nombre de tu mascota.",
    featured: true,
    customFields: petFields,
    variants: [
      {
        key: "default",
        name: "Portallaves personalizado",
        sku: "PET-HOME-001",
        basePrice: 20,
      },
    ],
    defaultVariantKey: "default",
  },
  ...[
    [
      "recordatorio-bodas-carton-comprimido-arco",
      "Recordatorio de bodas arco floral",
      weddingTiersMdf,
      4.5,
    ],
    [
      "recordatorio-bodas-acrilico-negro-dorado",
      "Recordatorio acrílico negro con dorado espejo",
      weddingTiersAcrylic,
      5,
    ],
    [
      "recordatorio-bodas-carton-marco",
      "Recordatorio de bodas marco ornamental",
      weddingTiersMdf,
      4.5,
    ],
    [
      "recordatorio-bodas-acrilico-blanco",
      "Recordatorio de bodas acrílico blanco",
      weddingTiersAcrylic,
      5,
    ],
    [
      "recordatorio-bodas-mdf-corazon",
      "Recordatorio de bodas corazón MDF",
      weddingTiersMdf,
      4.5,
    ],
    [
      "recordatorio-bodas-puzzle",
      "Recordatorio de bodas pieza faltante",
      weddingTiersAcrylic,
      5,
    ],
    [
      "recordatorio-bodas-corazon-negro",
      "Recordatorio de bodas corazón negro",
      weddingTiersAcrylic,
      5,
    ],
    [
      "recordatorio-bodas-tarjeta-acrilica",
      "Recordatorio de bodas tarjeta floral",
      weddingTiersAcrylic,
      5,
    ],
  ].map(([slug, name, tiers, basePrice], index) => ({
    categorySlug: "bodas",
    name: name as string,
    slug: slug as string,
    description:
      "Recordatorio personalizado para bodas con nombres, fecha y detalles grabados.",
    featured: index < 2,
    isHero: slug === "recordatorio-bodas-acrilico-negro-dorado",
    heroSlot: slug === "recordatorio-bodas-acrilico-negro-dorado" ? "secondary" : null,
    customFields: weddingFields,
    variants: [
      {
        key: "default",
        name: name as string,
        sku: `BOD-${String(index + 1).padStart(3, "0")}`,
        basePrice: basePrice as number,
        priceTiers: tiers as SeedTier[],
      },
    ],
    defaultVariantKey: "default",
  })),
  {
    categorySlug: "recordatorios-memoriales",
    name: "Siempre en nuestros corazones",
    slug: "siempre-en-nuestros-corazones",
    description:
      "Recordatorio conmemorativo en acrílico blanco con negro. Personalizable con nombre, fechas, fotografía y mensaje conmemorativo. Vela opcional; vela adicional B/. 0.60 por unidad.",
    featured: true,
    options: [
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "10cm", value: "10 cm" },
          { key: "13cm", value: "13 cm" },
          { key: "15cm", value: "15 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "10cm",
        name: "10 cm",
        sku: "MEM-SNC-10",
        visualGroupKey: "principal",
        basePrice: 3,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "13cm",
        name: "13 cm",
        sku: "MEM-SNC-13",
        visualGroupKey: "principal",
        basePrice: 4,
        optionValueKeys: ["tamano:13cm"],
      },
      {
        key: "15cm",
        name: "15 cm",
        sku: "MEM-SNC-15",
        visualGroupKey: "principal",
        basePrice: 5,
        optionValueKeys: ["tamano:15cm"],
      },
    ],
    defaultVariantKey: "13cm",
  },
  {
    categorySlug: "recordatorios-memoriales",
    name: "Memorial ovalado",
    slug: "memorial-ovalado",
    description:
      "Homenaje personalizado en acrílico blanco y acrílico dorado espejo. Personalizable con nombre, fechas, fotografía y mensaje conmemorativo.",
    featured: true,
    options: [
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "10cm", value: "10 cm" },
          { key: "13cm", value: "13 cm" },
          { key: "15cm", value: "15 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "10cm",
        name: "10 cm",
        sku: "MEM-OVA-10",
        visualGroupKey: "principal",
        basePrice: 3,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "13cm",
        name: "13 cm",
        sku: "MEM-OVA-13",
        visualGroupKey: "principal",
        basePrice: 4,
        optionValueKeys: ["tamano:13cm"],
      },
      {
        key: "15cm",
        name: "15 cm",
        sku: "MEM-OVA-15",
        visualGroupKey: "principal",
        basePrice: 5,
        optionValueKeys: ["tamano:15cm"],
      },
    ],
    defaultVariantKey: "13cm",
  },
  {
    categorySlug: "recordatorios-memoriales",
    name: "Memorial de oración",
    slug: "memorial-de-oracion",
    description:
      "Recordatorio espiritual en acrílico transparente con base de madera. Personalizable con nombre, fechas y mensaje conmemorativo.",
    featured: false,
    options: [
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "10cm", value: "10 cm" },
          { key: "13cm", value: "13 cm" },
          { key: "15cm", value: "15 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "10cm",
        name: "10 cm",
        sku: "MEM-ORA-10",
        visualGroupKey: "principal",
        basePrice: 3,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "13cm",
        name: "13 cm",
        sku: "MEM-ORA-13",
        visualGroupKey: "principal",
        basePrice: 4,
        optionValueKeys: ["tamano:13cm"],
      },
      {
        key: "15cm",
        name: "15 cm",
        sku: "MEM-ORA-15",
        visualGroupKey: "principal",
        basePrice: 5,
        optionValueKeys: ["tamano:15cm"],
      },
    ],
    defaultVariantKey: "13cm",
  },
  {
    categorySlug: "recordatorios-memoriales",
    name: "Memorial corazón",
    slug: "memorial-corazon",
    description:
      "Placa conmemorativa en forma de corazón en acrílico transparente. Personalizable con nombre, fechas, fotografía y mensaje conmemorativo.",
    featured: true,
    options: [
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "10cm", value: "10 cm" },
          { key: "13cm", value: "13 cm" },
          { key: "15cm", value: "15 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "10cm",
        name: "10 cm",
        sku: "MEM-COR-10",
        visualGroupKey: "principal",
        basePrice: 3,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "13cm",
        name: "13 cm",
        sku: "MEM-COR-13",
        visualGroupKey: "principal",
        basePrice: 4,
        optionValueKeys: ["tamano:13cm"],
      },
      {
        key: "15cm",
        name: "15 cm",
        sku: "MEM-COR-15",
        visualGroupKey: "principal",
        basePrice: 5,
        optionValueKeys: ["tamano:15cm"],
      },
    ],
    defaultVariantKey: "13cm",
  },
  {
    categorySlug: "recordatorios-memoriales",
    name: "Jesús Nazareno",
    slug: "jesus-nazareno",
    description:
      "Diseño conmemorativo de Jesús Nazareno en cartón comprimido. Personalizable con nombre, fechas y dedicatoria breve.",
    featured: false,
    options: [
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "10cm", value: "10 cm" },
          { key: "15cm", value: "15 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "10cm",
        name: "10 cm",
        sku: "MEM-JN-10",
        visualGroupKey: "principal",
        basePrice: 2.5,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "15cm",
        name: "15 cm",
        sku: "MEM-JN-15",
        visualGroupKey: "principal",
        basePrice: 4,
        optionValueKeys: ["tamano:15cm"],
      },
    ],
    defaultVariantKey: "15cm",
  },
  {
    categorySlug: "recordatorios-memoriales",
    name: "Memorial rectángulo",
    slug: "memorial-rectangulo",
    description:
      "Placa memorial rectangular en acrílico transparente. Personalizable con nombre, fechas, fotografía o imagen devocional y mensaje conmemorativo.",
    featured: false,
    options: [
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "10cm", value: "10 cm" },
          { key: "13cm", value: "13 cm" },
          { key: "15cm", value: "15 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "10cm",
        name: "10 cm",
        sku: "MEM-REC-10",
        visualGroupKey: "principal",
        basePrice: 3,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "13cm",
        name: "13 cm",
        sku: "MEM-REC-13",
        visualGroupKey: "principal",
        basePrice: 4,
        optionValueKeys: ["tamano:13cm"],
      },
      {
        key: "15cm",
        name: "15 cm",
        sku: "MEM-REC-15",
        visualGroupKey: "principal",
        basePrice: 5,
        optionValueKeys: ["tamano:15cm"],
      },
    ],
    defaultVariantKey: "13cm",
  },
  {
    categorySlug: "recordatorios-memoriales",
    name: "Cruz memorial",
    slug: "cruz-memorial",
    description:
      "Cruz conmemorativa personalizable con material y tamaño. Personalizable con nombre, fotografía y mensaje conmemorativo. Incluye vela sin costo adicional.",
    featured: true,
    options: [
      {
        key: "material",
        name: "Material",
        values: [
          { key: "acrilico-blanco", value: "Acrílico blanco" },
          { key: "carton-comprimido", value: "Cartón comprimido" },
        ],
      },
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "12cm", value: "12 cm" },
          { key: "15cm", value: "15 cm" },
          { key: "18cm", value: "18 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "acrilico-12cm",
        name: "Acrílico blanco / 12 cm",
        sku: "MEM-CRU-A-12",
        visualGroupKey: "acrilico-blanco",
        basePrice: 4,
        optionValueKeys: ["material:acrilico-blanco", "tamano:12cm"],
      },
      {
        key: "acrilico-15cm",
        name: "Acrílico blanco / 15 cm",
        sku: "MEM-CRU-A-15",
        visualGroupKey: "acrilico-blanco",
        basePrice: 6,
        optionValueKeys: ["material:acrilico-blanco", "tamano:15cm"],
      },
      {
        key: "acrilico-18cm",
        name: "Acrílico blanco / 18 cm",
        sku: "MEM-CRU-A-18",
        visualGroupKey: "acrilico-blanco",
        basePrice: 8,
        optionValueKeys: ["material:acrilico-blanco", "tamano:18cm"],
      },
      {
        key: "carton-12cm",
        name: "Cartón comprimido / 12 cm",
        sku: "MEM-CRU-C-12",
        visualGroupKey: "carton-comprimido",
        basePrice: 2.5,
        optionValueKeys: ["material:carton-comprimido", "tamano:12cm"],
      },
      {
        key: "carton-15cm",
        name: "Cartón comprimido / 15 cm",
        sku: "MEM-CRU-C-15",
        visualGroupKey: "carton-comprimido",
        basePrice: 4.5,
        optionValueKeys: ["material:carton-comprimido", "tamano:15cm"],
      },
      {
        key: "carton-18cm",
        name: "Cartón comprimido / 18 cm",
        sku: "MEM-CRU-C-18",
        visualGroupKey: "carton-comprimido",
        basePrice: 6.5,
        optionValueKeys: ["material:carton-comprimido", "tamano:18cm"],
      },
    ],
    defaultVariantKey: "acrilico-15cm",
  },
  {
    categorySlug: "recordatorios-memoriales",
    name: "Cruces memoriales",
    slug: "cruces-memoriales",
    description:
      "Diseño de cruces memoriales en cartón comprimido. Personalizable con nombre, fechas y dedicatoria conmemorativa.",
    featured: false,
    options: [
      {
        key: "tamano",
        name: "Tamaño",
        values: [
          { key: "10cm", value: "10 cm" },
          { key: "15cm", value: "15 cm" },
        ],
      },
    ],
    variants: [
      {
        key: "10cm",
        name: "10 cm",
        sku: "MEM-CRM-10",
        visualGroupKey: "principal",
        basePrice: 2.5,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "15cm",
        name: "15 cm",
        sku: "MEM-CRM-15",
        visualGroupKey: "principal",
        basePrice: 4,
        optionValueKeys: ["tamano:15cm"],
      },
    ],
    defaultVariantKey: "15cm",
  },
  {
    categorySlug: "deportes",
    name: "Escudo Arsenal",
    slug: "escudo-arsenal",
    description:
      "Escudo decorativo del Arsenal con acabado protagonista para exhibir en escritorio, repisa o vitrina.",
    featured: true,
    options: [escudoTamanos],
    variants: [
      {
        key: "17-5cm",
        name: "17.5 cm",
        sku: "DEP-ARS-175",
        visualGroupKey: "principal",
        basePrice: 30,
        optionValueKeys: ["tamano:17-5cm"],
      },
      {
        key: "10cm",
        name: "10 cm",
        sku: "DEP-ARS-100",
        visualGroupKey: "principal",
        basePrice: 14,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "6-8cm",
        name: "6.8 cm",
        sku: "DEP-ARS-068",
        visualGroupKey: "principal",
        basePrice: 8,
        optionValueKeys: ["tamano:6-8cm"],
      },
    ],
    defaultVariantKey: "10cm",
  },
  {
    categorySlug: "deportes",
    name: "Escudo Barcelona",
    slug: "escudo-barcelona",
    description:
      "Escudo decorativo del Barcelona para fans que quieren una pieza limpia, vistosa y lista para exhibir.",
    featured: true,
    options: [escudoTamanos],
    variants: [
      {
        key: "17-5cm",
        name: "17.5 cm",
        sku: "DEP-BAR-175",
        visualGroupKey: "principal",
        basePrice: 30,
        optionValueKeys: ["tamano:17-5cm"],
      },
      {
        key: "10cm",
        name: "10 cm",
        sku: "DEP-BAR-100",
        visualGroupKey: "principal",
        basePrice: 14,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "6-8cm",
        name: "6.8 cm",
        sku: "DEP-BAR-068",
        visualGroupKey: "principal",
        basePrice: 8,
        optionValueKeys: ["tamano:6-8cm"],
      },
    ],
    defaultVariantKey: "10cm",
  },
  {
    categorySlug: "deportes",
    name: "Escudo Yankees",
    slug: "escudo-yankees",
    description:
      "Emblema decorativo de los Yankees con acabado espejo para escritorio, repisa o vitrina.",
    featured: true,
    options: [escudoTamanos],
    variants: [
      {
        key: "17-5cm",
        name: "17.5 cm",
        sku: "DEP-YAN-175",
        visualGroupKey: "principal",
        basePrice: 30,
        optionValueKeys: ["tamano:17-5cm"],
      },
      {
        key: "10cm",
        name: "10 cm",
        sku: "DEP-YAN-100",
        visualGroupKey: "principal",
        basePrice: 14,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "6-8cm",
        name: "6.8 cm",
        sku: "DEP-YAN-068",
        visualGroupKey: "principal",
        basePrice: 8,
        optionValueKeys: ["tamano:6-8cm"],
      },
    ],
    defaultVariantKey: "10cm",
  },
  {
    categorySlug: "deportes",
    name: "Escudo Real Madrid",
    slug: "escudo-real-madrid",
    description:
      "Escudo decorativo del Real Madrid con presencia de vitrina y material visual adicional para apreciar mejor la pieza.",
    featured: true,
    options: [escudoTamanos],
    variants: [
      {
        key: "17-5cm",
        name: "17.5 cm",
        sku: "DEP-RMA-175",
        visualGroupKey: "principal",
        basePrice: 30,
        optionValueKeys: ["tamano:17-5cm"],
      },
      {
        key: "10cm",
        name: "10 cm",
        sku: "DEP-RMA-100",
        visualGroupKey: "principal",
        basePrice: 14,
        optionValueKeys: ["tamano:10cm"],
      },
      {
        key: "6-8cm",
        name: "6.8 cm",
        sku: "DEP-RMA-068",
        visualGroupKey: "principal",
        basePrice: 8,
        optionValueKeys: ["tamano:6-8cm"],
      },
    ],
    defaultVariantKey: "10cm",
  },
  {
    categorySlug: "deportes",
    name: "Escudo Panamá",
    slug: "escudo-panama",
    description:
      "Escudo de Panamá disponible en varios acabados y tamaños para exhibición decorativa o regalo representativo.",
    featured: true,
    options: [
      {
        key: "color",
        name: "Color",
        values: [
          { key: "original", value: "Original" },
          { key: "dorado", value: "Dorado" },
          { key: "plateado", value: "Plateado" },
        ],
      },
      escudoTamanos,
    ],
    variants: [
      {
        key: "original-17-5cm",
        name: "Original / 17.5 cm",
        sku: "DEP-PAN-O-175",
        visualGroupKey: "original",
        basePrice: 30,
        optionValueKeys: ["color:original", "tamano:17-5cm"],
      },
      {
        key: "original-10cm",
        name: "Original / 10 cm",
        sku: "DEP-PAN-O-100",
        visualGroupKey: "original",
        basePrice: 14,
        optionValueKeys: ["color:original", "tamano:10cm"],
      },
      {
        key: "original-6-8cm",
        name: "Original / 6.8 cm",
        sku: "DEP-PAN-O-068",
        visualGroupKey: "original",
        basePrice: 8,
        optionValueKeys: ["color:original", "tamano:6-8cm"],
      },
      {
        key: "dorado-17-5cm",
        name: "Dorado / 17.5 cm",
        sku: "DEP-PAN-D-175",
        visualGroupKey: "dorado",
        basePrice: 30,
        optionValueKeys: ["color:dorado", "tamano:17-5cm"],
      },
      {
        key: "dorado-10cm",
        name: "Dorado / 10 cm",
        sku: "DEP-PAN-D-100",
        visualGroupKey: "dorado",
        basePrice: 14,
        optionValueKeys: ["color:dorado", "tamano:10cm"],
      },
      {
        key: "dorado-6-8cm",
        name: "Dorado / 6.8 cm",
        sku: "DEP-PAN-D-068",
        visualGroupKey: "dorado",
        basePrice: 8,
        optionValueKeys: ["color:dorado", "tamano:6-8cm"],
      },
      {
        key: "plateado-17-5cm",
        name: "Plateado / 17.5 cm",
        sku: "DEP-PAN-P-175",
        visualGroupKey: "plateado",
        basePrice: 30,
        optionValueKeys: ["color:plateado", "tamano:17-5cm"],
      },
      {
        key: "plateado-10cm",
        name: "Plateado / 10 cm",
        sku: "DEP-PAN-P-100",
        visualGroupKey: "plateado",
        basePrice: 14,
        optionValueKeys: ["color:plateado", "tamano:10cm"],
      },
      {
        key: "plateado-6-8cm",
        name: "Plateado / 6.8 cm",
        sku: "DEP-PAN-P-068",
        visualGroupKey: "plateado",
        basePrice: 8,
        optionValueKeys: ["color:plateado", "tamano:6-8cm"],
      },
    ],
    defaultVariantKey: "original-10cm",
  },
].filter((product) =>
  ["recordatorios-memoriales", "deportes"].includes(product.categorySlug) ||
  (product.slug === "cedulas-personalizadas-mascotas" && (product.options?.length ?? 0) > 0),
);

function variantId(productSlug: string, key: string) {
  return key === "default" ? `variant-${productSlug}` : `variant-${productSlug}-${key}`;
}

function optionId(productSlug: string, optionKey: string) {
  return `option-${productSlug}-${optionKey}`;
}

function optionValueId(productSlug: string, optionKey: string, valueKey: string) {
  return `option-value-${productSlug}-${optionKey}-${valueKey}`;
}

async function seedProduct(
  product: SeedProduct,
  categoryId: string,
  resolvedSeedMedia: SeedResolvedMediaCollections,
) {
  const existing = await prisma.product.findUnique({
    where: { slug: product.slug },
    select: { id: true },
  });

  if (existing) {
    if (product.slug === "cedulas-personalizadas-mascotas") {
      const relatedOrderItems = await prisma.orderItem.count({
        where: { productId: existing.id },
      });

      if (relatedOrderItems > 0) {
        throw new Error(
          "No se puede recrear cedulas-personalizadas-mascotas porque ya esta asociada a pedidos existentes.",
        );
      }

      await prisma.product.delete({
        where: { id: existing.id },
      });
    } else {
      console.log(`Skipping existing product: ${product.slug}`);
      return;
    }
  }

  const extras = product.extras ?? [];
  const variants = product.variants.map((variant, index) => ({
    ...variant,
    id: variantId(product.slug, variant.key),
    position: index,
    isActive: variant.isActive ?? true,
    optionValueIds: (variant.optionValueKeys ?? []).map((selection) => {
      const [optionKey, valueKey] = selection.split(":");
      return optionValueId(product.slug, optionKey!, valueKey!);
    }),
  }));

  const defaultVariantId =
    variants.find((variant) => variant.key === product.defaultVariantKey)?.id ??
    variants[0]?.id ??
    null;
  const defaultVariant =
    variants.find((variant) => variant.id === defaultVariantId) ?? variants[0];
  const productMedia = resolvedSeedMedia.productMediaBySlug.get(product.slug) ?? [];

  const persisted = await prisma.product.create({
    data: {
      name: product.name,
      slug: product.slug,
      sku: defaultVariant?.sku ?? null,
      defaultVariantId: null,
      description: product.description,
      basePrice: defaultVariant?.basePrice ?? 0,
      discountType: defaultVariant?.discountType ?? null,
      discountValue: defaultVariant?.discountValue ?? null,
      isPublished: true,
      isFeatured: product.featured,
      isHero: product.isHero ?? false,
      heroSlot: product.isHero ? product.heroSlot ?? "primary" : null,
      categoryId,
      images: {
        create: productMedia,
      },
    },
  });

  if (extras.length > 0) {
    await prisma.productExtra.createMany({
      data: extras.map((extra) => ({ ...extra, productId: persisted.id })),
    });
  }

  if ((product.customFields ?? []).length > 0) {
    await prisma.customField.createMany({
      data: (product.customFields ?? []).map((field) => ({
        productId: persisted.id,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options,
        helpText: field.helpText ?? null,
        position: field.position,
      })),
    });
  }

  for (const [optionPosition, option] of (product.options ?? []).entries()) {
    await prisma.productOption.create({
      data: {
        id: optionId(product.slug, option.key),
        productId: persisted.id,
        name: option.name,
        position: optionPosition,
        values: {
          create: option.values.map((value, valuePosition) => ({
            id: optionValueId(product.slug, option.key, value.key),
            value: value.value,
            position: valuePosition,
            swatch: value.swatch ?? null,
          })),
        },
      },
    });
  }

  for (const variant of variants) {
    const media = resolvedSeedMedia.variantMediaById.get(variant.id) ?? [];

    await prisma.productVariant.create({
      data: {
        id: variant.id,
        productId: persisted.id,
        name: variant.name,
        sku: variant.sku ?? null,
        selectionKey: variant.optionValueIds.slice().sort().join("|") || null,
        visualGroupKey: variant.visualGroupKey ?? null,
        basePrice: variant.basePrice,
        discountType: variant.discountType ?? null,
        discountValue: variant.discountValue ?? null,
        isActive: variant.isActive,
        position: variant.position,
        images: {
          create: media,
        },
        priceTiers: {
          create: variant.priceTiers ?? [],
        },
      },
    });

    if (variant.optionValueIds.length > 0) {
      await prisma.productVariantOptionValue.createMany({
        data: variant.optionValueIds.map((valueId) => ({
          variantId: variant.id,
          optionValueId: valueId,
        })),
      });
    }
  }

  await prisma.product.update({
    where: { id: persisted.id },
    data: { defaultVariantId },
  });
}

async function loadGraduationSeedData(): Promise<{ category: SeedCategory; products: SeedProduct[] }> {
  const catalogPath = fileURLToPath(new URL("../src/data/catalog-imports/graduacion.catalog.json", import.meta.url));
  const rawCatalog = await readFile(catalogPath, "utf8");
  const catalog = graduationCatalogSchema.parse(JSON.parse(rawCatalog));
  const seedData = mapGraduationCatalogToSeedData(catalog);

  return {
    category: seedData.category,
    products: seedData.products,
  };
}

async function main() {
  const graduationSeedData = await loadGraduationSeedData();
  const categories = [...baseCategories, graduationSeedData.category];
  const products = [...baseProducts, ...graduationSeedData.products];
  const productsWithSeedMedia = products.filter((product) => ["recordatorios-memoriales", "deportes"].includes(product.categorySlug));
  const resolvedSeedMedia = await syncSeedMedia(productsWithSeedMedia);
  const password = process.env.ADMIN_PASSWORD ?? "change-me-now";
  const email = (process.env.ADMIN_EMAIL ?? "admin@artenova.local").toLowerCase();

  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash: await bcrypt.hash(password, 12) },
    update: { passwordHash: await bcrypt.hash(password, 12) },
  });

  await prisma.siteSettings.upsert({
    where: { id: "site" },
    create: {
      id: "site",
      brandName: "Artenova",
      heroTitle: "Regalos personalizados que guardan historias",
      heroSubtitle: "Corte y grabado láser.",
      whatsapp: "",
      email: "",
      address: "Panamá",
      businessHours: "Lunes a viernes, 9:00 a.m. - 5:30 p.m.",
      mapsUrl: "",
      personalizationNotice:
        "Las fotos son referencias; cada pieza personalizada puede variar según foto, material y acabado.",
      bannerText: "Piezas personalizadas para recuerdos y regalos especiales.",
    },
    update: {},
  });

  const categoryRows = await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: category,
      }),
    ),
  );

  const categoryBySlug = new Map(categoryRows.map((category) => [category.slug, category.id]));

  for (const product of products) {
    await seedProduct(product, categoryBySlug.get(product.categorySlug)!, resolvedSeedMedia);
  }

  console.log("Seed de Artenova completado");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
