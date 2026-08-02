import { describe, expect, it } from "vitest";
import { adminProductReviewInputSchema, createProductReviewSchema, updateReviewApprovalSchema } from "@artenova/shared";
import { productPayload } from "../lib/serialize";

describe("product reviews", () => {
  it("validates customer review input", () => {
    expect(createProductReviewSchema.parse({ rating: "5", customerName: "Ana", comment: "Muy bonito" })).toMatchObject({
      rating: 5,
      customerName: "Ana",
      comment: "Muy bonito"
    });

    expect(() => createProductReviewSchema.parse({ rating: 6, customerName: "Ana", comment: "Muy bonito" })).toThrow();
    expect(() => createProductReviewSchema.parse({ rating: 4, customerName: "A", comment: "Ok" })).toThrow();
  });

  it("validates admin review input and approval changes", () => {
    expect(adminProductReviewInputSchema.parse({ productId: "p1", rating: 4, customerName: "Ana", comment: "Buen acabado" })).toMatchObject({
      productId: "p1",
      isApproved: true
    });
    expect(updateReviewApprovalSchema.parse({ isApproved: false })).toEqual({ isApproved: false });
  });

  it("serializes review summary from included reviews", () => {
    const payload = productPayload({
      id: "p1",
      name: "Retrato",
      basePrice: 20,
      tags: [],
      priceTiers: [],
      extras: [],
      customFields: [],
      reviews: [
        { id: "r1", productId: "p1", rating: 5, customerName: "Ana", comment: "Excelente", isApproved: true, source: "customer", createdAt: new Date("2026-08-01T10:00:00Z"), updatedAt: new Date("2026-08-01T10:00:00Z") },
        { id: "r2", productId: "p1", rating: 4, customerName: "Luis", comment: "Buen detalle", isApproved: true, source: "admin", createdAt: new Date("2026-08-01T11:00:00Z"), updatedAt: new Date("2026-08-01T11:00:00Z") }
      ]
    });

    expect(payload.reviewSummary).toEqual({ averageRating: 4.5, reviewCount: 2 });
    expect(payload.reviews[0]?.createdAt).toBe("2026-08-01T10:00:00.000Z");
  });
});
