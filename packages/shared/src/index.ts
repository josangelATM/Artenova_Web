import { z } from "zod";

export const orderStatusValues = ["nuevo", "en_proceso", "completado", "cancelado"] as const;
export const customFieldTypes = ["text", "date", "select", "image", "note"] as const;

export type OrderStatus = (typeof orderStatusValues)[number];
export type CustomFieldType = (typeof customFieldTypes)[number];

export const moneySchema = z.coerce.number().nonnegative().finite();

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  accentColor: z.string().nullable(),
  isActive: z.boolean()
});

export const adminCategoryInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  accentColor: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});

export const productImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string(),
  position: z.number().int()
});

export const priceTierSchema = z.object({
  id: z.string().optional(),
  minQuantity: z.number().int().positive(),
  unitPrice: moneySchema,
  label: z.string().optional().nullable()
});

export const productExtraSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  type: z.string().min(2),
  priceDelta: moneySchema.default(0)
});

export const customFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(2),
  type: z.enum(customFieldTypes),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  helpText: z.string().optional().nullable()
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  categoryId: z.string(),
  basePrice: moneySchema,
  material: z.string().nullable(),
  size: z.string().nullable(),
  technique: z.string().nullable(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  images: z.array(productImageSchema),
  priceTiers: z.array(priceTierSchema),
  extras: z.array(productExtraSchema),
  customFields: z.array(customFieldSchema)
});

export const orderItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  selectedExtraIds: z.array(z.string()).default([]),
  personalization: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({})
});

export const createOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerWhatsapp: z.string().min(6).max(40),
  customerNote: z.string().max(1200).optional().default(""),
  items: z.array(orderItemInputSchema).min(1)
});

export const updateOrderSchema = z.object({
  status: z.enum(orderStatusValues).optional(),
  finalPrice: moneySchema.optional().nullable(),
  adminNote: z.string().max(1200).optional().nullable()
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const adminProductInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(2),
  categoryId: z.string().min(1),
  basePrice: moneySchema,
  material: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  technique: z.string().optional().nullable(),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(productImageSchema.omit({ id: true })).default([]),
  priceTiers: z.array(priceTierSchema.omit({ id: true })).default([]),
  extras: z.array(productExtraSchema.omit({ id: true })).default([]),
  customFields: z.array(customFieldSchema.omit({ id: true })).default([])
});

export const siteSettingsSchema = z.object({
  brandName: z.string().default("Artenova"),
  heroTitle: z.string().default("Regalos personalizados que guardan historias"),
  heroSubtitle: z.string().default("Corte y grabado laser para mascotas, bodas y detalles hechos con carino."),
  whatsapp: z.string().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  address: z.string().default("Panama"),
  bannerText: z.string().default("Pedidos personalizados con precio base y confirmacion por WhatsApp.")
});

export type Category = z.infer<typeof categorySchema>;
export type AdminCategoryInput = z.infer<typeof adminCategoryInputSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type PriceTier = z.infer<typeof priceTierSchema>;
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

export type OrderUpload = {
  id: string;
  orderId: string;
  itemId?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  originalName: string;
  mimeType: string;
  size: number;
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
  uploads: OrderUpload[];
};

export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export { calculateLineTotal, getUnitPrice } from "./pricing";
