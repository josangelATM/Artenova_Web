import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export type ApiValidationIssue = {
  path: Array<string | number>;
  key: string;
  message: string;
  code: string;
};

function formatIssueMessage(issue: ZodError["issues"][number]) {
  const details = issue as unknown as Record<string, unknown>;

  switch (issue.code) {
    case "invalid_type": {
      return "Este campo es obligatorio.";
    }
    case "too_small": {
      if (details.origin === "string") {
        const minimum = typeof details.minimum === "number" ? details.minimum : null;
        if (minimum === 1) {
          return "Este campo es obligatorio.";
        }
        if (minimum != null) {
          return `Debe tener al menos ${minimum} caracteres.`;
        }
      }
      if (details.origin === "number") {
        return "Ingresa un número válido.";
      }
      if (details.origin === "array") {
        return "Debes agregar al menos un elemento.";
      }
      return "El valor ingresado es demasiado corto.";
    }
    case "too_big": {
      if (details.origin === "string") {
        const maximum = typeof details.maximum === "number" ? details.maximum : null;
        if (maximum != null) {
          return `No puede superar ${maximum} caracteres.`;
        }
      }
      if (details.origin === "array") {
        return "Has agregado demasiados elementos.";
      }
      return "El valor ingresado es demasiado grande.";
    }
    case "invalid_format": {
      const format = typeof details.format === "string" ? details.format : "";
      if (format === "email") {
        return "Ingresa un correo válido.";
      }
      if (format === "url") {
        return "Ingresa una URL válida.";
      }
      if (format === "date") {
        return "Ingresa una fecha válida.";
      }
      if (format === "datetime") {
        return "Ingresa una fecha y hora válidas.";
      }
      return "El formato ingresado no es válido.";
    }
    case "invalid_value": {
      return "Selecciona una opción válida.";
    }
    case "not_multiple_of": {
      return "El valor ingresado no es válido.";
    }
    case "unrecognized_keys": {
      return "Se enviaron datos no esperados.";
    }
    case "custom": {
      return typeof issue.message === "string" && issue.message.trim() ? issue.message : "El valor ingresado no es válido.";
    }
    default: {
      return typeof issue.message === "string" && issue.message.trim() ? issue.message : "El valor ingresado no es válido.";
    }
  }
}

function buildIssueKey(path: Array<string | number>) {
  return path.map(String).join(".");
}

export function normalizeZodIssues(error: ZodError): ApiValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.filter((segment): segment is string | number => typeof segment === "string" || typeof segment === "number"),
    key: buildIssueKey(issue.path.filter((segment): segment is string | number => typeof segment === "string" || typeof segment === "number")),
    message: formatIssueMessage(issue),
    code: issue.code,
  }));
}

function buildFieldErrors(issues: ApiValidationIssue[]) {
  const fieldErrors: Record<string, string> = {};

  issues.forEach((issue) => {
    if (!issue.key || fieldErrors[issue.key]) return;
    fieldErrors[issue.key] = issue.message;
  });

  return fieldErrors;
}

function buildValidationMessage(issues: ApiValidationIssue[]) {
  if (issues.length === 0) {
    return "Revisa los campos marcados e inténtalo de nuevo.";
  }

  if (issues.length === 1) {
    return issues[0]!.message;
  }

  return `Se encontraron ${issues.length} errores de validación.`;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const issues = normalizeZodIssues(err);
    res.status(400).json({
      message: buildValidationMessage(issues),
      issues,
      fieldErrors: buildFieldErrors(issues),
    });
    return;
  }

  if (err instanceof Error && err.name === "UploadValidationError") {
    res.status(400).json({ message: err.message, issues: [], fieldErrors: {} });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "No se pudo completar la solicitud", issues: [], fieldErrors: {} });
}
