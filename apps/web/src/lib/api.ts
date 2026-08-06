import type { AdminCategoryInput, AdminProductReviewInput, Category, CreateOrderInput, CreateProductReviewInput, CustomField, Order, PriceTier, Product, ProductExtra, ProductMedia, ProductOption, ProductOptionValue, ProductReview, ProductVariant, SiteSettings, UpdateOrderInput } from "@artenova/shared";

type AdminProductPayload = Omit<Partial<Product>, "media" | "priceTiers" | "extras" | "customFields" | "variants" | "pricingSummary" | "reviews" | "reviewSummary"> & {
  id?: string;
  media?: Array<Omit<ProductMedia, "id">>;
  priceTiers?: Array<Omit<PriceTier, "id">>;
  extras?: Array<Omit<ProductExtra, "id">>;
  customFields?: Array<Omit<CustomField, "id">>;
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
    throw new Error(body.message ?? "No se pudo completar la solicitud");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  settings: () => request<SiteSettings>("/api/catalog/settings"),
  categories: () => request<Category[]>("/api/catalog/categories"),
  products: (params: URLSearchParams) => request<Product[]>(`/api/catalog/products?${params.toString()}`),
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
  adminCategories: () => request<Category[]>("/api/admin/categories"),
  adminCategory: (id: string) => request<Category>(`/api/admin/categories/${id}`),
  saveAdminCategory: (category: AdminCategoryInput & { id?: string }) =>
    request<Category>(category.id ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
      method: category.id ? "PUT" : "POST",
      body: JSON.stringify(category)
    }),
  pauseAdminCategory: (id: string) => request<Category>(`/api/admin/categories/${id}`, { method: "DELETE" }),
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
  adminOrders: () => request<Order[]>("/api/admin/orders"),
  updateOrder: (id: string, input: UpdateOrderInput) =>
    request<Order>(`/api/admin/orders/${id}`, { method: "PUT", body: JSON.stringify(input) })
};
