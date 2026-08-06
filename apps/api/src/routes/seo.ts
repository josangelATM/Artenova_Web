import { Router } from "express";
import type { Response } from "express";
import { formatCurrency, resolveMediaStillUrl } from "@artenova/shared";
import { env } from "../env";
import { productPayload } from "../lib/serialize";
import { prisma } from "../lib/prisma";

export const seoRouter = Router();

const siteName = env.SITE_BRAND_NAME || "Artenova";
const defaultImage = "/brand/artenova-icon-512.png";
const defaultDescription = "Artenova, taller creativo de corte y grabado láser para regalos personalizados en Panamá.";

const productInclude = {
  images: { orderBy: { position: "asc" as const } },
  priceTiers: { orderBy: { minQuantity: "asc" as const } },
  options: {
    orderBy: { position: "asc" as const },
    include: { values: { orderBy: { position: "asc" as const } } }
  },
  variants: {
    where: { isActive: true },
    orderBy: { position: "asc" as const },
    include: {
      images: { orderBy: { position: "asc" as const } },
      attributes: { orderBy: { position: "asc" as const } },
      optionValues: {
        include: {
          optionValue: {
            include: {
              option: true
            }
          }
        }
      },
      priceTiers: { orderBy: { minQuantity: "asc" as const } }
    }
  },
  extras: true,
  customFields: { orderBy: { position: "asc" as const } },
  reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" as const } },
  category: true,
};

type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
};

type SeoTagsInput = {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  type?: "website" | "product";
  robots?: string;
  jsonLd?: unknown[];
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

function escapeJsonScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")) as T;
}

function productDescription(product: { name: string; description: string; pricingSummary: { finalPrice: number }; currencySymbol?: string }) {
  const suffix = ` Desde ${formatCurrency(product.pricingSummary.finalPrice, product.currencySymbol ?? "B/.")}.`;
  const clean = product.description.trim().replace(/\s+/g, " ");
  const maxLength = 155 - suffix.length;
  const trimmed = clean.length > maxLength ? `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}...` : clean;
  return `${trimmed || product.name}.${suffix}`.replace("..", ".");
}

function currencyCodeFromSymbol(symbol?: string | null) {
  if (symbol === "$") return "USD";
  if (symbol === "B/.") return "PAB";
  return "USD";
}

function settingsDescription() {
  return env.SITE_HERO_SUBTITLE || defaultDescription;
}

function seoTags(input: SeoTagsInput) {
  const title = escapeHtml(input.title.includes(siteName) ? input.title : `${input.title} | ${siteName}`);
  const description = escapeHtml(input.description || defaultDescription);
  const canonical = escapeHtml(input.canonical);
  const image = escapeHtml(absoluteUrl(input.image || defaultImage));
  const type = input.type ?? "website";
  const robots = input.robots ?? "index,follow";

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${escapeHtml(robots)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    `<meta property="og:locale" content="es_PA" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...(input.jsonLd ?? []).map((item) => `<script type="application/ld+json">${escapeJsonScript(item)}</script>`),
  ].join("\n    ");
}

function injectSeo(html: string, tags: string) {
  const withoutSeo = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/i, "")
    .replace(/<meta\s+name=["']robots["'][^>]*>\s*/i, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/i, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, "");

  return withoutSeo.replace("</head>", `    ${tags}\n  </head>`);
}

async function webIndexHtml() {
  const webBaseUrl = env.WEB_INTERNAL_BASE_URL.replace(/\/$/, "");
  const response = await fetch(`${webBaseUrl}/index.html`, { signal: AbortSignal.timeout(1800) });
  if (!response.ok) throw new Error(`No se pudo leer index.html: ${response.status}`);
  return response.text();
}

function fallbackHtml(tags: string, canonical: string, label: string) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${tags}
  </head>
  <body>
    <a href="${escapeHtml(canonical)}">${escapeHtml(label)}</a>
  </body>
</html>`;
}

async function sendSeoHtml(res: Response, input: SeoTagsInput & { fallbackLabel: string }) {
  const tags = seoTags(input);
  try {
    const html = await webIndexHtml();
    res.type("html").send(injectSeo(html, tags));
  } catch {
    res.type("html").send(fallbackHtml(tags, input.canonical, input.fallbackLabel));
  }
}

function organizationJsonLd() {
  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/artenova-icon-512.png"),
    email: env.SITE_EMAIL || undefined,
    contactPoint: env.SITE_WHATSAPP
      ? [{
          "@type": "ContactPoint",
          telephone: env.SITE_WHATSAPP,
          contactType: "customer service",
          areaServed: "PA",
          availableLanguage: "es"
        }]
      : undefined
  });
}

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
    inLanguage: "es-PA",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/catalogo")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

function localBusinessJsonLd() {
  return compact({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteName,
    url: absoluteUrl("/"),
    image: absoluteUrl(defaultImage),
    address: env.SITE_ADDRESS || undefined,
    telephone: env.SITE_WHATSAPP || undefined,
    email: env.SITE_EMAIL || undefined,
    openingHours: env.SITE_BUSINESS_HOURS || undefined
  });
}

function itemListJsonLd(products: Array<{ name: string; slug: string; media: Array<{ url: string; type: "image" | "video"; posterUrl?: string | null }> }>, basePath: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: absoluteUrl(basePath),
    itemListElement: products.slice(0, 24).map((product, index) => compact({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/producto/${product.slug}`),
      name: product.name,
      image: resolveMediaStillUrl(product.media[0]) ? absoluteUrl(resolveMediaStillUrl(product.media[0])!) : undefined
    }))
  };
}

function productJsonLd(product: ReturnType<typeof productPayload>) {
  const images = [
    ...product.media.map((item: { type: "image" | "video"; url: string; posterUrl?: string | null }) => resolveMediaStillUrl(item)),
    ...product.variants.flatMap((variant: { media: Array<{ type: "image" | "video"; url: string; posterUrl?: string | null }> }) => variant.media.map((item) => resolveMediaStillUrl(item))),
  ].filter(Boolean).map((value) => absoluteUrl(value!));

  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku || undefined,
    image: images.length ? Array.from(new Set(images)) : [absoluteUrl(defaultImage)],
    category: product.category?.name,
    brand: { "@type": "Brand", name: siteName },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/producto/${product.slug}`),
      priceCurrency: currencyCodeFromSymbol(product.currencySymbol),
      price: product.pricingSummary.finalPrice.toFixed(2),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition"
    },
    aggregateRating: product.reviewSummary.reviewCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: product.reviewSummary.averageRating,
          reviewCount: product.reviewSummary.reviewCount
        }
      : undefined
  });
}

async function publishedProducts(categorySlug?: string) {
  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      category: categorySlug ? { slug: categorySlug, isActive: true } : { isActive: true },
    },
    include: productInclude,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  return products.map(productPayload);
}

seoRouter.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /carrito",
      "Disallow: /pedido",
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

  const urls: SitemapUrl[] = [
    { loc: absoluteUrl("/"), changefreq: "weekly", priority: "1.0" },
    { loc: absoluteUrl("/catalogo"), changefreq: "weekly", priority: "0.9" },
    { loc: absoluteUrl("/contacto"), changefreq: "monthly", priority: "0.6" },
    ...categories.map((category) => ({
      loc: absoluteUrl(`/catalogo/${category.slug}`),
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

seoRouter.get("/", async (_req, res) => {
  const products = await publishedProducts();
  await sendSeoHtml(res, {
    title: env.SITE_HERO_TITLE || "Regalos personalizados en Panamá",
    description: settingsDescription(),
    canonical: absoluteUrl("/"),
    image: resolveMediaStillUrl(products[0]?.defaultVariant?.media[0] ?? products[0]?.media[0]),
    type: "website",
    jsonLd: [websiteJsonLd(), organizationJsonLd()],
    fallbackLabel: "Ver Artenova",
  });
});

seoRouter.get("/catalogo", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (category && !q) {
    res.redirect(301, `/catalogo/${encodeURIComponent(category)}`);
    return;
  }

  const products = await publishedProducts();
  await sendSeoHtml(res, {
    title: "Catálogo de regalos personalizados",
    description: "Explora regalos personalizados, recuerdos y piezas de corte y grabado láser hechas por Artenova en Panamá.",
    canonical: absoluteUrl("/catalogo"),
    image: resolveMediaStillUrl(products[0]?.defaultVariant?.media[0] ?? products[0]?.media[0]),
    robots: q ? "noindex,follow" : "index,follow",
    type: "website",
    jsonLd: q ? [websiteJsonLd()] : [itemListJsonLd(products, "/catalogo"), websiteJsonLd()],
    fallbackLabel: "Ver catálogo de Artenova",
  });
});

seoRouter.get("/catalogo/:categorySlug", async (req, res, next) => {
  const category = await prisma.category.findFirst({
    where: { slug: req.params.categorySlug, isActive: true },
    select: { name: true, slug: true, description: true, updatedAt: true },
  });

  if (!category) {
    next();
    return;
  }

  const products = await publishedProducts(category.slug);
  await sendSeoHtml(res, {
    title: `${category.name} personalizados`,
    description: category.description || `Modelos personalizados de ${category.name.toLowerCase()} con corte y grabado láser hechos por Artenova en Panamá.`,
    canonical: absoluteUrl(`/catalogo/${category.slug}`),
    image: resolveMediaStillUrl(products[0]?.defaultVariant?.media[0] ?? products[0]?.media[0]),
    type: "website",
    jsonLd: [itemListJsonLd(products, `/catalogo/${category.slug}`), websiteJsonLd()],
    fallbackLabel: `Ver ${category.name} en Artenova`,
  });
});

seoRouter.get("/contacto", async (_req, res) => {
  await sendSeoHtml(res, {
    title: "Contacto",
    description: "Contacta a Artenova en Panamá por WhatsApp o email para consultar regalos personalizados, diseño, disponibilidad y entregas.",
    canonical: absoluteUrl("/contacto"),
    image: defaultImage,
    type: "website",
    jsonLd: [localBusinessJsonLd(), organizationJsonLd()],
    fallbackLabel: "Contactar a Artenova",
  });
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

  const payload = productPayload(product);
  const image = resolveMediaStillUrl(payload.defaultVariant?.media[0] ?? payload.media[0] ?? payload.variants[0]?.media[0]) ?? defaultImage;

  await sendSeoHtml(res, {
    title: `${payload.name} | ${siteName}`,
    description: productDescription(payload),
    canonical: absoluteUrl(`/producto/${payload.slug}`),
    image,
    type: "product",
    jsonLd: [productJsonLd(payload), organizationJsonLd()],
    fallbackLabel: `Ver ${payload.name} en Artenova`,
  });
});
