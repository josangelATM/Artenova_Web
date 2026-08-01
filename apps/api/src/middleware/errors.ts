import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Datos inválidos", issues: err.issues });
    return;
  }

  if (err instanceof Error && err.name === "UploadValidationError") {
    res.status(400).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "No se pudo completar la solicitud" });
}
