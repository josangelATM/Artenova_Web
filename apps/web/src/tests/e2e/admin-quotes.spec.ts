import { expect, test, type Page } from "@playwright/test";

async function mockAdmin(page: Page, catalogAvailable = true) {
  await page.route("**/api/admin/me", (route) => route.fulfill({ json: { id: "admin" } }));
  await page.route("**/api/catalog/settings", (route) => route.fulfill({
    json: { brandName: "Artenova", whatsapp: "6000-0000", email: "ventas@example.test", address: "Panamá" }
  }));
  await page.route("**/api/admin/products", (route) => catalogAvailable ? route.fulfill({
    json: [{
      id: "recognition", name: "Reconocimiento", minimumSaleQuantity: 1, variants: [
        { id: "gold", name: "Dorado", isActive: true, basePrice: 16, discountType: "percentage",
          discountValue: 10, priceTiers: [{ minQuantity: 3, unitPrice: 12, totalPrice: 32.23 }] },
        { id: "retired", name: "Retirado", isActive: false }
      ]
    }]
  }) : route.fulfill({ status: 503, json: { message: "Error de catálogo" } }));
}

test("descarga una cotización mixta con precio de paquete e ITBMS", async ({ page }, testInfo) => {
  await mockAdmin(page);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/") && request.method() !== "GET") mutations.push(request.url());
  });
  await page.goto("/admin/cotizaciones");
  await expect(page.getByRole("heading", { name: "Cotizaciones" })).toBeVisible();
  const downloadButton = page.getByRole("button", { name: "Descargar PDF" });
  await downloadButton.click();
  await expect(page.getByText("Ingresa el nombre o empresa del cliente.")).toBeVisible();
  await page.getByLabel("Nombre o empresa").fill("Compañía Álvarez");
  await page.getByLabel("Razón social").fill("Artenova Taller Creativo, S.A.");
  await page.getByRole("textbox", { name: "RUC/DV", exact: true }).first().fill("155000000-2-2026 DV 08");
  await page.getByRole("textbox", { name: "RUC/DV", exact: true }).last().fill("155000001-2-2026 DV 15");
  await page.getByRole("textbox", { name: "Contacto", exact: true }).fill("Lucía Álvarez");
  await page.getByLabel("Teléfono").fill("6000-0123");
  await page.getByRole("textbox", { name: "Correo", exact: true }).last().fill("lucia@example.test");
  await page.getByRole("textbox", { name: "Dirección", exact: true }).last().fill("Ciudad de Panamá");
  await page.getByLabel("Referencia").fill("Reconocimientos para la ceremonia de fin de año");
  await page.locator('input[type="date"]').first().fill("2026-11-13");
  await page.getByLabel("Vigente hasta").fill("2026-11-28");
  await page.getByLabel("Plazo de entrega").fill("Cinco días hábiles.");
  await page.getByLabel("Condiciones de pago").fill("50 % de anticipo.");
  await page.getByLabel("Observaciones").fill("Incluye una revisión del diseño.");
  const catalog = page.getByRole("combobox", { name: "Agregar producto del catálogo" });
  await catalog.fill("Reconocimiento");
  await expect(page.getByRole("option")).toHaveCount(1);
  await page.getByRole("option", { name: "Reconocimiento · Dorado" }).click();
  await catalog.fill("Reconocimiento");
  await page.getByRole("option", { name: "Reconocimiento · Dorado" }).click();
  await page.getByRole("textbox", { name: "Cantidad", exact: true }).first().fill("3");
  await expect(page.getByText(/Precio por paquete/)).toBeVisible();
  await page.getByLabel("Precio unitario (USD)").nth(1).fill("20");
  await page.getByRole("button", { name: "Agregar línea manual" }).click();
  await page.getByLabel("Descripción").last().fill("Diseño y preparación");
  await page.getByLabel("Precio unitario (USD)").last().fill("10,00");
  await page.getByRole("combobox", { name: "Descuento" }).click();
  await page.getByRole("option", { name: "Monto fijo" }).click();
  await page.getByLabel("Descuento (USD)").fill("5");
  await page.getByRole("switch", { name: "Aplicar ITBMS" }).check();
  await downloadButton.click();
  await expect(page.getByText(/Ingresa una tasa de ITBMS/)).toBeVisible();
  await page.getByLabel("Tasa de ITBMS (%)").fill("7");
  await expect(page.getByText(/57\.79/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  await download.saveAs(testInfo.outputPath("cotizacion-mixta.pdf"));
  expect(mutations).toEqual([]);
  await page.reload();
  await expect(page.getByLabel("Nombre o empresa")).toHaveValue("");
  await expect(page.getByLabel("Descripción")).toHaveCount(0);
  await page.getByLabel("Nombre o empresa").fill("María Núñez");
  await page.getByRole("button", { name: "Agregar línea manual" }).click();
  await page.getByLabel("Descripción").fill("Grabación personalizada");
  await page.getByLabel("Precio unitario (USD)").fill("20");
  const shortDownload = page.waitForEvent("download");
  await downloadButton.click();
  await (await shortDownload).saveAs(testInfo.outputPath("cotizacion-corta.pdf"));
});

test("permite cotizar manualmente y reintentar la descarga", async ({ page, context }, testInfo) => {
  await mockAdmin(page, false);
  let blockLogo = true;
  await context.route("**/brand/artenova-logo.png", (route) =>
    blockLogo && route.request().resourceType() === "fetch" ? route.abort() : route.continue()
  );
  await page.goto("/admin/cotizaciones");
  await expect(page.getByText(/No se pudo cargar el catálogo/)).toBeVisible();
  await page.getByLabel("Nombre o empresa").fill("Óscar Núñez");
  await page.getByLabel("Referencia").fill("PRUEBA 32");
  for (let i = 0; i < 15; i++) {
    await page.getByRole("button", { name: "Agregar línea manual" }).click();
    await page.getByLabel("Descripción").last().fill(`Línea ${i + 1}. ${"Grabación, preparación y empaque. ".repeat(10)}`);
    await page.getByLabel("Precio unitario (USD)").last().fill("1.50");
  }
  await page.getByLabel("Observaciones").fill(
    "Entrega en Panamá. Incluye revisión del diseño.\n" +
    Array.from({ length: 75 }, (_, i) => `Condición ${i + 1}. Confirmar el diseño antes de iniciar la producción.`).join("\n")
  );
  const downloadButton = page.getByRole("button", { name: "Descargar PDF" });
  await downloadButton.click();
  await expect(page.getByText(/No se pudo generar el PDF/)).toBeVisible();
  await expect(page.getByLabel("Nombre o empresa")).toHaveValue("Óscar Núñez");
  blockLogo = false;
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Cotizacion-PRUEBA-32.pdf");
  await download.saveAs(testInfo.outputPath("cotizacion-manual.pdf"));
});

test("requiere una sesión de admin", async ({ page }) => {
  await page.route("**/api/admin/me", (route) => route.fulfill({ status: 401, json: { message: "No autorizado" } }));
  await page.goto("/admin/cotizaciones");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("button", { name: "Descargar PDF" })).toHaveCount(0);
});
