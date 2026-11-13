import { calculateLineTotal, resolveFirstStillUrl, type Product, type ProductVariant } from "@artenova/shared";

export const quoteLogo = "/brand/artenova-logo.png";

export type QuoteCatalogItem = { product: Product; variant: ProductVariant | null; label: string };
export type QuoteLine = {
  id: string;
  item: QuoteCatalogItem | null;
  description: string;
  quantity: string;
  unitPrice: string | null;
  includeThumbnail: boolean;
};

export function quoteLineImage(line: QuoteLine) {
  if (!line.item) return null;
  return resolveFirstStillUrl(line.item.variant?.media) ?? resolveFirstStillUrl(line.item.product.media) ?? null;
}

export type Quote = {
  issuer: { name: string; legalName: string; taxId: string; phone: string; email: string; address: string };
  customer: { name: string; contact: string; taxId: string; phone: string; email: string; address: string };
  reference: string;
  issued: string;
  validUntil: string;
  delivery: string;
  payment: string;
  notes: string;
  lines: QuoteLine[];
  discountKind: "none" | "fixed" | "percent";
  discount: string;
  taxEnabled: boolean;
  taxRate: string;
};

export function newQuote(): Quote {
  return {
    issuer: { name: "Artenova", legalName: "", taxId: "", phone: "", email: "", address: "" },
    customer: { name: "", contact: "", taxId: "", phone: "", email: "", address: "" },
    reference: "",
    issued: new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Panama" }).format(new Date()),
    validUntil: "",
    delivery: "",
    payment: "",
    notes: "",
    lines: [],
    discountKind: "none",
    discount: "",
    taxEnabled: false,
    taxRate: ""
  };
}

export const quoteMoney = (cents: number) => usd.format(cents / 100);
const usd = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", currencyDisplay: "code" });

function parseCents(value: string) {
  if (!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(/[.,]/);
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function priceQuoteLine(line: QuoteLine) {
  const quantity = /^\d{1,5}$/.test(line.quantity.trim()) ? Number(line.quantity) : 0;
  const source = line.item?.variant ?? line.item?.product;
  if (!quantity) return null;
  if (line.unitPrice !== null) {
    const unit = parseCents(line.unitPrice);
    return unit === null ? null : { quantity, unit, total: unit * quantity, packagePrice: false };
  }
  if (!source) return null;
  const price = calculateLineTotal({ ...source, defaultVariant: null, extras: [] }, quantity, []);
  return {
    quantity,
    unit: Math.round(price.unitPrice * 100),
    total: Math.round(price.lineTotal * 100),
    packagePrice: source.priceTiers.some((tier) => tier.minQuantity === quantity && tier.totalPrice != null)
  };
}

function percentageOf(cents: number, rate: number) {
  return Number((BigInt(cents) * BigInt(rate) + 5000n) / 10000n);
}

export function calculateQuote(quote: Quote) {
  const lines = quote.lines.map(priceQuoteLine);
  const subtotal = lines.reduce((sum, line) => sum + (line?.total ?? 0), 0);
  const discountValue = quote.discountKind === "none" ? 0 : parseCents(quote.discount);
  const discountValid = discountValue !== null && (
    quote.discountKind === "percent" ? discountValue <= 10000 : discountValue <= subtotal
  );
  const discount = !discountValid ? 0 : quote.discountKind === "percent"
    ? percentageOf(subtotal, discountValue)
    : discountValue;
  const rate = quote.taxEnabled ? parseCents(quote.taxRate) : null;
  const tax = rate !== null && rate <= 10000 ? percentageOf(subtotal - discount, rate) : null;
  return { lines, subtotal, discount, discountValid, tax, total: subtotal - discount + (tax ?? 0) };
}

export type QuoteAmounts = ReturnType<typeof calculateQuote>;

export function validateQuote(quote: Quote, amounts: QuoteAmounts) {
  if (!quote.issuer.name.trim()) return "Ingresa el nombre comercial.";
  if (!quote.customer.name.trim()) return "Ingresa el nombre o empresa del cliente.";
  if (!quote.issued || !/^\d{4}-\d{2}-\d{2}$/.test(quote.issued)) return "Ingresa una fecha de emisión válida.";
  if (quote.validUntil && (!/^\d{4}-\d{2}-\d{2}$/.test(quote.validUntil) || quote.validUntil < quote.issued)) {
    return "La fecha de vigencia debe ser igual o posterior a la de emisión.";
  }
  if (!quote.lines.length) return "Agrega al menos una línea.";
  const invalidIndex = quote.lines.findIndex((line, index) => !line.description.trim() || !amounts.lines[index]);
  if (invalidIndex >= 0) {
    return `Revisa la línea ${invalidIndex + 1}. Ingresa una descripción, una cantidad entera entre 1 y 99 999 y un precio válido de hasta dos decimales.`;
  }
  if (!amounts.discountValid) return "Ingresa un descuento válido dentro del subtotal o un porcentaje entre 0 y 100.";
  if (quote.taxEnabled && amounts.tax === null) return "Ingresa una tasa de ITBMS entre 0 y 100, con hasta dos decimales.";
  return null;
}

export function quoteSummary(quote: Quote, amounts: QuoteAmounts): Array<[string, string]> {
  return [
    ["Subtotal", quoteMoney(amounts.subtotal)],
    ...(quote.discountKind !== "none" && amounts.discountValid
      ? [["Descuento", `−${quoteMoney(amounts.discount)}`] as [string, string]] : []),
    ...(amounts.tax !== null ? [[`ITBMS (${quote.taxRate.trim()} %)`, quoteMoney(amounts.tax)] as [string, string]] : []),
    ["Total", quoteMoney(amounts.total)]
  ];
}
