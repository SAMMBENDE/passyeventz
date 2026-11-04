import type { Realisation } from "@/models/realisation";

export function serializeRealisation(
  realisation: Realisation & { _id: { toString(): string } },
) {
  return {
    id: realisation._id.toString(),
    title: realisation.title,
    description: realisation.description,
    category: realisation.category,
    image: realisation.imageUrl,
    imageAlt: realisation.title,
    isActive: realisation.isActive,
    sortOrder: realisation.sortOrder,
  };
}
