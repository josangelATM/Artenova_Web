import { afterEach, describe, expect, it, vi } from "vitest";

function createFile(mimetype: string): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: mimetype.startsWith("video/") ? "demo.mp4" : "demo.jpg",
    encoding: "7bit",
    mimetype,
    size: 1024,
    destination: "",
    filename: "",
    path: "",
    buffer: Buffer.from("demo"),
    stream: undefined as never,
  };
}

async function loadUploadService() {
  vi.resetModules();
  return import("../services/uploadService");
}

describe("assertMediaUpload", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.FFMPEG_PATH;
  });

  it("permite videos sin portada manual cuando FFMPEG_PATH esta configurado", async () => {
    process.env.DATABASE_URL = "postgresql://demo:demo@localhost:5432/artenova";
    process.env.FFMPEG_PATH = "C:/ffmpeg/bin/ffmpeg.exe";
    const { assertMediaUpload } = await loadUploadService();

    expect(() => assertMediaUpload(createFile("video/mp4"))).not.toThrow();
  });

  it("rechaza videos sin portada cuando no hay FFMPEG_PATH", async () => {
    process.env.DATABASE_URL = "postgresql://demo:demo@localhost:5432/artenova";
    const { assertMediaUpload, UploadValidationError } = await loadUploadService();

    expect(() => assertMediaUpload(createFile("video/mp4"))).toThrow(UploadValidationError);
  });
});
