import type { CharacterDTO } from "@kidstoys/shared";
import type { characters } from "@kidstoys/db";

export type CharacterRow = Pick<
  typeof characters.$inferSelect,
  "id" | "name" | "slug" | "description" | "imageUrl" | "sortOrder" | "isActive"
> & { productCount?: number };

export function toCharacterDTO(row: CharacterRow): CharacterDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    productCount: row.productCount ?? 0,
  };
}
