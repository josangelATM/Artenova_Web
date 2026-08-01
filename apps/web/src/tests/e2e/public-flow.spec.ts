import { expect, test } from "@playwright/test";
import path from "node:path";

test("public store exposes the core purchase path", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="/catalogo"]').first()).toBeVisible();
  await page.locator('a[href="/catalogo"]').first().click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByText("Desde").first()).toBeVisible();
});

test("guest creates an order with an image and admin can see it", async ({ page }) => {
  await page.goto("/catalogo");
  await page.locator('a[href^="/producto/"]').first().click();
  await page.waitForLoadState("networkidle");

  await page.locator('input[type="number"]').first().fill("6");
  const textInputs = page.locator('input[type="text"]');
  if (await textInputs.count()) {
    await textInputs.first().fill("QA Playwright");
  }
  const dateInputs = page.locator('input[type="date"]');
  if (await dateInputs.count()) {
    await dateInputs.first().fill("2026-08-24");
  }
  const textAreas = page.locator("textarea");
  if (await textAreas.count()) {
    await textAreas.first().fill("Pedido validado por E2E.");
  }

  await page.getByRole("button", { name: /agregar al pedido/i }).click();
  await page.waitForURL("**/carrito");
  await page.getByLabel("Nombre").fill("Cliente E2E");
  await page.getByLabel("WhatsApp").fill("+50763333333");
  await page.getByLabel("Nota para Artenova").fill("Flujo E2E con imagen.");
  await page.setInputFiles('input[type="file"]', path.resolve("public/seed/mascotas/mascotas-2.jpg"));
  await page.getByRole("button", { name: /enviar pedido/i }).click();

  await page.waitForURL(/\/pedido\/ART-/);
  const orderCode = new URL(page.url()).pathname.split("/").pop();
  expect(orderCode).toBeTruthy();
  await expect(page.getByText(/pedido recibido/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(orderCode!)).toBeVisible();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("artenova-cart") ?? "[]").length)).toBe(0);

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@artenova.local");
  await page.getByLabel("Password").fill("change-me-now");
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL("**/admin");
  await page.goto("/admin/pedidos");
  await expect(page.getByText(orderCode!)).toBeVisible();
});

test("admin can create and pause a category", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const name = `Categoria E2E ${suffix}`;
  const slug = `e2e-categoria-${suffix}`;

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@artenova.local");
  await page.getByLabel("Password").fill("change-me-now");
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL("**/admin");

  await page.goto("/admin/categorias");
  await page.getByRole("button", { name: /nueva categoria|nueva categoría/i }).click();
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel(/descripcion|descripción/i).fill("Creada desde prueba E2E.");
  await page.getByLabel(/color/i).fill("#00897b");
  await page.getByRole("button", { name: /guardar categoria|guardar categoría/i }).click();

  await expect(page.getByText(/categoria guardada|categoría guardada/i)).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`${name}.*activa`, "i") })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(`${name}.*activa`, "i") }).click();
  await page.getByRole("button", { name: /pausar/i }).click();
  await expect(page.getByText(/categoria pausada|categoría pausada/i)).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`${name}.*pausada`, "i") })).toBeVisible();
});
