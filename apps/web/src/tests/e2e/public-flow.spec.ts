import { expect, test } from "@playwright/test";
import path from "node:path";

const adminPassword = process.env.ADMIN_PASSWORD ?? "artenova-dev-2026";

async function loginAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@artenova.local");
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL("**/admin");
}

test("public site exposes the informative product path", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /contacto/i })).toBeVisible();
  await expect(page.getByText("Desde").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /consultar/i }).first()).toBeVisible();
});

test("guest opens a product and can consult by WhatsApp", async ({ page }) => {
  await page.goto("/catalogo");
  await page.locator('a[href^="/producto/"]').first().click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Desde")).toBeVisible();
  await expect(page.getByLabel(/Cantidad/i)).toHaveCount(0);
  await expect(page.getByText(/datos personalizados/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /agregar/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /consultar por whatsapp|contactar/i })).toBeVisible();
});

test("admin can create and pause a category", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const name = `Categoría E2E ${suffix}`;
  const slug = `e2e-categoria-${suffix}`;

  await loginAdmin(page);
  await page.goto("/admin/categorias");
  await page.getByRole("button", { name: /nueva categoría/i }).click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Enlace corto").fill(slug);
  await page.getByLabel(/descripción/i).fill("Creada desde prueba E2E.");
  await page.getByRole("button", { name: /guardar categoría/i }).click();

  await expect(page.getByText(name)).toBeVisible();
  await page.getByRole("button", { name: /pausar categoría/i }).click();
  await expect(page.getByText(/pausada/i)).toBeVisible();
});

test("admin can create a product with image and price tiers", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const categoryName = `Cat Producto E2E ${suffix}`;
  const categorySlug = `cat-producto-e2e-${suffix}`;
  const productName = `Producto E2E ${suffix}`;
  const productSlug = `producto-e2e-${suffix}`;

  await loginAdmin(page);

  await page.goto("/admin/categorias/nuevo");
  await page.getByLabel("Nombre").fill(categoryName);
  await page.getByLabel("Enlace corto").fill(categorySlug);
  await page.getByLabel(/descripción/i).fill("Categoría para probar productos.");
  await page.getByRole("button", { name: /guardar categoría/i }).click();
  await expect(page.getByText(categoryName)).toBeVisible();

  await page.goto("/admin/productos/nuevo");
  await page.getByLabel("Nombre").fill(productName);
  await page.getByLabel("Enlace corto").fill(productSlug);
  await page.getByLabel(/descripción/i).fill("Producto creado desde el flujo admin E2E.");
  await page.getByLabel("Categoría").click();
  await page.getByRole("option", { name: categoryName }).click({ force: true });
  await page.getByLabel("Precio base").fill("12.50");

  await page.setInputFiles('input[type="file"]', path.resolve("public/seed/mascotas/mascotas-1.jpg"));
  await expect(page.getByRole("img", { name: productName })).toHaveAttribute("src", /products\//);

  await page.getByRole("button", { name: /agregar precio/i }).click();
  await page.getByLabel("Cantidad mínima").nth(0).fill("6");
  await page.getByLabel("Precio unitario").nth(0).fill("10");
  await page.getByLabel("Texto visible").nth(0).fill("6 unidades - $60.00");
  await page.getByRole("button", { name: /agregar precio/i }).click();
  await page.getByLabel("Cantidad mínima").nth(1).fill("12");
  await page.getByLabel("Precio unitario").nth(1).fill("9");
  await page.getByLabel("Texto visible").nth(1).fill("12 unidades - $108.00");
  await page.getByRole("button", { name: /guardar producto/i }).click();

  await page.goto(`/producto/${productSlug}`);
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await expect(page.getByText("Precios por cantidad")).toBeVisible();
  await expect(page.getByText("6 unidades - $60.00")).toBeVisible();
  await expect(page.getByText("12 unidades - $108.00")).toBeVisible();
  await expect(page.getByRole("link", { name: /consultar por whatsapp|contactar/i })).toBeVisible();
});
