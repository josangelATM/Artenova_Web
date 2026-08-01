import type { AdminCategoryInput, AdminTagInput, Category, CreateOrderInput, Order, Product, SiteSettings, Tag, UpdateOrderInput } from "@artenova/shared";

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
  tags: () => request<Tag[]>("/api/catalog/tags"),
  products: (params: URLSearchParams) => request<Product[]>(`/api/catalog/products?${params.toString()}`),
  product: (slug: string) => request<Product>(`/api/catalog/products/${slug}`),
  createOrder: (input: CreateOrderInput) =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  getOrder: (code: string) => request<Order>(`/api/orders/${code}`),
  uploadProductImage: (input: { file: File; slug: string; alt: string; position: number }) => {
    const data = new FormData();
    data.append("file", input.file);
    data.append("slug", input.slug);
    data.append("alt", input.alt);
    data.append("position", String(input.position));
    return request<{ url: string; alt: string; position: number }>("/api/admin/products/images", { method: "POST", body: data });
  },
  adminLogin: (email: string, password: string) =>
    request<{ id: string; email: string }>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  adminMe: () => request<{ sub: string; email: string }>("/api/admin/me"),
  adminDashboard: () =>
    request<{ counts: { orders: number; products: number; categories: number; tags?: number }; latestOrders: Order[] }>("/api/admin/dashboard"),
  adminCategories: () => request<Category[]>("/api/admin/categories"),
  saveAdminCategory: (category: AdminCategoryInput & { id?: string }) =>
    request<Category>(category.id ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
      method: category.id ? "PUT" : "POST",
      body: JSON.stringify(category)
    }),
  pauseAdminCategory: (id: string) => request<Category>(`/api/admin/categories/${id}`, { method: "DELETE" }),
  adminTags: () => request<Tag[]>("/api/admin/tags"),
  saveAdminTag: (tag: AdminTagInput & { id?: string }) =>
    request<Tag>(tag.id ? `/api/admin/tags/${tag.id}` : "/api/admin/tags", {
      method: tag.id ? "PUT" : "POST",
      body: JSON.stringify(tag)
    }),
  pauseAdminTag: (id: string) => request<Tag>(`/api/admin/tags/${id}`, { method: "DELETE" }),
  adminProducts: () => request<Product[]>("/api/admin/products"),
  saveAdminProduct: (product: Partial<Product> & { id?: string; tagIds?: string[] }) =>
    request<Product>(product.id ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: product.id ? "PUT" : "POST",
      body: JSON.stringify(product)
    }),
  adminOrders: () => request<Order[]>("/api/admin/orders"),
  updateOrder: (id: string, input: UpdateOrderInput) =>
    request<Order>(`/api/admin/orders/${id}`, { method: "PUT", body: JSON.stringify(input) })
};
