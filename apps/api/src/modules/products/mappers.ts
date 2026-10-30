import type { AgeGroupRefDTO, CharacterRefDTO, ProductDTO } from "@kidstoys/shared";
import type { products } from "@kidstoys/db";

export type ProductRow = typeof products.$inferSelect & {
  categoryName: string;
  categorySlug: string;
};

export function toProductDTO(
  row: ProductRow,
  characters: CharacterRefDTO[] = [],
  ageGroups: AgeGroupRefDTO[] = [],
): ProductDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    shortDescription: row.shortDescription,
    description: row.description,
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categorySlug: row.categorySlug,
    images: Array.isArray(row.images) ? row.images : [],
    stock: row.stock,
    minStock: row.minStock,
    isActive: row.isActive,
    isNew: row.isNew,
    isBestSeller: row.isBestSeller,
    characters,
    ageGroups,
    createdAt: row.createdAt.toISOString(),
  };
}
