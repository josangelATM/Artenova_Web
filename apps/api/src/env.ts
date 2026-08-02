import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.string().email().default("admin@artenova.local"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me-now"),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  APP_BASE_URL: z.string().url().default("http://localhost:5174"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  WEB_INTERNAL_BASE_URL: z.string().url().default("http://web"),
  SITE_BRAND_NAME: z.string().default("Artenova"),
  SITE_HERO_TITLE: z
    .string()
    .default("Regalos personalizados que guardan historias"),
  SITE_HERO_SUBTITLE: z
    .string()
    .default("Taller creativo de corte y grabado láser."),
  SITE_WHATSAPP: z.string().default(""),
  SITE_EMAIL: z.string().default(""),
  SITE_ADDRESS: z.string().default("Panamá"),
  SITE_BUSINESS_HOURS: z
    .string()
    .default("Lunes a viernes, 9:00 a.m. - 5:30 p.m."),
  SITE_MAPS_URL: z.string().default(""),
  SITE_BANNER_TEXT: z
    .string()
    .default("Piezas personalizadas para recuerdos y regalos especiales."),
  SITE_PERSONALIZATION_NOTICE: z
    .string()
    .default(
      "Las fotos son referencias; cada pieza personalizada puede variar según foto, material y acabado.",
    ),
  UPLOAD_DRIVER: z
    .enum(["local", "s3"])
    .default(process.env.NODE_ENV === "production" ? "s3" : "local"),
  LOCAL_UPLOAD_DIR: z.string().default("uploads"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);

export const hasS3Config = Boolean(
  env.UPLOAD_DRIVER === "s3" &&
  env.S3_ENDPOINT &&
  env.S3_BUCKET &&
  env.S3_ACCESS_KEY_ID &&
  env.S3_SECRET_ACCESS_KEY &&
  env.S3_PUBLIC_BASE_URL,
);
