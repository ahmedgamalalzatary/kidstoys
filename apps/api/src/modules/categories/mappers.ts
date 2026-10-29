import type { CategoryDTO } from "@kidstoys/shared";
import type { categories } from "@kidstoys/db";

export type CategoryRow = Pick<
  typeof categories.$inferSelect,
  "id" | "name" | "slug" | "description" | "imageUrl" | "sortOrder" | "isActive"
> & { productCount?: number };

export function toCategoryDTO(row: CategoryRow): CategoryDTO {
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
