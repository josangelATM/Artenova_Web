import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env, hasS3Config } from "../env";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/mp4", "video/webm"]);

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

  if (!posterFile) {
    throw new UploadValidationError("Cada video debe incluir una portada");
  }

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

  let posterKey: string | null = null;
  let posterBuffer: Buffer | null = null;
  if (mediaType === "image") {
    posterKey = `products/${safeProduct}/${id}-${safeBase}-thumb.webp`;
    posterBuffer = await sharp(file.buffer).rotate().resize({ width: 480, height: 480, fit: "inside" }).webp({ quality: 78 }).toBuffer();
  } else if (posterFile) {
    posterKey = `products/${safeProduct}/${id}-${safeBase}-poster.webp`;
    posterBuffer = await sharp(posterFile.buffer).rotate().resize({ width: 960, height: 960, fit: "inside" }).webp({ quality: 82 }).toBuffer();
  }

  if (env.UPLOAD_DRIVER === "local") {
    const uploadRoot = path.resolve(env.LOCAL_UPLOAD_DIR);
    const filePath = path.join(uploadRoot, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);
    if (posterKey && posterBuffer) {
      await writeFile(path.join(uploadRoot, posterKey), posterBuffer);
    }
    const baseUrl = env.API_BASE_URL.replace(/\/$/, "");
    return {
      type: mediaType,
      url: `${baseUrl}/uploads/${key}`,
      posterUrl: posterKey ? `${baseUrl}/uploads/${posterKey}` : null,
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

  if (posterKey && posterBuffer) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: posterKey,
        Body: posterBuffer,
        ContentType: "image/webp",
      }),
    );
  }

  const baseUrl = env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "");
  return {
    type: mediaType,
    url: `${baseUrl}/${key}`,
    posterUrl: posterKey ? `${baseUrl}/${posterKey}` : null,
  };
}
