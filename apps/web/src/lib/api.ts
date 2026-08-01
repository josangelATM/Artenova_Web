import type { AdminCategoryInput, Category, CreateOrderInput, Order, Product, SiteSettings, UpdateOrderInput } from "@artenova/shared";

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
  createOrder: (input: CreateOrderInput) =>
    request<Order>("/api/orders", { method: "POST", body: JSON.stringify(input) }),
  getOrder: (code: string) => request<Order>(`/api/orders/${code}`),
  uploadOrderFiles: (code: string, files: File[]) => {
    const data = new FormData();
    files.forEach((file) => data.append("files", file));
    return request(`/api/orders/${code}/uploads`, { method: "POST", body: data });
  },
  adminLogin: (email: string, password: string) =>
    request<{ id: string; email: string }>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  adminMe: () => request<{ sub: string; email: string }>("/api/admin/me"),
  adminDashboard: () =>
    request<{ counts: { orders: number; products: number; categories: number }; latestOrders: Order[] }>("/api/admin/dashboard"),
  adminCategories: () => request<Category[]>("/api/admin/categories"),
  saveAdminCategory: (category: AdminCategoryInput & { id?: string }) =>
    request<Category>(category.id ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
      method: category.id ? "PUT" : "POST",
      body: JSON.stringify(category)
    }),
  pauseAdminCategory: (id: string) => request<Category>(`/api/admin/categories/${id}`, { method: "DELETE" }),
  adminProducts: () => request<Product[]>("/api/admin/products"),
  saveAdminProduct: (product: Partial<Product> & { id?: string }) =>
    request<Product>(product.id ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: product.id ? "PUT" : "POST",
      body: JSON.stringify(product)
    }),
  adminOrders: () => request<Order[]>("/api/admin/orders"),
  updateOrder: (id: string, input: UpdateOrderInput) =>
    request<Order>(`/api/admin/orders/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  updateSettings: (input: SiteSettings) =>
    request<SiteSettings>("/api/admin/settings", { method: "PUT", body: JSON.stringify(input) })
};
