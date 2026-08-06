type ProductMediaInput = {
  url: string;
  type: "image" | "video";
  alt: string;
  position: number;
  posterUrl?: string | null;
};

type VariantMediaSyncInput = {
  id: string;
  visualGroupKey?: string | null;
  position: number;
  media: ProductMediaInput[];
};

function cloneMedia(media: ProductMediaInput[]) {
  return media.map((item) => ({
    url: item.url,
    type: item.type,
    alt: item.alt,
    position: item.position,
    posterUrl: item.posterUrl ?? null,
  }));
}

export function propagateVariantMediaByVisualGroup<T extends VariantMediaSyncInput>(
  variants: T[],
  defaultVariantId?: string | null,
): T[] {
  const normalizedDefaultVariantId = defaultVariantId?.trim() || null;
  const nextVariants = variants.map((variant) => ({
    ...variant,
    media: cloneMedia(variant.media),
  }));
  const groups = new Map<string, T[]>();

  for (const variant of nextVariants) {
    const groupKey = variant.visualGroupKey?.trim();
    if (!groupKey) continue;
    const bucket = groups.get(groupKey) ?? [];
    bucket.push(variant);
    groups.set(groupKey, bucket);
  }

  for (const groupVariants of groups.values()) {
    groupVariants.sort((a, b) => a.position - b.position);
    const defaultSource = normalizedDefaultVariantId
      ? groupVariants.find((variant) => variant.id === normalizedDefaultVariantId && variant.media.length > 0)
      : null;
    const fallbackSource = groupVariants.find((variant) => variant.media.length > 0) ?? null;
    const source = defaultSource ?? fallbackSource;

    if (!source) continue;

    for (const variant of groupVariants) {
      if (variant.media.length > 0) continue;
      variant.media = cloneMedia(source.media);
    }
  }

  return nextVariants;
}

export type { ProductMediaInput, VariantMediaSyncInput };
