import { prisma } from "../lib/prisma";
import { createVideoPosterBuffer, storePosterBuffer } from "../services/uploadService";

type ProductImageRow = {
  id: string;
  url: string;
  alt: string;
  product: { slug: string };
};

type VariantImageRow = {
  id: string;
  url: string;
  alt: string;
  variant: { product: { slug: string } };
};

async function fetchVideoBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el video (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function backfillProductImages() {
  const items = await prisma.productImage.findMany({
    where: { type: "video", posterUrl: null },
    include: { product: { select: { slug: true } } },
  }) as ProductImageRow[];

  for (const item of items) {
    const videoBuffer = await fetchVideoBuffer(item.url);
    const posterBuffer = await createVideoPosterBuffer(videoBuffer, `${item.id}.mp4`);
    const stored = await storePosterBuffer(item.product.slug, item.alt || item.id, posterBuffer, item.id, "poster");
    await prisma.productImage.update({
      where: { id: item.id },
      data: { posterUrl: stored.posterUrl },
    });
    console.log(`productImage ${item.id}: ${stored.posterUrl}`);
  }
}

async function backfillVariantImages() {
  const items = await prisma.productVariantImage.findMany({
    where: { type: "video", posterUrl: null },
    include: { variant: { include: { product: { select: { slug: true } } } } },
  }) as VariantImageRow[];

  for (const item of items) {
    const videoBuffer = await fetchVideoBuffer(item.url);
    const posterBuffer = await createVideoPosterBuffer(videoBuffer, `${item.id}.mp4`);
    const stored = await storePosterBuffer(item.variant.product.slug, item.alt || item.id, posterBuffer, item.id, "poster");
    await prisma.productVariantImage.update({
      where: { id: item.id },
      data: { posterUrl: stored.posterUrl },
    });
    console.log(`productVariantImage ${item.id}: ${stored.posterUrl}`);
  }
}

async function main() {
  await backfillProductImages();
  await backfillVariantImages();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
