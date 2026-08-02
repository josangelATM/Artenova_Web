import { Router } from "express";
import { formatCurrency } from "@artenova/shared";
import { env } from "../env";
import { prisma } from "../lib/prisma";

export const seoRouter = Router();

const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  category: true,
};

function appBaseUrl() {
  return env.APP_BASE_URL.replace(/\/$/, "");
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${appBaseUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function productDescription(product: { name: string; description: string; basePrice: { toString(): string } | number }) {
  const suffix = ` Desde ${formatCurrency(Number(product.basePrice.toString()))}.`;
  const clean = product.description.trim().replace(/\s+/g, " ");
  const maxLength = 155 - suffix.length;
  const trimmed = clean.length > maxLength ? `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}...` : clean;
  return `${trimmed || product.name}.${suffix}`.replace("..", ".");
}

function seoTags(input: { title: string; description: string; canonical: string; image: string; type: "website" | "product" }) {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const canonical = escapeHtml(input.canonical);
  const image = escapeHtml(input.image);

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:site_name" content="Artenova" />`,
    `<meta property="og:type" content="${input.type}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n    ");
}

function injectSeo(html: string, tags: string) {
  const withoutTitle = html.replace(/<title>[\s\S]*?<\/title>/i, "");
  const withoutDescription = withoutTitle.replace(/<meta\s+name=["']description["'][^>]*>\s*/i, "");
  const withoutCanonical = withoutDescription.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/i, "");
  const withoutOg = withoutCanonical
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "");
  return withoutOg.replace("</head>", `    ${tags}\n  </head>`);
}

async function webIndexHtml() {
  const webBaseUrl = env.WEB_INTERNAL_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${webBaseUrl}/index.html`, { signal: AbortSignal.timeout(1800) });
  if (!response.ok) throw new Error(`No se pudo leer index.html: ${response.status}`);
  return response.text();
}

function fallbackHtml(tags: string, canonical: string) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${tags}
  </head>
  <body>
    <a href="${escapeHtml(canonical)}">Ver producto en Artenova</a>
  </body>
</html>`;
}

seoRouter.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
      "",
    ].join("\n"),
  );
});

seoRouter.get("/sitemap.xml", async (_req, res) => {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true, category: { isActive: true } },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const urls = [
    { loc: absoluteUrl("/"), changefreq: "weekly", priority: "1.0" },
    { loc: absoluteUrl("/catalogo"), changefreq: "weekly", priority: "0.9" },
    { loc: absoluteUrl("/contacto"), changefreq: "monthly", priority: "0.6" },
    ...categories.map((category) => ({
      loc: absoluteUrl(`/catalogo?category=${encodeURIComponent(category.slug)}`),
      lastmod: category.updatedAt.toISOString(),
      changefreq: "weekly",
      priority: "0.7",
    })),
    ...products.map((product) => ({
      loc: absoluteUrl(`/producto/${product.slug}`),
      lastmod: product.updatedAt.toISOString(),
      changefreq: "weekly",
      priority: "0.8",
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
${url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>\n` : ""}    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  res.type("application/xml").send(xml);
});

seoRouter.get("/producto/:slug", async (req, res, next) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, isPublished: true, category: { isActive: true } },
    include: productInclude,
  });

  if (!product) {
    next();
    return;
  }

  const canonical = absoluteUrl(`/producto/${product.slug}`);
  const image = absoluteUrl(product.images[0]?.url ?? "/brand/artenova-icon-512.png");
  const tags = seoTags({
    title: `${product.name} | Artenova`,
    description: productDescription(product),
    canonical,
    image,
    type: "product",
  });

  try {
    const html = await webIndexHtml();
    res.type("html").send(injectSeo(html, tags));
  } catch {
    res.type("html").send(fallbackHtml(tags, canonical));
  }
});
