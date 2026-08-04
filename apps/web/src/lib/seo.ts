type SeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: "website" | "product";
  robots?: string;
  jsonLd?: unknown | unknown[] | null;
};

const siteName = "Artenova";
const defaultDescription = "Artenova, taller creativo de corte y grabado láser para regalos personalizados.";
const defaultImage = "/brand/artenova-icon-512.png";

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, window.location.origin).toString();
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

function upsertJsonLd(data: unknown | unknown[] | null | undefined) {
  document.head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"][data-artenova-seo="true"]').forEach((element) => element.remove());
  if (!data) return;

  const items = Array.isArray(data) ? data : [data];
  items.forEach((item, index) => {
    const element = document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.artenovaSeo = "true";
    element.dataset.artenovaSeoIndex = String(index);
    element.textContent = JSON.stringify(item);
    document.head.appendChild(element);
  });
}

export function applySeo(input: SeoInput) {
  const title = input.title.includes(siteName) ? input.title : `${input.title} | ${siteName}`;
  const description = input.description || defaultDescription;
  const canonical = absoluteUrl(input.path ?? window.location.pathname);
  const image = absoluteUrl(input.image || defaultImage);
  const type = input.type ?? "website";
  const robots = input.robots ?? "index,follow";

  document.title = title;
  upsertMeta('meta[name="description"]', { name: "description", content: description });
  upsertMeta('meta[name="robots"]', { name: "robots", content: robots });
  upsertCanonical(canonical);

  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: siteName });
  upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "es_PA" });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: image });

  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });
  upsertJsonLd(input.jsonLd);
}

export function productSeoDescription(input: { name: string; description: string; price: number }) {
  const cleanDescription = input.description.trim().replace(/\s+/g, " ");
  const suffix = ` Desde $${input.price.toFixed(2)}.`;
  const maxLength = 155 - suffix.length;
  const trimmed = cleanDescription.length > maxLength ? `${cleanDescription.slice(0, Math.max(0, maxLength - 1)).trim()}...` : cleanDescription;
  return `${trimmed || input.name}.${suffix}`.replace("..", ".");
}
