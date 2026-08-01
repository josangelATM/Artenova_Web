import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { env } from "./env";
import { adminRouter } from "./routes/admin";
import { catalogRouter } from "./routes/catalog";
import { ordersRouter } from "./routes/orders";
import { errorHandler } from "./middleware/errors";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.APP_BASE_URL,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  if (env.UPLOAD_DRIVER === "local") {
    app.use("/uploads", express.static(path.resolve(env.LOCAL_UPLOAD_DIR)));
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "artenova-api" });
  });

  app.use("/api/catalog", catalogRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);

  return app;
}
