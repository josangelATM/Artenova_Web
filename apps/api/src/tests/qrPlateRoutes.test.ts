import express from "express";
import cookieParser from "cookie-parser";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { qrPlatePngHeight } from "../lib/qrPlate";

const db = vi.hoisted(() => ({ qRCode: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() } }));
vi.mock("../lib/prisma", () => ({ prisma: db }));
vi.mock("../env", () => ({ env: { SESSION_SECRET: "qr-plate-test-secret-only", APP_BASE_URL: "http://localhost" } }));
import { adminQrRouter } from "../routes/qrs";
import { signAdminToken } from "../middleware/auth";
import { errorHandler } from "../middleware/errors";

const plate = { message: "Si estoy perdido", contactText: "Ana\n\nGómez\n6000-0000" };
const cookie = `admin_session=${signAdminToken({ sub: "admin", email: "admin@example.com" })}`;
let server: Server;
let base: string;
let row: any;
beforeEach(async () => {
  vi.clearAllMocks();
  row = null;
  db.qRCode.create.mockImplementation(async ({ data }) => (row = { ...data, id: "qr1", createdAt: new Date(), updatedAt: new Date(), scanCount: 0 }));
  db.qRCode.findUnique.mockImplementation(async ({ where }) => where.id === row?.id ? row : null);
  db.qRCode.update.mockImplementation(async ({ data }) => (row = { ...row, ...data }));
  const app = express();
  app.use(express.json(), cookieParser());
  app.use("/qrs", adminQrRouter);
  app.use(errorHandler);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test port");
  base = `http://127.0.0.1:${address.port}/qrs`;
});
afterEach(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });
function request(path: string, method = "GET", body?: unknown, authenticated = true) {
  return fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(authenticated ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

describe("QR plate admin routes", () => {
  it("reads old JSON without writing and stores only contactText on explicit save", async () => {
    const legacyPlate = { message: plate.message, contacts: [{ name: "Ana\nGómez", phone: "6000-0000" }, { name: "José", phone: "6111-1111" }], backgroundColor: "#40A3BE", foregroundColor: "#FFFFFF" };
    row = { id: "qr1", token: "oldtoken", name: "Anterior", type: "url", status: "active", destinationConfig: { url: "https://example.com" }, designConfig: { plateConfig: legacyPlate }, createdAt: new Date(), updatedAt: new Date() };
    const read = await (await request("/qr1")).json();
    expect(read.designConfig.plateConfig.contactText).toBe("Ana\nGómez\n6000-0000\n\nJosé\n6111-1111");
    expect(row.designConfig.plateConfig).toEqual(legacyPlate);
    expect(db.qRCode.update).not.toHaveBeenCalled();
    const saved = await (await request("/qr1", "PUT", { name: read.name, type: read.type, status: read.status, destinationConfig: read.destinationConfig, designConfig: read.designConfig })).json();
    expect(saved.designConfig.plateConfig).not.toHaveProperty("contacts");
    expect(saved.designConfig.plateConfig).not.toHaveProperty("backgroundColor");
    expect(saved.designConfig.plateConfig).not.toHaveProperty("foregroundColor");
    expect(row.designConfig.plateConfig.contactText).toBe(read.designConfig.plateConfig.contactText);
    expect(saved.token).toBe("oldtoken");
  });
  it("roundtrips plate JSON, keeps the token when editing and exports both formats", async () => {
    const created = await request("/", "POST", { name: "Placa", type: "url", destinationConfig: { url: "https://example.com" }, designConfig: { plateConfig: plate } });
    expect(created.status).toBe(201);
    const saved = await created.json();
    expect(saved.designConfig.plateConfig).toEqual(plate);
    expect((await (await request("/qr1")).json()).designConfig.plateConfig).toEqual(plate);
    const updated = await (await request("/qr1", "PUT", { name: "Placa", type: "vcard", destinationConfig: { fullName: "Otro contacto" }, designConfig: { plateConfig: plate } })).json();
    expect(updated.token).toBe(saved.token);
    const preview = await (await request("/qr1/plate/preview", "POST", { plateConfig: plate })).json();
    expect(preview.previewUrl).toBe(saved.publicUrl);
    const svg = await request("/qr1/plate.svg?download=1");
    expect(svg.headers.get("content-type")).toContain("image/svg+xml");
    expect(svg.headers.get("content-disposition")).toContain(`placa-${saved.token}.svg`);
    expect(await svg.text()).toBe(preview.svg);
    const png = await request("/qr1/plate.png?download=1");
    expect(png.headers.get("content-type")).toContain("image/png");
    expect(await sharp(Buffer.from(await png.arrayBuffer())).metadata()).toMatchObject({ width: 1800, height: qrPlatePngHeight, hasAlpha: true });
    await request("/qr1", "PUT", { name: "Placa", type: "url", destinationConfig: { url: "https://example.com" }, designConfig: {} });
    expect((await request("/qr1/plate.svg")).status).toBe(404);
  });

  it("handles auth, validation, new preview and missing QR without touching stored data", async () => {
    expect((await request("/new/plate/preview", "POST", { plateConfig: plate }, false)).status).toBe(401);
    expect((await request("/new/plate/preview", "POST", { plateConfig: { ...plate, contactText: "" } })).status).toBe(400);
    expect((await (await request("/new/plate/preview", "POST", { plateConfig: plate })).json()).previewUrl).toBe("https://artenovapty.com/q/preview");
    expect((await request("/missing/plate/preview", "POST", { plateConfig: plate })).status).toBe(404);
    expect((await request("/missing/plate.png")).status).toBe(404);
    expect(db.qRCode.create).not.toHaveBeenCalled();
    expect(db.qRCode.update).not.toHaveBeenCalled();
  });
});
