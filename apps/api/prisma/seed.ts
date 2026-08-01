import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const s3PublicBaseUrl = (
  process.env.S3_PUBLIC_BASE_URL ??
  "https://artenova-uploads-002863053504.s3.us-east-1.amazonaws.com"
).replace(/\/$/, "");
const productImageUrl = (slug: string, sourcePath: string) =>
  `${s3PublicBaseUrl}/products/${slug}/${sourcePath.split("/").pop()}`;
const resolveProductImageUrl = (product: {
  slug: string;
  image: string;
  imageUrl?: string;
}) => product.imageUrl ?? productImageUrl(product.slug, product.image);

const weddingFields = [
  {
    label: "Nombres",
    type: "text" as const,
    required: true,
    options: [],
    helpText: "Ejemplo: Max & Milagros",
    position: 0,
  },
  {
    label: "Fecha del evento",
    type: "date" as const,
    required: true,
    options: [],
    helpText: "Fecha que irá grabada",
    position: 1,
  },
  {
    label: "Texto o dedicatoria",
    type: "note" as const,
    required: false,
    options: [],
    helpText: "Mensaje corto si aplica",
    position: 2,
  },
];

const petFields = [
  {
    label: "Nombre de la mascota",
    type: "text" as const,
    required: true,
    options: [],
    helpText: "Nombre que irá grabado",
    position: 0,
  },
  {
    label: "Foto de referencia",
    type: "image" as const,
    required: false,
    options: [],
    helpText: "Compártela por WhatsApp al coordinar el pedido",
    position: 1,
  },
  {
    label: "Detalle especial",
    type: "note" as const,
    required: false,
    options: [],
    helpText: "Color, frase o indicación importante",
    position: 2,
  },
];

const petIdFields = [
  {
    label: "Nombre de la mascota",
    type: "text" as const,
    required: true,
    options: [],
    helpText: "Nombre que irá en la cédula",
    position: 0,
  },
  {
    label: "Fecha de nacimiento",
    type: "date" as const,
    required: false,
    options: [],
    helpText: "Opcional",
    position: 1,
  },
  {
    label: "Especie",
    type: "text" as const,
    required: false,
    options: [],
    helpText: "Ejemplo: Canino o felino",
    position: 2,
  },
  {
    label: "Raza",
    type: "text" as const,
    required: false,
    options: [],
    helpText: "Opcional",
    position: 3,
  },
  {
    label: "Sexo",
    type: "select" as const,
    required: false,
    options: ["Macho", "Hembra"],
    helpText: "Opcional",
    position: 4,
  },
  {
    label: "Teléfono de contacto",
    type: "text" as const,
    required: true,
    options: [],
    helpText: "Número que aparecerá en la cédula",
    position: 5,
  },
  {
    label: "Foto de la mascota",
    type: "image" as const,
    required: false,
    options: [],
    helpText: "Comparte la foto de referencia al coordinar el pedido",
    position: 6,
  },
  {
    label: "Tamaño",
    type: "select" as const,
    required: true,
    options: ["Grande", "Mediana", "Pequeña"],
    helpText: "Elige el tamaño de la cédula",
    position: 7,
  },
];

const petIdTiers = [
  { minQuantity: 1, unitPrice: 10, totalPrice: 10, label: "1 unidad - $10.00" },
  {
    minQuantity: 2,
    unitPrice: 9,
    totalPrice: 18,
    label: "2 unidades - $18.00",
  },
  {
    minQuantity: 3,
    unitPrice: 7.67,
    totalPrice: 23,
    label: "3 unidades - $23.00",
  },
  {
    minQuantity: 4,
    unitPrice: 7,
    totalPrice: 28,
    label: "4 unidades - $28.00",
  },
  {
    minQuantity: 5,
    unitPrice: 6.8,
    totalPrice: 34,
    label: "5 unidades - $34.00",
  },
  {
    minQuantity: 6,
    unitPrice: 6.33,
    totalPrice: 38,
    label: "6 unidades - $38.00",
  },
];

const weddingTiersMdf = [
  { minQuantity: 6, unitPrice: 4.5, label: "6 unidades - $27.00" },
  { minQuantity: 12, unitPrice: 4, label: "12 unidades - $48.00" },
  { minQuantity: 18, unitPrice: 4, label: "18 unidades - $72.00" },
  { minQuantity: 24, unitPrice: 4, label: "24 unidades - $96.00" },
];

const weddingTiersAcrylic = [
  { minQuantity: 6, unitPrice: 5, label: "6 unidades - $30.00" },
  { minQuantity: 12, unitPrice: 4.5, label: "12 unidades - $54.00" },
  { minQuantity: 18, unitPrice: 4, label: "18 unidades - $72.00" },
  { minQuantity: 24, unitPrice: 4, label: "24 unidades - $96.00" },
];

const products = [
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas"],
    name: "Cédulas personalizadas para mascotas",
    slug: "cedulas-personalizadas-mascotas",
    description:
      "Cédulas de identificación personalizadas para mascotas, resistentes al agua, con acabado brillante y capa de resina para mayor durabilidad.",
    basePrice: 10,
    material: "Acrílico con capa de resina",
    size: "Grande, mediana y pequeña",
    technique: "Impresión personalizada con acabado en resina",
    image: "/seed/mascotas/cedulas-personalizadas-mascotas.png",
    imageUrl: "/seed/mascotas/cedulas-personalizadas-mascotas.png",
    featured: true,
    isHero: true,
    heroSlot: "primary",
    fields: petIdFields,
    tiers: petIdTiers,
    extras: [{ name: "QR trasero", type: "personalización", priceDelta: 2 }],
  },
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas"],
    name: "Retrato grabado en láser en MDF",
    slug: "retrato-grabado-mdf",
    description:
      "Retrato personalizado con la foto de tu mascota, ideal para regalar o decorar un espacio especial.",
    basePrice: 16,
    material: "MDF",
    size: "20 cm x 17.3 cm",
    technique: "Grabado láser",
    image: "/seed/mascotas/mascotas-2.jpg",
    featured: true,
    fields: petFields,
  },
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas"],
    name: "Retrato mediano grabado en MDF",
    slug: "retrato-mediano-grabado-mdf",
    description:
      "Formato mediano para conservar un recuerdo personalizado de tu mascota.",
    basePrice: 13,
    material: "MDF",
    size: "13.7 cm x 11.6 cm",
    technique: "Grabado láser",
    image: "/seed/mascotas/mascotas-3.jpg",
    featured: false,
    fields: petFields,
  },
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas", "recuerdo"],
    name: "Huellas que jamás se olvidan",
    slug: "huellas-que-jamas-se-olvidan",
    description:
      "Marco decorativo con fotos para honrar y guardar un recuerdo especial.",
    basePrice: 18,
    material: "Madera",
    size: "Decorativo",
    technique: "Corte y grabado láser",
    image: "/seed/mascotas/mascotas-4.jpg",
    featured: true,
    fields: petFields,
  },
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas", "recuerdo"],
    name: "Huella de amor",
    slug: "huella-de-amor",
    description: "Marco decorativo personalizado con fotos de tu mascota.",
    basePrice: 15,
    material: "Acrílico dorado y espejo",
    size: "Decorativo",
    technique: "Grabado láser",
    image: "/seed/mascotas/mascotas-5.jpg",
    featured: false,
    fields: petFields,
  },
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas", "recuerdo"],
    name: "Recuerdo en acrílico transparente",
    slug: "recuerdo-acrilico-transparente",
    description:
      "Pieza acrílica con foto personalizada y mensaje conmemorativo.",
    basePrice: 16,
    material: "Acrílico transparente",
    size: "16 cm x 14 cm",
    technique: "Grabado láser",
    image: "/seed/mascotas/mascotas-6.jpg",
    featured: false,
    fields: petFields,
  },
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas"],
    name: "Llavero personalizado en acrílico dorado espejo",
    slug: "llavero-personalizado-acrilico-dorado",
    description: "Detalle pequeño para llevar siempre a tu mascota contigo.",
    basePrice: 6,
    material: "Acrílico dorado espejo y madera",
    size: "5.5 cm",
    technique: "Grabado láser en madera",
    image: "/seed/mascotas/mascotas-7.jpg",
    featured: false,
    fields: petFields,
  },
  {
    categorySlug: "mascotas",
    tagSlugs: ["mascotas"],
    name: "Portallaves personalizado",
    slug: "portallaves-personalizado",
    description: "Portallaves con forma de huella y nombre de tu mascota.",
    basePrice: 20,
    material: "MDF y acrílico",
    size: "15 cm",
    technique: "Corte y grabado láser",
    image: "/seed/mascotas/mascotas-8.jpg",
    featured: true,
    fields: petFields,
  },
  ...[
    [
      "recordatorio-bodas-carton-comprimido-arco",
      "Recordatorio de bodas arco floral",
      "Cartón comprimido",
      "14.3 cm x 13.3 cm",
      "/seed/bodas/bodas-2.jpg",
      weddingTiersMdf,
    ],
    [
      "recordatorio-bodas-acrilico-negro-dorado",
      "Recordatorio acrílico negro con dorado espejo",
      "Acrílico negro con acrílico dorado espejo",
      "17.7 cm x 12.5 cm",
      "/seed/bodas/bodas-3.jpg",
      weddingTiersAcrylic,
    ],
    [
      "recordatorio-bodas-carton-marco",
      "Recordatorio de bodas marco ornamental",
      "Cartón comprimido",
      "15.6 cm x 10.7 cm",
      "/seed/bodas/bodas-4.jpg",
      weddingTiersMdf,
    ],
    [
      "recordatorio-bodas-acrilico-blanco",
      "Recordatorio de bodas acrílico blanco",
      "Acrílico blanco",
      "15.2 cm x 9.2 cm",
      "/seed/bodas/bodas-5.jpg",
      weddingTiersAcrylic,
    ],
    [
      "recordatorio-bodas-mdf-corazon",
      "Recordatorio de bodas corazón MDF",
      "MDF",
      "12.7 cm x 14.5 cm",
      "/seed/bodas/bodas-6.jpg",
      weddingTiersMdf,
    ],
    [
      "recordatorio-bodas-puzzle",
      "Recordatorio de bodas pieza faltante",
      "Acrílico negro con dorado espejo",
      "13.4 cm x 15.2 cm",
      "/seed/bodas/bodas-7.jpg",
      weddingTiersAcrylic,
    ],
    [
      "recordatorio-bodas-corazon-negro",
      "Recordatorio de bodas corazón negro",
      "Acrílico negro con dorado espejo",
      "12.8 cm x 13 cm",
      "/seed/bodas/bodas-8.jpg",
      weddingTiersAcrylic,
    ],
    [
      "recordatorio-bodas-tarjeta-acrilica",
      "Recordatorio de bodas tarjeta floral",
      "Acrílico negro con dorado espejo",
      "14 cm x 12 cm",
      "/seed/bodas/bodas-9.jpg",
      weddingTiersAcrylic,
    ],
  ].map(([slug, name, material, size, image, tiers], index) => ({
    categorySlug: "bodas",
    tagSlugs: ["bodas", "recuerdo"],
    name: name as string,
    slug: slug as string,
    description:
      "Recordatorio personalizado para bodas con nombres, fecha y detalles grabados.",
    basePrice: (tiers as typeof weddingTiersMdf)[0]!.unitPrice,
    material: material as string,
    size: size as string,
    technique: "Corte y grabado láser",
    image: image as string,
    featured: index < 2,
    isHero: slug === "recordatorio-bodas-acrilico-negro-dorado",
    heroSlot:
      slug === "recordatorio-bodas-acrilico-negro-dorado" ? "secondary" : null,
    fields: weddingFields,
    tiers: tiers as typeof weddingTiersMdf,
  })),
];

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "change-me-now";
  const email = (
    process.env.ADMIN_EMAIL ?? "admin@artenova.local"
  ).toLowerCase();

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

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "mascotas" },
      create: {
        name: "Mascotas",
        slug: "mascotas",
        description:
          "Retratos, huellas, llaveros y recuerdos para tu mejor compañía.",
        accentColor: "#b982d9",
      },
      update: {},
    }),
    prisma.category.upsert({
      where: { slug: "bodas" },
      create: {
        name: "Bodas",
        slug: "bodas",
        description: "Recordatorios personalizados para celebrar y agradecer.",
        accentColor: "#f07086",
      },
      update: {},
    }),
  ]);

  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: "mascotas" },
      create: {
        name: "Mascotas",
        slug: "mascotas",
        description: "Detalles pensados para mascotas y sus recuerdos.",
        accentColor: "#8ac6d1",
      },
      update: {},
    }),
    prisma.tag.upsert({
      where: { slug: "bodas" },
      create: {
        name: "Bodas",
        slug: "bodas",
        description: "Recordatorios y detalles para bodas.",
        accentColor: "#f07086",
      },
      update: {},
    }),
    prisma.tag.upsert({
      where: { slug: "recuerdo" },
      create: {
        name: "Recuerdo",
        slug: "recuerdo",
        description: "Piezas para conservar momentos especiales.",
        accentColor: "#9b8fd3",
      },
      update: {},
    }),
  ]);

  const categoryBySlug = new Map(
    categories.map((category) => [category.slug, category.id]),
  );
  const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag.id]));

  for (const product of products) {
    const isHero = "isHero" in product ? product.isHero : false;
    const heroSlot = "heroSlot" in product ? product.heroSlot : null;
    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: existing.id } }),
        prisma.priceTier.deleteMany({ where: { productId: existing.id } }),
        prisma.productExtra.deleteMany({ where: { productId: existing.id } }),
        prisma.customField.deleteMany({ where: { productId: existing.id } }),
        prisma.productTag.deleteMany({ where: { productId: existing.id } }),
      ]);
    }

    const tagLinks = product.tagSlugs.map((slug) => ({
      tagId: tagBySlug.get(slug)!,
    }));

    await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        basePrice: product.basePrice,
        material: product.material,
        size: product.size,
        technique: product.technique,
        isFeatured: product.featured,
        isHero,
        heroSlot: isHero ? (heroSlot ?? null) : null,
        categoryId: categoryBySlug.get(product.categorySlug)!,
        tags: { create: tagLinks },
        images: {
          create: [
            {
              url: resolveProductImageUrl(product),
              alt: product.name,
              position: 0,
            },
          ],
        },
        priceTiers: { create: "tiers" in product ? product.tiers : [] },
        extras: {
          create:
            "extras" in product
              ? product.extras
              : [
                  { name: "Acabado premium", type: "acabado", priceDelta: 3 },
                  {
                    name: "Empaque para regalo",
                    type: "presentacion",
                    priceDelta: 2,
                  },
                ],
        },
        customFields: { create: product.fields },
      },
      update: {
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        material: product.material,
        size: product.size,
        technique: product.technique,
        isPublished: true,
        isFeatured: product.featured,
        isHero,
        heroSlot: isHero ? (heroSlot ?? null) : null,
        categoryId: categoryBySlug.get(product.categorySlug)!,
        tags: { create: tagLinks },
        images: {
          create: [
            {
              url: resolveProductImageUrl(product),
              alt: product.name,
              position: 0,
            },
          ],
        },
        priceTiers: { create: "tiers" in product ? product.tiers : [] },
        extras: {
          create:
            "extras" in product
              ? product.extras
              : [
                  { name: "Acabado premium", type: "acabado", priceDelta: 3 },
                  {
                    name: "Empaque para regalo",
                    type: "presentacion",
                    priceDelta: 2,
                  },
                ],
        },
        customFields: { create: product.fields },
      },
    });
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
