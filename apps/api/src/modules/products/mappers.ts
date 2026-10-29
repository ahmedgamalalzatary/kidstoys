import type { ProductDTO } from "@kidstoys/shared";
import type { products } from "@kidstoys/db";

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
