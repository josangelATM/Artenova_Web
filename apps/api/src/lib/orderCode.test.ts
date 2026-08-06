import { describe, expect, it } from "vitest";
import { createOrderCode } from "./orderCode";

describe("createOrderCode", () => {
  it("starts monthly sequence at 001", async () => {
    const code = await createOrderCode(
      {
        order: {
          findFirst: async () => null,
        },
      },
      new Date("2026-08-06T12:00:00Z"),
    );

    expect(code).toBe("2608-001");
  });

  it("increments from the latest order in the same month", async () => {
    const code = await createOrderCode(
      {
        order: {
          findFirst: async () => ({ code: "2608-014" }),
        },
      },
      new Date("2026-08-06T12:00:00Z"),
    );

    expect(code).toBe("2608-015");
  });

  it("restarts sequence on a new month prefix", async () => {
    const code = await createOrderCode(
      {
        order: {
          findFirst: async () => ({ code: "2608-099" }),
        },
      },
      new Date("2026-09-01T08:00:00Z"),
    );

    expect(code).toBe("2609-001");
  });
});
