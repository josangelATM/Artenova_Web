import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env, hasS3Config } from "../env";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!
      }
    })
  : null;

export function assertImageUpload(file: Express.Multer.File) {
  if (!allowedTypes.has(file.mimetype)) {
    throw new UploadValidationError("Solo se aceptan imágenes JPG, PNG o WEBP");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new UploadValidationError("Cada imagen debe pesar máximo 10 MB");
  }
}

export async function uploadProductImage(file: Express.Multer.File, productSlugOrId: string) {
  assertImageUpload(file);

  const extension = file.mimetype === "image/png" ? ".png" : file.mimetype === "image/webp" ? ".webp" : ".jpg";
  const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-z0-9_-]+/gi, "-").slice(0, 60);
  const safeProduct = productSlugOrId.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "product";
  const id = randomUUID();
  const key = `products/${safeProduct}/${id}-${safeBase}${extension}`;
  const thumbnailKey = `products/${safeProduct}/${id}-${safeBase}-thumb.webp`;
  const thumbnail = await sharp(file.buffer).rotate().resize({ width: 480, height: 480, fit: "inside" }).webp({ quality: 78 }).toBuffer();

  if (env.UPLOAD_DRIVER === "local") {
    const uploadRoot = path.resolve(env.LOCAL_UPLOAD_DIR);
    const filePath = path.join(uploadRoot, key);
    const thumbnailPath = path.join(uploadRoot, thumbnailKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.buffer);
    await writeFile(thumbnailPath, thumbnail);
    const baseUrl = env.API_BASE_URL.replace(/\/$/, "");
    return {
      key,
      thumbnailKey,
      url: `${baseUrl}/uploads/${key}`,
      thumbnailUrl: `${baseUrl}/uploads/${thumbnailKey}`
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
      ContentType: file.mimetype
    })
  );

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: "image/webp"
    })
  );

  const baseUrl = env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "");
  return {
    key,
    thumbnailKey,
    url: `${baseUrl}/${key}`,
    thumbnailUrl: `${baseUrl}/${thumbnailKey}`
  };
}
