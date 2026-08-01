import type { Tag } from "@artenova/shared";

const hiddenPublicTagSlugs = new Set(["personalizado", "regalo"]);

export function visiblePublicTags(tags: Tag[]) {
  return tags.filter((tag) => !hiddenPublicTagSlugs.has(tag.slug));
}
