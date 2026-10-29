import type { CategoryDTO, ProductDTO } from "@kidstoys/shared";
import type { categories, products } from "@kidstoys/db";

export type ProductRow = typeof products.$inferSelect & {
  categoryName: string;
  categorySlug: string;
};

export function toProductDTO(row: ProductRow): ProductDTO {
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
    ageMin: row.ageMin,
    ageMax: row.ageMax,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toCategoryDTO(
  row: Pick<
    typeof categories.$inferSelect,
    "id" | "name" | "slug" | "description" | "imageUrl" | "sortOrder" | "isActive"
  > & { productCount?: number },
): CategoryDTO {
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
