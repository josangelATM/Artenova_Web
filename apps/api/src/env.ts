import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.string().email().default("admin@artenova.local"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me-now"),
  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  UPLOAD_DRIVER: z.enum(["local", "s3"]).default(process.env.NODE_ENV === "production" ? "s3" : "local"),
  LOCAL_UPLOAD_DIR: z.string().default("uploads"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional()
});

export const env = envSchema.parse(process.env);

export const hasS3Config = Boolean(
  env.UPLOAD_DRIVER === "s3" &&
  env.S3_ENDPOINT &&
    env.S3_BUCKET &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY &&
    env.S3_PUBLIC_BASE_URL
);
