import { describe, expect, it } from "vitest";
import { ApiRequestError } from "../lib/api";
import { clearFormErrorField, createFormErrorState } from "../lib/formErrors";

describe("form errors", () => {
  it("maps api issues to labeled summary items and field errors", () => {
    const error = new ApiRequestError(400, {
      message: "Se encontraron 2 errores de validación.",
      issues: [
        { path: ["items", 0, "productName"], key: "items.0.productName", message: "Required" },
        { path: ["customerName"], key: "customerName", message: "Required" },
      ],
      fieldErrors: {},
    });

    const state = createFormErrorState(error, {
      fallbackMessage: "fallback",
      getFieldLabel: (field) => field === "customerName" ? "Nombre del cliente" : field === "items.0.productName" ? "Item 1: Producto" : field,
    });

    expect(state.summaryMessage).toBe("Corrige los campos marcados e inténtalo de nuevo.");
    expect(state.summaryItems).toEqual([
      "Item 1: Producto: Required",
      "Nombre del cliente: Required",
    ]);
    expect(state.fieldErrors.customerName).toBe("Required");
  });

  it("clears a field and its nested errors", () => {
    const state = {
      summaryMessage: "msg",
      summaryItems: [],
      rawIssues: [],
      fieldErrors: {
        "items.0.productName": "Required",
        "items.0.quantity": "Required",
        customerName: "Required",
      },
    };

    const next = clearFormErrorField(state, "items.0");

    expect(next.fieldErrors).toEqual({
      customerName: "Required",
    });
  });
});
