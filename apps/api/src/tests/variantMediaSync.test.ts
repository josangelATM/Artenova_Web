import { describe, expect, it } from "vitest";
import { propagateVariantMediaByVisualGroup, type VariantMediaSyncInput } from "../lib/variantMediaSync";

function createImage(url: string) {
  return {
    url,
    type: "image" as const,
    alt: `Imagen ${url}`,
    position: 0,
    posterUrl: null,
  };
}

function createVariant(input: Partial<VariantMediaSyncInput> & Pick<VariantMediaSyncInput, "id">): VariantMediaSyncInput {
  return {
    id: input.id,
    visualGroupKey: input.visualGroupKey ?? null,
    position: input.position ?? 0,
    media: input.media ?? [],
  };
}

describe("propagateVariantMediaByVisualGroup", () => {
  it("fills empty variants from the default variant inside the same visual group", () => {
    const variants = [
      createVariant({ id: "gold-10", visualGroupKey: "dorado", position: 1, media: [createImage("/gold-default.webp")] }),
      createVariant({ id: "gold-15", visualGroupKey: "dorado", position: 0, media: [createImage("/gold-earlier.webp")] }),
      createVariant({ id: "gold-18", visualGroupKey: "dorado", position: 2 }),
    ];

    const result = propagateVariantMediaByVisualGroup(variants, "gold-10");

    expect(result[2]?.media).toEqual([createImage("/gold-default.webp")]);
  });

  it("falls back to the first variant by position with media when the default variant has none", () => {
    const variants = [
      createVariant({ id: "gold-15", visualGroupKey: "dorado", position: 0, media: [createImage("/gold-earlier.webp")] }),
      createVariant({ id: "gold-10", visualGroupKey: "dorado", position: 1 }),
      createVariant({ id: "gold-18", visualGroupKey: "dorado", position: 2 }),
    ];

    const result = propagateVariantMediaByVisualGroup(variants, "gold-10");

    expect(result[1]?.media).toEqual([createImage("/gold-earlier.webp")]);
    expect(result[2]?.media).toEqual([createImage("/gold-earlier.webp")]);
  });

  it("does not overwrite variants that already have their own media", () => {
    const variants = [
      createVariant({ id: "gold-10", visualGroupKey: "dorado", position: 0, media: [createImage("/gold-main.webp")] }),
      createVariant({ id: "gold-15", visualGroupKey: "dorado", position: 1, media: [createImage("/gold-custom.webp")] }),
    ];

    const result = propagateVariantMediaByVisualGroup(variants, "gold-10");

    expect(result[1]?.media).toEqual([createImage("/gold-custom.webp")]);
  });

  it("ignores variants without a visual group", () => {
    const variants = [
      createVariant({ id: "base-1", visualGroupKey: null, position: 0, media: [createImage("/base.webp")] }),
      createVariant({ id: "base-2", visualGroupKey: null, position: 1 }),
    ];

    const result = propagateVariantMediaByVisualGroup(variants, "base-1");

    expect(result[1]?.media).toEqual([]);
  });

  it("returns cloned media arrays so propagation does not reuse the same object references", () => {
    const variants = [
      createVariant({ id: "gold-10", visualGroupKey: "dorado", position: 0, media: [createImage("/gold.webp")] }),
      createVariant({ id: "gold-15", visualGroupKey: "dorado", position: 1 }),
    ];

    const result = propagateVariantMediaByVisualGroup(variants, "gold-10");

    expect(result[0]?.media).not.toBe(variants[0]?.media);
    expect(result[1]?.media).not.toBe(result[0]?.media);
    expect(result[1]?.media[0]).not.toBe(result[0]?.media[0]);
  });
});
