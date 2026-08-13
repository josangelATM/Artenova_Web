import { z } from "zod";

export const orderStatusValues = [
  "nuevo",
  "pendiente_diseno",
  "pendiente_aprobacion",
  "pendiente_fabricacion",
  "pendiente_imprimir",
  "listo_entrega",
  "entregado",
] as const;
export const orderSourceValues = ["storefront", "admin_manual"] as const;
export const orderPaymentMethodValues = ["efectivo", "yappy", "transferencia", "otro"] as const;
export const expenseCategoryValues = ["materia_prima", "servicios", "publicidad", "salario", "viaticos", "otros"] as const;
export const expensePaymentMethodValues = ["efectivo", "yappy", "transferencia", "tarjeta_credito", "otro"] as const;
export const qrCodeTypeValues = ["url", "whatsapp", "vcard"] as const;
export const qrCodeStatusValues = ["active", "inactive"] as const;
export const heroSlotValues = ["primary", "secondary"] as const;
export const productReviewSourceValues = ["customer", "admin"] as const;
export const discountTypeValues = ["percentage", "fixed"] as const;
export const productMediaTypeValues = ["image", "video"] as const;

export type OrderStatus = (typeof orderStatusValues)[number];
export const orderStatusLabels: Record<OrderStatus, string> = {
  nuevo: "Nuevo",
  pendiente_diseno: "Pendiente por diseño",
  pendiente_aprobacion: "Pendiente por aprobación",
  pendiente_fabricacion: "Pendiente por fabricación",
  pendiente_imprimir: "Pendiente por imprimir",
  listo_entrega: "Listo para entrega",
  entregado: "Entregado",
};
export type OrderSource = (typeof orderSourceValues)[number];
export type OrderPaymentMethod = (typeof orderPaymentMethodValues)[number];
export type ExpenseCategory = (typeof expenseCategoryValues)[number];
export type ExpensePaymentMethod = (typeof expensePaymentMethodValues)[number];
export type QRCodeType = (typeof qrCodeTypeValues)[number];
export type QRCodeStatus = (typeof qrCodeStatusValues)[number];
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
  drivesVisualGroup: z.boolean().default(false),
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
  position: z.number().int().nonnegative().optional(),
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

export const orderItemUnitSchema = z.object({
  id: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
  label: z.string().max(120).optional().nullable(),
  personalization: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .default({}),
});

export const adminOrderItemAdjustmentSchema = z.object({
  label: z.string().trim().min(1).max(200),
  unitAmount: moneySchema,
  quantity: z.number().int().positive(),
  totalAmount: moneySchema,
}).strict();

export const adminOrderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1).nullable().optional(),
  productName: z.string().trim().min(1).max(200),
  quantity: z.number().int().positive(),
  unitPrice: moneySchema,
  extrasTotal: moneySchema.default(0),
  skuSnapshot: z.string().max(120).optional().nullable(),
  variantNameSnapshot: z.string().max(160).optional().nullable(),
  unitLabel: z.string().max(120).optional().nullable(),
  selectedExtraIds: z.array(z.string()).default([]),
  appliedAdjustments: z.array(adminOrderItemAdjustmentSchema).default([]),
  personalization: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .default({}),
  isDone: z.boolean().default(false),
  units: z.array(orderItemUnitSchema).default([]),
}).strict();

export const adminOrderPaymentInputSchema = z.object({
  amount: moneySchema,
  method: z.enum(orderPaymentMethodValues).default("otro"),
  reference: z.string().max(160).optional().nullable(),
  note: z.string().max(1200).optional().nullable(),
});

export const expenseCategorySchema = z.enum(expenseCategoryValues);
export const expensePaymentMethodSchema = z.enum(expensePaymentMethodValues);
export const adminFinanceRangePresetValues = ["today", "last7", "thisMonth", "last30", "custom"] as const;
export const adminFinanceRangePresetSchema = z.enum(adminFinanceRangePresetValues);

export const adminExpenseInputSchema = z.object({
  category: expenseCategorySchema,
  amount: z.coerce.number().positive().finite(),
  expenseDate: z.string().date(),
  description: z.string().trim().min(1).max(200),
  paymentMethod: expensePaymentMethodSchema.optional().nullable(),
  reference: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createAdminExpenseSchema = adminExpenseInputSchema;
export const updateAdminExpenseSchema = adminExpenseInputSchema;

export const adminExpenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: expenseCategorySchema.optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  q: z.string().trim().max(200).optional(),
});

export const expenseSchema = z.object({
  id: z.string(),
  category: expenseCategorySchema,
  amount: moneySchema,
  expenseDate: z.string(),
  description: z.string(),
  paymentMethod: expensePaymentMethodSchema.optional().nullable(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminExpenseSummarySchema = z.object({
  todayTotal: moneySchema,
  monthTotal: moneySchema,
  filteredTotal: moneySchema,
});

export const adminFinanceQuerySchema = z.object({
  rangePreset: adminFinanceRangePresetSchema.default("thisMonth"),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export const adminFinanceSummarySchema = z.object({
  paidIncome: moneySchema,
  committedSales: moneySchema,
  outstandingBalance: moneySchema,
  expenseTotal: moneySchema,
  netCashflow: z.number().finite(),
  orderCount: z.number().int().nonnegative(),
  expenseCount: z.number().int().nonnegative(),
});

export const adminFinanceSeriesPointSchema = z.object({
  date: z.string().date(),
  paidIncome: moneySchema,
  expenseTotal: moneySchema,
  net: z.number().finite(),
});

export const adminFinanceExpenseBreakdownItemSchema = z.object({
  category: expenseCategorySchema,
  total: moneySchema,
  count: z.number().int().nonnegative(),
});

export const adminFinanceOrderStatusBreakdownItemSchema = z.object({
  status: z.enum(orderStatusValues),
  total: moneySchema,
  count: z.number().int().nonnegative(),
});

export const adminFinancePaymentMethodBreakdownItemSchema = z.object({
  method: z.enum(orderPaymentMethodValues),
  total: moneySchema,
  count: z.number().int().nonnegative(),
});

export const adminFinanceOutstandingOrderSchema = z.object({
  id: z.string(),
  code: z.string(),
  customerName: z.string(),
  status: z.enum(orderStatusValues),
  createdAt: z.string(),
  finalPrice: z.number().nullable().optional(),
  itemsTotal: moneySchema,
  paidTotal: moneySchema,
  balance: moneySchema,
});

export const adminFinanceRecentExpenseSchema = z.object({
  id: z.string(),
  expenseDate: z.string(),
  category: expenseCategorySchema,
  description: z.string(),
  amount: moneySchema,
  paymentMethod: expensePaymentMethodSchema.optional().nullable(),
  reference: z.string().nullable().optional(),
});

export const adminFinanceOverviewSchema = z.object({
  rangePreset: adminFinanceRangePresetSchema,
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
  summary: adminFinanceSummarySchema,
  timeSeries: z.array(adminFinanceSeriesPointSchema),
  expenseBreakdown: z.array(adminFinanceExpenseBreakdownItemSchema),
  orderStatusBreakdown: z.array(adminFinanceOrderStatusBreakdownItemSchema),
  paymentMethodBreakdown: z.array(adminFinancePaymentMethodBreakdownItemSchema),
  topOutstandingOrders: z.array(adminFinanceOutstandingOrderSchema),
  recentExpenses: z.array(adminFinanceRecentExpenseSchema),
});

export const qrCodeDesignSchema = z.object({
  foregroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1F2937"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#FFFFFF"),
  transparentBackground: z.boolean().default(false),
  margin: z.number().int().min(0).max(8).default(2),
});
const defaultQRCodeDesign = {
  foregroundColor: "#1F2937",
  backgroundColor: "#FFFFFF",
  transparentBackground: false,
  margin: 2,
} as const;

export const qrCodeUrlDestinationSchema = z.object({
  url: z.string().url(),
});

export const qrCodeWhatsappDestinationSchema = z.object({
  phone: z.string().trim().min(6).max(32),
  message: z.string().trim().max(500).optional().nullable().default(null),
});

export const qrCodeVCardDestinationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().nullable().default(null),
  jobTitle: z.string().trim().max(120).optional().nullable().default(null),
  phone: z.string().trim().min(6).max(32).optional().nullable().default(null),
  email: z.string().email().optional().or(z.literal("")).nullable().default(null),
  website: z.string().url().optional().or(z.literal("")).nullable().default(null),
  address: z.string().trim().max(240).optional().nullable().default(null),
});

export const qrCodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string(),
  type: z.enum(qrCodeTypeValues),
  status: z.enum(qrCodeStatusValues),
  destinationConfig: z.union([
    qrCodeUrlDestinationSchema,
    qrCodeWhatsappDestinationSchema,
    qrCodeVCardDestinationSchema,
  ]),
  designConfig: qrCodeDesignSchema,
  publicUrl: z.string().url(),
  resolvedTarget: z.string().url().optional().nullable(),
  scanCount: z.number().int().nonnegative(),
  lastScannedAt: z.string().datetime().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminQRCodeInputSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().trim().min(2).max(120),
    type: z.literal("url"),
    status: z.enum(qrCodeStatusValues).default("active"),
    designConfig: qrCodeDesignSchema.default(defaultQRCodeDesign),
    destinationConfig: qrCodeUrlDestinationSchema,
  }),
  z.object({
    name: z.string().trim().min(2).max(120),
    type: z.literal("whatsapp"),
    status: z.enum(qrCodeStatusValues).default("active"),
    designConfig: qrCodeDesignSchema.default(defaultQRCodeDesign),
    destinationConfig: qrCodeWhatsappDestinationSchema,
  }),
  z.object({
    name: z.string().trim().min(2).max(120),
    type: z.literal("vcard"),
    status: z.enum(qrCodeStatusValues).default("active"),
    designConfig: qrCodeDesignSchema.default(defaultQRCodeDesign),
    destinationConfig: qrCodeVCardDestinationSchema,
  }),
]);

export const updateQRCodeStatusSchema = z.object({
  status: z.enum(qrCodeStatusValues),
});

export const qrCodePreviewSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("url"),
    designConfig: qrCodeDesignSchema.default(defaultQRCodeDesign),
    destinationConfig: qrCodeUrlDestinationSchema,
  }),
  z.object({
    type: z.literal("whatsapp"),
    designConfig: qrCodeDesignSchema.default(defaultQRCodeDesign),
    destinationConfig: qrCodeWhatsappDestinationSchema,
  }),
  z.object({
    type: z.literal("vcard"),
    designConfig: qrCodeDesignSchema.default(defaultQRCodeDesign),
    destinationConfig: qrCodeVCardDestinationSchema,
  }),
]);

export const qrCodePreviewResponseSchema = z.object({
  resolvedTarget: z.string().url().optional().nullable(),
  previewUrl: z.string().url(),
  svg: z.string(),
});

export const qrCodeResolveSchema = z.object({
  token: z.string(),
  status: z.enum(qrCodeStatusValues),
  type: z.enum(qrCodeTypeValues),
  name: z.string(),
  targetUrl: z.string().url().optional().nullable(),
  publicUrl: z.string().url(),
  vcard: qrCodeVCardDestinationSchema.optional(),
});

export const adminExpenseListResponseSchema = z.object({
  items: z.array(expenseSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  summary: adminExpenseSummarySchema,
});

export const createOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerWhatsapp: z.string().trim().max(40).default(""),
  customerNote: z.string().max(1200).optional().default(""),
  items: z.array(orderItemInputSchema).min(1),
});

export const updateOrderSchema = z.object({
  status: z.enum(orderStatusValues).optional(),
  finalPrice: moneySchema.optional().nullable(),
  adminNote: z.string().max(1200).optional().nullable(),
});

export const createAdminOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerWhatsapp: z.string().trim().max(40).default(""),
  customerNote: z.string().max(1200).optional().default(""),
  internalNote: z.string().max(4000).optional().nullable(),
  status: z.enum(orderStatusValues).default("nuevo"),
  finalPrice: moneySchema.optional().nullable(),
  items: z.array(adminOrderItemSchema).default([]),
  payments: z.array(adminOrderPaymentInputSchema).default([]),
});

export const updateAdminOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerWhatsapp: z.string().trim().max(40).default(""),
  customerNote: z.string().max(1200).optional().default(""),
  internalNote: z.string().max(4000).optional().nullable(),
  status: z.enum(orderStatusValues).default("nuevo"),
  finalPrice: moneySchema.optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  items: z.array(adminOrderItemSchema).default([]),
});

export const updateAdminOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
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
  customFields: z.array(customFieldSchema).default([]),
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
export type AdminOrderItemAdjustment = z.infer<typeof adminOrderItemAdjustmentSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type CreateAdminOrderInput = z.infer<typeof createAdminOrderSchema>;
export type UpdateAdminOrderInput = z.infer<typeof updateAdminOrderSchema>;
export type UpdateAdminOrderStatusInput = z.infer<typeof updateAdminOrderStatusSchema>;
export type AdminOrderPaymentInput = z.infer<typeof adminOrderPaymentInputSchema>;
export type AdminExpenseInput = z.infer<typeof adminExpenseInputSchema>;
export type AdminExpenseQuery = z.infer<typeof adminExpenseQuerySchema>;
export type AdminExpense = z.infer<typeof expenseSchema>;
export type AdminExpenseSummary = z.infer<typeof adminExpenseSummarySchema>;
export type AdminExpenseListResponse = z.infer<typeof adminExpenseListResponseSchema>;
export type AdminFinanceRangePreset = z.infer<typeof adminFinanceRangePresetSchema>;
export type AdminFinanceQuery = z.infer<typeof adminFinanceQuerySchema>;
export type AdminFinanceSummary = z.infer<typeof adminFinanceSummarySchema>;
export type AdminFinanceSeriesPoint = z.infer<typeof adminFinanceSeriesPointSchema>;
export type AdminFinanceOverview = z.infer<typeof adminFinanceOverviewSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type QRCode = z.infer<typeof qrCodeSchema>;
export type QRCodeDesign = z.infer<typeof qrCodeDesignSchema>;
export type QRCodeUrlDestination = z.infer<typeof qrCodeUrlDestinationSchema>;
export type QRCodeWhatsappDestination = z.infer<typeof qrCodeWhatsappDestinationSchema>;
export type QRCodeVCardDestination = z.infer<typeof qrCodeVCardDestinationSchema>;
export type AdminQRCodeInput = z.infer<typeof adminQRCodeInputSchema>;
export type UpdateQRCodeStatusInput = z.infer<typeof updateQRCodeStatusSchema>;
export type QRCodePreviewInput = z.infer<typeof qrCodePreviewSchema>;
export type QRCodePreviewResponse = z.infer<typeof qrCodePreviewResponseSchema>;
export type QRCodeResolveResponse = z.infer<typeof qrCodeResolveSchema>;

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  materia_prima: "Materia Prima",
  servicios: "Servicios",
  publicidad: "Publicidad",
  salario: "Salario",
  viaticos: "Viáticos",
  otros: "Otros",
};

export const expensePaymentMethodLabels: Record<ExpensePaymentMethod, string> = {
  efectivo: "Efectivo",
  yappy: "Yappy",
  transferencia: "Transferencia",
  tarjeta_credito: "Tarjeta de Crédito",
  otro: "Otro",
};

export type OrderItemUnit = {
  id: string;
  position: number;
  label?: string | null;
  personalization: Record<string, string | string[]>;
};

export type OrderItem = {
  id: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  extrasTotal: number;
  lineTotal: number;
  skuSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  unitLabel?: string | null;
  selectedExtraIds?: string[];
  appliedAdjustments?: AdminOrderItemAdjustment[];
  personalization: Record<string, string | string[]>;
  isDone: boolean;
  units: OrderItemUnit[];
};

export type OrderPayment = {
  id: string;
  amount: number;
  method: OrderPaymentMethod;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  code: string;
  source: OrderSource;
  status: OrderStatus;
  customerName: string;
  customerWhatsapp: string;
  customerNote?: string | null;
  estimatedTotal: number;
  finalPrice?: number | null;
  adminNote?: string | null;
  internalNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  itemsTotal: number;
  paidTotal: number;
  balance: number;
  isPaid: boolean;
  items: OrderItem[];
  payments?: OrderPayment[];
};

export function formatCurrency(value: number, currencySymbol = "B/."): string {
  return `${currencySymbol}${value.toFixed(2)}`;
}

export type ProductMediaRenderable = Pick<ProductMedia, "type" | "url" | "posterUrl">;
export type ProductMediaSurface = "hero" | "card" | "thumbnail" | "viewer" | "seo";

export function resolveVideoPosterUrl(media?: ProductMediaRenderable | null): string | undefined {
  if (!media || media.type !== "video") return undefined;
  return media.posterUrl ?? undefined;
}

export function resolveMediaStillUrl(media?: ProductMediaRenderable | null): string | undefined {
  if (!media) return undefined;
  return media.type === "video" ? resolveVideoPosterUrl(media) : media.url;
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
