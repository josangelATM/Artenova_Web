import { expect, test } from "@playwright/test";

test("featured catalogs wrap responsively and open their category", async ({ page }, testInfo) => {
  await page.route("**/api/catalog/categories/featured", (route) => route.fulfill({ json: Array.from({ length: 5 }, (_, index) => ({
    id: String(index), name: `Colección ${index}`, slug: `coleccion-${index}`, href: `/catalogo/coleccion-${index}`,
    description: "Recuerdos personalizados para celebrar tus momentos especiales.",
    imageUrl: index === 4 ? null : "/seed/mascotas/cedulas-personalizadas-mascotas-hero.png",
  })) }));
  await page.goto("/");
  const section = page.getByRole("region", { name: "Catálogos destacados" });
  const cards = section.getByRole("link", { name: /^Ver catálogo:/ });
  const more = section.getByRole("link", { name: "Quiero ver más" });
  await expect(more).toHaveAttribute("href", "/catalogo");
  await expect(cards).toHaveCount(5);
  await section.scrollIntoViewIfNeeded();
  for (const [width, columns] of [[390, 1], [768, 2], [1280, 4]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(async () => {
      const boxes = await cards.evaluateAll((links) => links.map((link) => link.getBoundingClientRect().top));
      return boxes.filter((top) => Math.abs(top - (boxes[0] ?? 0)) < 2).length;
    }).toBe(columns);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(more).toBeVisible();
    const sectionBox = await section.boundingBox();
    const buttonBox = await more.boundingBox();
    const lastCardBox = await cards.last().boundingBox();
    expect(sectionBox && buttonBox && lastCardBox).toBeTruthy();
    if (sectionBox && buttonBox && lastCardBox) {
      expect(Math.abs(buttonBox.x + buttonBox.width / 2 - (sectionBox.x + sectionBox.width / 2))).toBeLessThan(2);
      expect(buttonBox.y).toBeGreaterThanOrEqual(lastCardBox.y + lastCardBox.height);
    }
  }
  await section.screenshot({ path: testInfo.outputPath("featured-catalogs.png") });
  await cards.first().click();
  await expect(page).toHaveURL(/\/catalogo\/coleccion-0$/);
  await page.goto("/");
  await more.click();
  await expect(page).toHaveURL(/\/catalogo$/);
});

test("category editor saves and reloads the featured choice", async ({ page }) => {
  let category = { id: "qa-featured", name: "Colección QA", slug: "qa", description: "Detalles", accentColor: null, isActive: true, isFeatured: false };
  await page.route("**/api/admin/me", (route) => route.fulfill({ json: { email: "admin@test.local" } }));
  await page.route("**/api/admin/categories/qa-featured", async (route) => {
    if (route.request().method() === "PUT") category = { ...category, ...route.request().postDataJSON() };
    await route.fulfill({ json: category });
  });
  await page.goto("/admin/categorias/qa-featured/editar");
  const checkbox = page.getByRole("checkbox", { name: "Destacar en el inicio" });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await page.getByRole("button", { name: "Guardar categoría" }).first().click();
  await expect(page.getByText("Categoría guardada")).toBeVisible();
  await page.reload();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await page.getByRole("button", { name: "Guardar categoría" }).first().click();
  await expect(page.getByText("Categoría guardada")).toBeVisible();
  await page.reload();
  await expect(checkbox).not.toBeChecked();
});
