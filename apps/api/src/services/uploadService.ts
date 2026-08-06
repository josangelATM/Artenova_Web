import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env, hasS3Config } from "../env";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm"]);
const execFileAsync = promisify(execFile);

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

const s3 = hasS3Config
  ? new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    })
  : null;

function sanitizeBaseName(name: string, fallback: string) {
  const safe = path.basename(name, path.extname(name)).replace(/[^a-z0-9_-]+/gi, "-").slice(0, 60);
  return safe || fallback;
}

function safeProductKey(productSlugOrId: string) {
  return productSlugOrId.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "product";
}

function isImageUpload(file: Express.Multer.File) {
  return allowedImageTypes.has(file.mimetype);
}

function isVideoUpload(file: Express.Multer.File) {
  return allowedVideoTypes.has(file.mimetype);
}

function canAutogenerateVideoPoster() {
  return Boolean(env.FFMPEG_PATH?.trim());
}

function resolveStoredMediaUrl(key: string) {
  if (env.UPLOAD_DRIVER === "local") {
    const baseUrl = env.API_BASE_URL.replace(/\/$/, "");
    return `${baseUrl}/uploads/${key}`;
  }

  const baseUrl = env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "");
  return `${baseUrl}/${key}`;
}

export async function createVideoPosterBuffer(videoBuffer: Buffer, sourceName = "video.mp4") {
  const ffmpegPath = env.FFMPEG_PATH?.trim();
  if (!ffmpegPath) {
    throw new UploadValidationError("Configura FFMPEG_PATH para autogenerar portadas de video.");
  }

  const tempId = randomUUID();
  const tempRoot = path.join(tmpdir(), "artenova-video-posters");
  const inputPath = path.join(tempRoot, `${tempId}${path.extname(sourceName) || ".mp4"}`);
  const outputPath = path.join(tempRoot, `${tempId}.webp`);

  await mkdir(tempRoot, { recursive: true });
  await writeFile(inputPath, videoBuffer);

  try {
    await execFileAsync(ffmpegPath, [
      "-y",
      "-ss",
      "00:00:00.200",
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      "scale='min(960,iw)':-2",
      "-q:v",
      "4",
      outputPath,
    ]);

    return await readFile(outputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo autogenerar la portada del video.";
    throw new UploadValidationError(message);
  } finally {
    await Promise.allSettled([rm(inputPath, { force: true }), rm(outputPath, { force: true })]);
  }
}

export async function storePosterBuffer(
  productSlugOrId: string,
  baseName: string,
  posterBuffer: Buffer,
  id: string = randomUUID(),
  kind: "poster" | "thumb" = "poster",
) {
  const safeProduct = safeProductKey(productSlugOrId);
  const safeBase = sanitizeBaseName(baseName, "video");
  const posterKey = `products/${safeProduct}/${id}-${safeBase}-${kind}.webp`;

  if (env.UPLOAD_DRIVER === "local") {
    const uploadRoot = path.resolve(env.LOCAL_UPLOAD_DIR);
    const posterPath = path.join(uploadRoot, posterKey);
    await mkdir(path.dirname(posterPath), { recursive: true });
    await writeFile(posterPath, posterBuffer);
    return { posterKey, posterUrl: resolveStoredMediaUrl(posterKey) };
  }

  if (!s3) {
    throw new Error("S3 no esta configurado");
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: posterKey,
      Body: posterBuffer,
      ContentType: "image/webp",
    }),
  );

  return { posterKey, posterUrl: resolveStoredMediaUrl(posterKey) };
}

export function assertMediaUpload(file: Express.Multer.File, posterFile?: Express.Multer.File) {
  if (!isImageUpload(file) && !isVideoUpload(file)) {
    throw new UploadValidationError("Solo se aceptan imagenes JPG, PNG o WEBP, o videos MP4/WebM");
  }

  if (isImageUpload(file) && file.size > 10 * 1024 * 1024) {
    throw new UploadValidationError("Cada imagen debe pesar maximo 10 MB");
  }

  if (isVideoUpload(file) && file.size > 40 * 1024 * 1024) {
    throw new UploadValidationError("Cada video debe pesar maximo 40 MB");
  }

  if (!isVideoUpload(file)) return;

  if (!posterFile && !canAutogenerateVideoPoster()) {
    throw new UploadValidationError("Cada video debe incluir una portada o configurar FFMPEG_PATH para generarla automaticamente");
  }

  if (!posterFile) return;

  if (!isImageUpload(posterFile)) {
    throw new UploadValidationError("La portada del video debe ser JPG, PNG o WEBP");
  }

  if (posterFile.size > 10 * 1024 * 1024) {
    throw new UploadValidationError("La portada del video debe pesar maximo 10 MB");
  }
}

export async function uploadProductMedia(file: Express.Multer.File, productSlugOrId: string, posterFile?: Express.Multer.File) {
  assertMediaUpload(file, posterFile);

  const mediaType = isVideoUpload(file) ? "video" : "image";
  const safeBase = sanitizeBaseName(file.originalname, mediaType);
  const safeProduct = safeProductKey(productSlugOrId);
  const id = randomUUID();
  const extension =
    file.mimetype === "image/png"
      ? ".png"
      : file.mimetype === "image/webp"
        ? ".webp"
        : file.mimetype === "video/webm"
          ? ".webm"
          : ".mp4";
  const key = `products/${safeProduct}/${id}-${safeBase}${extension}`;

  let posterBuffer: Buffer | null = null;
  if (mediaType === "image") {
    posterBuffer = await sharp(file.buffer).rotate().resize({ width: 480, height: 480, fit: "inside" }).webp({ quality: 78 }).toBuffer();
  } else if (posterFile) {
    posterBuffer = await sharp(posterFile.buffer).rotate().resize({ width: 960, height: 960, fit: "inside" }).webp({ quality: 82 }).toBuffer();
  } else {
    posterBuffer = await createVideoPosterBuffer(file.buffer, file.originalname);
  }

  const posterAsset = posterBuffer ? await storePosterBuffer(productSlugOrId, safeBase, posterBuffer, id, mediaType === "image" ? "thumb" : "poster") : null;

  if (env.UPLOAD_DRIVER === "local") {
    const uploadRoot = path.resolve(env.LOCAL_UPLOAD_DIR);
    const filePath = path.join(uploadRoot, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);
    return {
      type: mediaType,
      url: resolveStoredMediaUrl(key),
      posterUrl: posterAsset?.posterUrl ?? null,
    };
  }

  if (!s3) {
    throw new Error("S3 no esta configurado");
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return {
    type: mediaType,
    url: resolveStoredMediaUrl(key),
    posterUrl: posterAsset?.posterUrl ?? null,
  };
}
