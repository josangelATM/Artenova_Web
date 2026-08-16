import type { AdminCategoryInput, AdminExpense, AdminExpenseInput, AdminExpenseListResponse, AdminFinanceOverview, AdminOrderPaymentInput, AdminProductReviewInput, AdminQRCodeInput, CatalogProductListResponse, Category, CreateAdminOrderInput, CreateOrderInput, CreateProductReviewInput, CustomField, Order, PriceTier, Product, ProductExtra, ProductMedia, ProductOption, ProductOptionValue, ProductReview, ProductVariant, QRCode, QRCodePreviewInput, QRCodePreviewResponse, QRCodeResolveResponse, SiteSettings, UpdateAdminOrderInput, UpdateAdminOrderStatusInput, UpdateQRCodeStatusInput } from "@artenova/shared";

export type ApiValidationIssue = {
  path: Array<string | number>;
  key: string;
  message: string;
  code?: string;
};

type ApiErrorPayload = {
  message: string;
  issues: ApiValidationIssue[];
  fieldErrors: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeIssue(value: unknown): ApiValidationIssue | null {
  if (!isRecord(value) || typeof value.message !== "string") {
    return null;
  }

  const path = Array.isArray(value.path)
    ? value.path.filter((item) => typeof item === "string" || typeof item === "number")
    : [];
  const key = typeof value.key === "string"
    ? value.key
    : path.map(String).join(".");

  return {
    path,
    key,
    message: value.message,
    code: typeof value.code === "string" ? value.code : undefined,
  };
}

function normalizeFieldErrors(value: unknown) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => typeof item === "string"),
  ) as Record<string, string>;
}

export function parseApiErrorPayload(body: unknown, fallbackMessage: string): ApiErrorPayload {
  if (!isRecord(body)) {
    return { message: fallbackMessage, issues: [], fieldErrors: {} };
  }

  const issues = Array.isArray(body.issues)
    ? body.issues.map(normalizeIssue).filter((item): item is ApiValidationIssue => Boolean(item))
    : [];
  const fieldErrors = normalizeFieldErrors(body.fieldErrors);

  issues.forEach((issue) => {
    if (issue.key && !fieldErrors[issue.key]) {
      fieldErrors[issue.key] = issue.message;
    }
  });

  return {
    message: typeof body.message === "string" ? body.message : fallbackMessage,
    issues,
    fieldErrors,
  };
}

export class ApiRequestError extends Error {
  status: number;
  issues: ApiValidationIssue[];
  fieldErrors: Record<string, string>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.issues = payload.issues;
    this.fieldErrors = payload.fieldErrors;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

type AdminProductPayload = Omit<Partial<Product>, "media" | "priceTiers" | "extras" | "customFields" | "variants" | "pricingSummary" | "reviews" | "reviewSummary"> & {
  id?: string;
  media?: Array<Omit<ProductMedia, "id">>;
  priceTiers?: Array<Omit<PriceTier, "id">>;
  extras?: Array<Omit<ProductExtra, "id">>;
  customFields?: CustomField[];
  productOptions?: Array<
    Omit<ProductOption, "productId" | "values"> & {
      values?: ProductOptionValue[];
    }
  >;
  variants?: Array<
    Omit<ProductVariant, "pricingSummary" | "media" | "attributes" | "priceTiers" | "selections"> & {
      media?: Array<Omit<ProductMedia, "id">>;
      optionValueIds?: string[];
      priceTiers?: Array<Omit<PriceTier, "id">>;
    }
  >;
};

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiRequestError(response.status, parseApiErrorPayload(body, "No se pudo completar la solicitud"));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function requestAllowNotOk<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | { message?: string; status?: string } }> {
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data: data as T };
}

function assetUrl(path: string) {
  return `${baseUrl}${path}`;
}

export const api = {
  settings: () => request<SiteSettings>("/api/catalog/settings"),
  categories: () => request<Category[]>("/api/catalog/categories"),
  products: (params: URLSearchParams) => request<CatalogProductListResponse>(`/api/catalog/products?${params.toString()}`),
  product: (slug: string) => request<Product>(`/api/catalog/products/${slug}`),
  createProductReview: (slug: string, input: CreateProductReviewInput) =>
    request<ProductReview>(`/api/catalog/products/${slug}/reviews`, { method: "POST", body: JSON.stringify(input) }),
  createOrder: (input: CreateOrderInput) =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  getOrder: (code: string) => request<Order>(`/api/orders/${code}`),
  uploadProductMedia: (input: { file: File; slug: string; alt: string; position: number; poster?: File | null }) => {
    const data = new FormData();
    data.append("file", input.file);
    if (input.poster) data.append("poster", input.poster);
    data.append("slug", input.slug);
    data.append("alt", input.alt);
    data.append("position", String(input.position));
    return request<{ url: string; type: "image" | "video"; alt: string; position: number; posterUrl?: string | null }>("/api/admin/products/media", { method: "POST", body: data });
  },
  adminLogin: (email: string, password: string) =>
    request<{ id: string; email: string }>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  adminMe: () => request<{ sub: string; email: string }>("/api/admin/me"),
  adminDashboard: () =>
    request<{ counts: { orders: number; products: number; categories: number; reviews?: number }; latestOrders: Order[] }>("/api/admin/dashboard"),
  adminFinanceOverview: (params: URLSearchParams) => request<AdminFinanceOverview>(`/api/admin/finance/overview?${params.toString()}`),
  adminCategories: () => request<Category[]>("/api/admin/categories"),
  adminCategory: (id: string) => request<Category>(`/api/admin/categories/${id}`),
  saveAdminCategory: (category: AdminCategoryInput & { id?: string }) =>
    request<Category>(category.id ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
      method: category.id ? "PUT" : "POST",
      body: JSON.stringify(category)
    }),
  pauseAdminCategory: (id: string) => request<Category>(`/api/admin/categories/${id}`, { method: "DELETE" }),
  adminExpenses: (params: URLSearchParams) => request<AdminExpenseListResponse>(`/api/admin/expenses?${params.toString()}`),
  adminExpense: (id: string) => request<AdminExpense>(`/api/admin/expenses/${id}`),
  saveAdminExpense: (expense: AdminExpenseInput & { id?: string }) =>
    request<AdminExpense>(expense.id ? `/api/admin/expenses/${expense.id}` : "/api/admin/expenses", {
      method: expense.id ? "PUT" : "POST",
      body: JSON.stringify(expense)
    }),
  deleteAdminExpense: (id: string) => request<void>(`/api/admin/expenses/${id}`, { method: "DELETE" }),
  adminProducts: () => request<Product[]>("/api/admin/products"),
  adminProduct: (id: string) => request<Product>(`/api/admin/products/${id}`),
  saveAdminProduct: (product: AdminProductPayload) =>
    request<Product>(product.id ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: product.id ? "PUT" : "POST",
      body: JSON.stringify(product)
    }),
  adminReviews: (params: URLSearchParams) => request<ProductReview[]>(`/api/admin/reviews?${params.toString()}`),
  adminReview: (id: string) => request<ProductReview>(`/api/admin/reviews/${id}`),
  saveAdminReview: (review: AdminProductReviewInput & { id?: string }) =>
    request<ProductReview>(review.id ? `/api/admin/reviews/${review.id}` : "/api/admin/reviews", {
      method: review.id ? "PUT" : "POST",
      body: JSON.stringify(review)
    }),
  setAdminReviewApproval: (id: string, isApproved: boolean) =>
    request<ProductReview>(`/api/admin/reviews/${id}/approval`, { method: "PATCH", body: JSON.stringify({ isApproved }) }),
  deleteAdminReview: (id: string) => request<void>(`/api/admin/reviews/${id}`, { method: "DELETE" }),
  adminOrders: (params?: URLSearchParams) => request<Order[]>(`/api/admin/orders${params ? `?${params.toString()}` : ""}`),
  adminOrder: (id: string) => request<Order>(`/api/admin/orders/${id}`),
  createAdminOrder: (input: CreateAdminOrderInput) =>
    request<Order>("/api/admin/orders", { method: "POST", body: JSON.stringify(input) }),
  updateAdminOrder: (id: string, input: UpdateAdminOrderInput) =>
    request<Order>(`/api/admin/orders/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  createOrderPayment: (id: string, input: AdminOrderPaymentInput) =>
    request<Order>(`/api/admin/orders/${id}/payments`, { method: "POST", body: JSON.stringify(input) }),
  updateAdminOrderStatus: (id: string, input: UpdateAdminOrderStatusInput) =>
    request<Order>(`/api/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify(input) }),
  adminQRCodes: () => request<QRCode[]>("/api/admin/qrs"),
  adminQRCode: (id: string) => request<QRCode>(`/api/admin/qrs/${id}`),
  saveAdminQRCode: (id: string | undefined, input: AdminQRCodeInput) =>
    request<QRCode>(id ? `/api/admin/qrs/${id}` : "/api/admin/qrs", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input)
    }),
  updateAdminQRCodeStatus: (id: string, input: UpdateQRCodeStatusInput) =>
    request<QRCode>(`/api/admin/qrs/${id}/status`, { method: "PUT", body: JSON.stringify(input) }),
  previewQRCode: (input: QRCodePreviewInput) =>
    request<QRCodePreviewResponse>("/api/admin/qrs/preview", { method: "POST", body: JSON.stringify(input) }),
  qrCodeSvgUrl: (id: string, download = false) => assetUrl(`/api/admin/qrs/${id}/code.svg${download ? "?download=1" : ""}`),
  qrCodePngUrl: (id: string, download = false) => assetUrl(`/api/admin/qrs/${id}/code.png${download ? "?download=1" : ""}`),
  resolveQRCode: (token: string) => requestAllowNotOk<QRCodeResolveResponse>(`/api/qrs/${token}/resolve`),
  qrVCardUrl: (token: string) => assetUrl(`/api/qrs/${token}/contact.vcf`)
};
