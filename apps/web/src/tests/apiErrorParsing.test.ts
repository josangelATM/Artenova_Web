import { describe, expect, it } from "vitest";
import { ApiRequestError, parseApiErrorPayload } from "../lib/api";

describe("api error parsing", () => {
  it("normalizes issues and field errors from the backend payload", () => {
    const payload = parseApiErrorPayload({
      message: "Se encontraron 2 errores de validación.",
      issues: [
        { path: ["customerName"], key: "customerName", message: "Required", code: "too_small" },
        { path: ["items", 0, "productName"], message: "Too small", code: "too_small" },
      ],
      fieldErrors: {
        customerWhatsapp: "Invalid string",
      },
    }, "fallback");

    expect(payload.message).toBe("Se encontraron 2 errores de validación.");
    expect(payload.issues).toHaveLength(2);
    expect(payload.fieldErrors.customerName).toBe("Required");
    expect(payload.fieldErrors["items.0.productName"]).toBe("Too small");
    expect(payload.fieldErrors.customerWhatsapp).toBe("Invalid string");
  });

  it("creates a request error preserving status and normalized payload", () => {
    const error = new ApiRequestError(400, parseApiErrorPayload({
      message: "Error",
      issues: [{ path: ["name"], message: "Required", code: "too_small" }],
    }, "fallback"));

    expect(error.status).toBe(400);
    expect(error.message).toBe("Error");
    expect(error.fieldErrors.name).toBe("Required");
  });
});
