import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const weddingFields = [
  { label: "Nombres", type: "text" as const, required: true, options: [], helpText: "Ejemplo: Max & Milagros", position: 0 },
  { label: "Fecha del evento", type: "date" as const, required: true, options: [], helpText: "Fecha que ira grabada", position: 1 },
  { label: "Texto o dedicatoria", type: "note" as const, required: false, options: [], helpText: "Mensaje corto si aplica", position: 2 }
];

const petFields = [
  { label: "Nombre de la mascota", type: "text" as const, required: true, options: [], helpText: "Nombre que ira grabado", position: 0 },
  { label: "Foto de referencia", type: "image" as const, required: false, options: [], helpText: "Puedes subirla despues de crear el pedido", position: 1 },
  { label: "Detalle especial", type: "note" as const, required: false, options: [], helpText: "Color, frase o indicacion importante", position: 2 }
];

const weddingTiersMdf = [
  { minQuantity: 6, unitPrice: 4.5, label: "6 unidades - $27.00" },
  { minQuantity: 12, unitPrice: 4, label: "12 unidades - $48.00" },
  { minQuantity: 18, unitPrice: 4, label: "18 unidades - $72.00" },
  { minQuantity: 24, unitPrice: 4, label: "24 unidades - $96.00" }
];

const weddingTiersAcrylic = [
  { minQuantity: 6, unitPrice: 5, label: "6 unidades - $30.00" },
  { minQuantity: 12, unitPrice: 4.5, label: "12 unidades - $54.00" },
  { minQuantity: 18, unitPrice: 4, label: "18 unidades - $72.00" },
  { minQuantity: 24, unitPrice: 4, label: "24 unidades - $96.00" }
];

const products = [
  {
    categorySlug: "mascotas",
    name: "Retrato grabado en laser en MDF",
    slug: "retrato-grabado-mdf",
    description: "Retrato personalizado con la foto de tu mascota, ideal para regalar o decorar un espacio especial.",
    basePrice: 16,
    material: "MDF",
    size: "20 cm x 17.3 cm",
    technique: "Grabado laser",
    image: "/seed/mascotas/mascotas-2.jpg",
    featured: true,
    fields: petFields
  },
  {
    categorySlug: "mascotas",
    name: "Retrato mediano grabado en MDF",
    slug: "retrato-mediano-grabado-mdf",
    description: "Formato mediano para conservar un recuerdo personalizado de tu mascota.",
    basePrice: 13,
    material: "MDF",
    size: "13.7 cm x 11.6 cm",
    technique: "Grabado laser",
    image: "/seed/mascotas/mascotas-3.jpg",
    featured: false,
    fields: petFields
  },
  {
    categorySlug: "mascotas",
    name: "Huellas que jamas se olvidan",
    slug: "huellas-que-jamas-se-olvidan",
    description: "Marco decorativo con fotos para honrar y guardar un recuerdo especial.",
    basePrice: 18,
    material: "Madera",
    size: "Decorativo",
    technique: "Corte y grabado laser",
    image: "/seed/mascotas/mascotas-4.jpg",
    featured: true,
    fields: petFields
  },
  {
    categorySlug: "mascotas",
    name: "Huella de amor",
    slug: "huella-de-amor",
    description: "Marco decorativo personalizado con fotos de tu mascota.",
    basePrice: 15,
    material: "Acrilico dorado y espejo",
    size: "Decorativo",
    technique: "Grabado laser",
    image: "/seed/mascotas/mascotas-5.jpg",
    featured: false,
    fields: petFields
  },
  {
    categorySlug: "mascotas",
    name: "Recuerdo en acrilico transparente",
    slug: "recuerdo-acrilico-transparente",
    description: "Pieza acrilica con foto personalizada y mensaje conmemorativo.",
    basePrice: 16,
    material: "Acrilico transparente",
    size: "16 cm x 14 cm",
    technique: "Grabado laser",
    image: "/seed/mascotas/mascotas-6.jpg",
    featured: false,
    fields: petFields
  },
  {
    categorySlug: "mascotas",
    name: "Llavero personalizado en acrilico dorado espejo",
    slug: "llavero-personalizado-acrilico-dorado",
    description: "Detalle pequeno para llevar siempre a tu mascota contigo.",
    basePrice: 6,
    material: "Acrilico dorado espejo y madera",
    size: "5.5 cm",
    technique: "Grabado laser en madera",
    image: "/seed/mascotas/mascotas-7.jpg",
    featured: false,
    fields: petFields
  },
  {
    categorySlug: "mascotas",
    name: "Portallaves personalizado",
    slug: "portallaves-personalizado",
    description: "Portallaves con forma de huella y nombre de tu mascota.",
    basePrice: 20,
    material: "MDF y acrilico",
    size: "15 cm",
    technique: "Corte y grabado laser",
    image: "/seed/mascotas/mascotas-8.jpg",
    featured: true,
    fields: petFields
  },
  ...[
    ["recordatorio-bodas-carton-comprimido-arco", "Recordatorio de bodas arco floral", "Carton comprimido", "14.3 cm x 13.3 cm", "/seed/bodas/bodas-2.jpg", weddingTiersMdf],
    ["recordatorio-bodas-acrilico-negro-dorado", "Recordatorio acrilico negro con dorado espejo", "Acrilico negro con acrilico dorado espejo", "17.7 cm x 12.5 cm", "/seed/bodas/bodas-3.jpg", weddingTiersAcrylic],
    ["recordatorio-bodas-carton-marco", "Recordatorio de bodas marco ornamental", "Carton comprimido", "15.6 cm x 10.7 cm", "/seed/bodas/bodas-4.jpg", weddingTiersMdf],
    ["recordatorio-bodas-acrilico-blanco", "Recordatorio de bodas acrilico blanco", "Acrilico blanco", "15.2 cm x 9.2 cm", "/seed/bodas/bodas-5.jpg", weddingTiersAcrylic],
    ["recordatorio-bodas-mdf-corazon", "Recordatorio de bodas corazon MDF", "MDF", "12.7 cm x 14.5 cm", "/seed/bodas/bodas-6.jpg", weddingTiersMdf],
    ["recordatorio-bodas-puzzle", "Recordatorio de bodas pieza faltante", "Acrilico negro con dorado espejo", "13.4 cm x 15.2 cm", "/seed/bodas/bodas-7.jpg", weddingTiersAcrylic],
    ["recordatorio-bodas-corazon-negro", "Recordatorio de bodas corazon negro", "Acrilico negro con dorado espejo", "12.8 cm x 13 cm", "/seed/bodas/bodas-8.jpg", weddingTiersAcrylic],
    ["recordatorio-bodas-tarjeta-acrilica", "Recordatorio de bodas tarjeta floral", "Acrilico negro con dorado espejo", "14 cm x 12 cm", "/seed/bodas/bodas-9.jpg", weddingTiersAcrylic]
  ].map(([slug, name, material, size, image, tiers], index) => ({
    categorySlug: "bodas",
    name: name as string,
    slug: slug as string,
    description: "Recordatorio personalizado para bodas con nombres, fecha y detalles grabados.",
    basePrice: (tiers as typeof weddingTiersMdf)[0]!.unitPrice,
    material: material as string,
    size: size as string,
    technique: "Corte y grabado laser",
    image: image as string,
    featured: index < 2,
    fields: weddingFields,
    tiers: tiers as typeof weddingTiersMdf
  }))
];

async function main() {
  const password = process.env.ADMIN_PASSWORD ?? "change-me-now";
  const email = (process.env.ADMIN_EMAIL ?? "admin@artenova.local").toLowerCase();

  await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash: await bcrypt.hash(password, 12) },
    update: { passwordHash: await bcrypt.hash(password, 12) }
  });

  await prisma.siteSettings.upsert({
    where: { id: "site" },
    create: {
      id: "site",
      brandName: "Artenova",
      heroTitle: "Regalos personalizados que guardan historias",
      heroSubtitle: "Corte y grabado laser para mascotas, bodas y recuerdos hechos con carino.",
      whatsapp: "",
      email: "",
      address: "Panama",
      bannerText: "Crea tu pedido con precio base y Artenova te contacta para confirmar cada detalle."
    },
    update: {}
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "mascotas" },
      create: {
        name: "Mascotas",
        slug: "mascotas",
        description: "Retratos, huellas, llaveros y recuerdos para tu mejor compania.",
        accentColor: "#b982d9"
      },
      update: {}
    }),
    prisma.category.upsert({
      where: { slug: "bodas" },
      create: {
        name: "Bodas",
        slug: "bodas",
        description: "Recordatorios personalizados para celebrar y agradecer.",
        accentColor: "#f07086"
      },
      update: {}
    })
  ]);
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (existing) {
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: existing.id } }),
        prisma.priceTier.deleteMany({ where: { productId: existing.id } }),
        prisma.productExtra.deleteMany({ where: { productId: existing.id } }),
        prisma.customField.deleteMany({ where: { productId: existing.id } })
      ]);
    }

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
        categoryId: categoryBySlug.get(product.categorySlug)!,
        images: { create: [{ url: product.image, alt: product.name, position: 0 }] },
        priceTiers: { create: "tiers" in product ? product.tiers : [] },
        extras: {
          create: [
            { name: "Acabado premium", type: "acabado", priceDelta: 3 },
            { name: "Empaque para regalo", type: "presentacion", priceDelta: 2 }
          ]
        },
        customFields: { create: product.fields }
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
        categoryId: categoryBySlug.get(product.categorySlug)!,
        images: { create: [{ url: product.image, alt: product.name, position: 0 }] },
        priceTiers: { create: "tiers" in product ? product.tiers : [] },
        extras: {
          create: [
            { name: "Acabado premium", type: "acabado", priceDelta: 3 },
            { name: "Empaque para regalo", type: "presentacion", priceDelta: 2 }
          ]
        },
        customFields: { create: product.fields }
      }
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
