import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler } from "../middleware/errors";

function createResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  return response;
}

describe("errorHandler", () => {
  it("returns normalized zod validation errors with user-friendly messages", () => {
    const response = createResponse();
    const error = z.object({
      name: z.string().min(2),
      items: z.array(z.object({ productName: z.string().min(1) })),
    }).safeParse({
      name: "",
      items: [{ productName: "" }],
    });

    if (error.success) {
      throw new Error("expected parse failure");
    }

    errorHandler(error.error, {} as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "Se encontraron 2 errores de validación.",
      fieldErrors: {
        name: "Debe tener al menos 2 caracteres.",
        "items.0.productName": "Este campo es obligatorio.",
      },
    }));
  });

  it("formats common invalid formats with friendly messages", () => {
    const response = createResponse();
    const error = z.object({
      email: z.string().email(),
      website: z.string().url(),
    }).safeParse({
      email: "correo-malo",
      website: "no-es-url",
    });

    if (error.success) {
      throw new Error("expected parse failure");
    }

    errorHandler(error.error, {} as never, response as never, vi.fn());

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      fieldErrors: {
        email: "Ingresa un correo válido.",
        website: "Ingresa una URL válida.",
      },
    }));
  });

  it("returns field-specific messages for unique constraint conflicts", () => {
    const response = createResponse();

    errorHandler({
      code: "P2002",
      meta: { target: ["slug"] },
    }, {} as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Ese enlace corto ya está en uso.",
      issues: [
        {
          path: ["slug"],
          key: "slug",
          message: "Ese enlace corto ya está en uso.",
          code: "unique",
        },
      ],
      fieldErrors: {
        slug: "Ese enlace corto ya está en uso.",
      },
    });
  });

  it("returns a stable payload for unexpected errors", () => {
    const response = createResponse();

    errorHandler(new Error("boom"), {} as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: "No se pudo completar la solicitud",
      issues: [],
      fieldErrors: {},
    });
  });
});
