import { z } from "zod";

export const orderStatusValues = [
  "nuevo",
  "en_proceso",
  "completado",
  "cancelado",
] as const;
export const customFieldTypes = [
  "text",
  "date",
  "select",
  "image",
  "note",
] as const;
export const heroSlotValues = ["primary", "secondary"] as const;
export const productReviewSourceValues = ["customer", "admin"] as const;
export const discountTypeValues = ["percentage", "fixed"] as const;
export const productMediaTypeValues = ["image", "video"] as const;

export type OrderStatus = (typeof orderStatusValues)[number];
export type CustomFieldType = (typeof customFieldTypes)[number];
export type HeroSlot = (typeof heroSlotValues)[number];
export type ProductReviewSource = (typeof productReviewSourceValues)[number];
export type DiscountType = (typeof discountTypeValues)[number];
export type ProductMediaType = (typeof productMediaTypeValues)[number];

export const moneySchema = z.coerce.number().nonnegative().finite();

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  accentColor: z.string().nullable(),
  isActive: z.boolean(),
});

export const adminCategoryInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const productMediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: z.enum(productMediaTypeValues).default("image"),
  alt: z.string(),
  position: z.number().int(),
  posterUrl: z.string().nullable().optional(),
});

export const priceTierSchema = z.object({
  id: z.string().optional(),
  minQuantity: z.number().int().positive(),
  unitPrice: moneySchema,
  totalPrice: moneySchema.optional().nullable(),
  label: z.string().optional().nullable(),
  originalUnitPrice: moneySchema.optional(),
  originalTotalPrice: moneySchema.optional().nullable(),
  finalUnitPrice: moneySchema.optional(),
  finalTotalPrice: moneySchema.optional().nullable(),
  hasDiscount: z.boolean().optional(),
});

export const pricingSummarySchema = z.object({
  originalPrice: moneySchema,
  finalPrice: moneySchema,
  hasDiscount: z.boolean(),
  discountType: z.enum(discountTypeValues).nullable().optional(),
  discountValue: moneySchema.nullable().optional(),
});

export const productVariantAttributeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  value: z.string().min(1),
  position: z.number().int().nonnegative().optional(),
});

export const productOptionValueSchema = z.object({
  id: z.string(),
  optionId: z.string().optional(),
  value: z.string().min(1),
  position: z.number().int().nonnegative(),
  swatch: z.string().optional().nullable(),
});

export const productOptionSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  name: z.string().min(1),
  position: z.number().int().nonnegative(),
  values: z.array(productOptionValueSchema).default([]),
});

export const productVariantSelectionSchema = z.object({
  optionId: z.string(),
  optionName: z.string(),
  optionValueId: z.string(),
  value: z.string(),
  position: z.number().int().nonnegative(),
});

export const productVariantSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  name: z.string(),
  sku: z.string().nullable().optional(),
  selectionKey: z.string().nullable().optional(),
  visualGroupKey: z.string().nullable().optional(),
  basePrice: moneySchema,
  discountType: z.enum(discountTypeValues).nullable().optional(),
  discountValue: moneySchema.nullable().optional(),
  isActive: z.boolean(),
  position: z.number().int().nonnegative(),
  media: z.array(productMediaSchema).default([]),
  attributes: z.array(productVariantAttributeSchema).default([]),
  selections: z.array(productVariantSelectionSchema).default([]),
  priceTiers: z.array(priceTierSchema).default([]),
  pricingSummary: pricingSummarySchema,
});

export const productReviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string().optional(),
  productSlug: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  customerName: z.string(),
  comment: z.string(),
  isApproved: z.boolean(),
  source: z.enum(productReviewSourceValues),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const createProductReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  customerName: z.string().trim().min(2).max(80),
  comment: z.string().trim().min(3).max(800),
});

export const adminProductReviewInputSchema = createProductReviewSchema.extend({
  productId: z.string().min(1),
  isApproved: z.boolean().default(true),
});

export const updateReviewApprovalSchema = z.object({
  isApproved: z.boolean(),
});

export const productExtraSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  type: z.string().min(2),
  priceDelta: moneySchema.default(0),
});

export const customFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(2),
  type: z.enum(customFieldTypes),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  helpText: z.string().optional().nullable(),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  sku: z.string().nullable().optional(),
  defaultVariantId: z.string().nullable().optional(),
  currencySymbol: z.string().default("B/."),
  description: z.string(),
  categoryId: z.string(),
  basePrice: moneySchema,
  discountType: z.enum(discountTypeValues).nullable().optional(),
  discountValue: moneySchema.nullable().optional(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  isHero: z.boolean(),
  heroSlot: z.enum(heroSlotValues).nullable().optional(),
  media: z.array(productMediaSchema),
  priceTiers: z.array(priceTierSchema),
  extras: z.array(productExtraSchema),
  customFields: z.array(customFieldSchema),
  productOptions: z.array(productOptionSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
  defaultVariant: productVariantSchema.nullable().optional(),
  pricingSummary: pricingSummarySchema,
  reviews: z.array(productReviewSchema).default([]),
  reviewSummary: z.object({
    averageRating: z.number(),
    reviewCount: z.number().int().nonnegative(),
  }).default({ averageRating: 0, reviewCount: 0 }),
});

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  selectedExtraIds: z.array(z.string()).default([]),
  personalization: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .default({}),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerWhatsapp: z.string().min(6).max(40),
  customerNote: z.string().max(1200).optional().default(""),
  items: z.array(orderItemInputSchema).min(1),
});

export const updateOrderSchema = z.object({
  status: z.enum(orderStatusValues).optional(),
  finalPrice: moneySchema.optional().nullable(),
  adminNote: z.string().max(1200).optional().nullable(),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const adminProductInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  sku: z.string().trim().optional().nullable(),
  description: z.string().min(2),
  categoryId: z.string().min(1),
  basePrice: moneySchema,
  discountType: z.enum(discountTypeValues).optional().nullable(),
  discountValue: moneySchema.optional().nullable(),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isHero: z.boolean().default(false),
  heroSlot: z.enum(heroSlotValues).optional().nullable(),
  media: z.array(productMediaSchema.omit({ id: true })).default([]),
  priceTiers: z.array(priceTierSchema.omit({ id: true })).default([]),
  extras: z.array(productExtraSchema.omit({ id: true })).default([]),
  customFields: z.array(customFieldSchema.omit({ id: true })).default([]),
  productOptions: z.array(productOptionSchema.extend({
    values: z.array(productOptionValueSchema).default([]),
  })).default([]),
  defaultVariantId: z.string().optional().nullable(),
  variants: z.array(productVariantSchema.omit({ pricingSummary: true, attributes: true, selections: true }).extend({
    media: z.array(productMediaSchema.omit({ id: true })).default([]),
    optionValueIds: z.array(z.string()).default([]),
    priceTiers: z.array(priceTierSchema.omit({ id: true })).default([]),
  })).default([]),
});

export const siteSettingsSchema = z.object({
  brandName: z.string().default("Artenova"),
  heroTitle: z.string().default("Regalos personalizados que guardan historias"),
  heroSubtitle: z
    .string()
    .default(
      "Taller creativo de corte y grabado láser para mascotas, bodas y detalles hechos con cariño.",
    ),
  whatsapp: z.string().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  address: z.string().default("Panamá"),
  businessHours: z.string().optional().nullable().default(""),
  mapsUrl: z.string().url().optional().or(z.literal("")).nullable().default(""),
  personalizationNotice: z.string().optional().nullable().default(""),
  bannerText: z
    .string()
    .default("Piezas personalizadas para recuerdos y regalos especiales."),
});

export type Category = z.infer<typeof categorySchema>;
export type AdminCategoryInput = z.infer<typeof adminCategoryInputSchema>;
export type Product = z.infer<typeof productSchema>;
export type PricingSummary = z.infer<typeof pricingSummarySchema>;
export type ProductReview = z.infer<typeof productReviewSchema>;
export type CreateProductReviewInput = z.infer<typeof createProductReviewSchema>;
export type AdminProductReviewInput = z.infer<typeof adminProductReviewInputSchema>;
export type ProductMedia = z.infer<typeof productMediaSchema>;
export type ProductImage = ProductMedia;
export type PriceTier = z.infer<typeof priceTierSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type ProductVariantAttribute = z.infer<typeof productVariantAttributeSchema>;
export type ProductOption = z.infer<typeof productOptionSchema>;
export type ProductOptionValue = z.infer<typeof productOptionValueSchema>;
export type ProductVariantSelection = z.infer<typeof productVariantSelectionSchema>;
export type ProductExtra = z.infer<typeof productExtraSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  extrasTotal: number;
  lineTotal: number;
  personalization: Record<string, string | string[]>;
};

export type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  customerName: string;
  customerWhatsapp: string;
  customerNote?: string | null;
  estimatedTotal: number;
  finalPrice?: number | null;
  adminNote?: string | null;
  createdAt: string;
  items: OrderItem[];
};

export function formatCurrency(value: number, currencySymbol = "B/."): string {
  return `${currencySymbol}${value.toFixed(2)}`;
}

export type ProductMediaRenderable = Pick<ProductMedia, "type" | "url" | "posterUrl">;
export type ProductMediaSurface = "hero" | "card" | "thumbnail" | "viewer" | "seo";

export function resolveMediaStillUrl(media?: ProductMediaRenderable | null): string | undefined {
  if (!media) return undefined;
  return media.type === "video" ? media.posterUrl ?? undefined : media.url;
}

export function isRenderableInlineVideo(media?: ProductMediaRenderable | null): boolean {
  return media?.type === "video";
}

export function resolvePreviewMode(
  media: ProductMediaRenderable | null | undefined,
  surface: ProductMediaSurface
): "image" | "video" | "placeholder" {
  if (!media) return "placeholder";
  if (media.type === "image") return "image";
  if (surface === "hero" || surface === "card" || surface === "viewer") return "video";
  if (resolveMediaStillUrl(media)) return "image";
  return "placeholder";
}

export function resolveFirstStillUrl(mediaItems: readonly ProductMediaRenderable[] | null | undefined): string | undefined {
  if (!mediaItems) return undefined;
  for (const media of mediaItems) {
    const stillUrl = resolveMediaStillUrl(media);
    if (stillUrl) return stillUrl;
  }
  return undefined;
}

export { applyDiscount, calculateLineTotal, getFromPrice, getUnitPrice, resolveDisplayTiers, resolvePricingSummary, resolveVariantPricing } from "./pricing";
