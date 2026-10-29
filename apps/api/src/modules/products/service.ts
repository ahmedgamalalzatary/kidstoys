import type { PaginatedDTO, ProductDTO, ProductInput } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { uniqueSlug } from "../../shared/slug";
import { toProductDTO } from "./mappers";
import {
  findProductById,
  findProductBySlug,
  insertProduct,
  listProducts,
  productSlugExists,
  updateProduct,
  type ProductFilters,
} from "./repository";
import { assertStockIsNotNegative } from "./rules";

export async function listCatalogProducts(options: {
  filters: ProductFilters;
  sort: "newest" | "price_asc" | "price_desc" | "name_asc";
  page: number;
  pageSize: number;
}): Promise<PaginatedDTO<ProductDTO>> {
  const { rows, total } = await listProducts(
    options.filters,
    options.sort,
    options.page,
    options.pageSize,
  );

  return {
    items: rows.map(toProductDTO),
    page: options.page,
    pageSize: options.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / options.pageSize)),
  };
}

export async function getProduct(slug: string): Promise<ProductDTO> {
  const row = await findProductBySlug(slug);
  if (!row) {
    throw ApiError.notFound("That product is no longer available");
  }
  return toProductDTO(row);
}

export async function createProduct(input: ProductInput): Promise<ProductDTO> {
  assertStockIsNotNegative(input.stock);

  const slug = await uniqueSlug(input.name, productSlugExists);

  const created = await insertProduct({
    name: input.name,
    slug,
    sku: input.sku ?? null,
    shortDescription: input.shortDescription ?? null,
    description: input.description ?? "",
    priceCents: input.priceCents,
    compareAtCents: input.compareAtCents ?? null,
    categoryId: input.categoryId,
    images: input.images ?? [],
    stock: input.stock,
    minStock: input.minStock ?? 5,
    isActive: input.isActive ?? true,
    ageMin: input.ageMin ?? null,
    ageMax: input.ageMax ?? null,
  });

  return toProductDTO(created);
}

export async function updateProductById(id: number, input: Partial<ProductInput>): Promise<ProductDTO> {
  const existing = await findProductById(id);
  if (!existing) {
    throw ApiError.notFound("That product no longer exists");
  }

  const updates: Parameters<typeof updateProduct>[1] = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.sku !== undefined) updates.sku = input.sku;
  if (input.shortDescription !== undefined) updates.shortDescription = input.shortDescription;
  if (input.description !== undefined) updates.description = input.description;
  if (input.priceCents !== undefined) updates.priceCents = input.priceCents;
  if (input.compareAtCents !== undefined) updates.compareAtCents = input.compareAtCents;
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (input.images !== undefined) updates.images = input.images;
  if (input.stock !== undefined) updates.stock = input.stock;
  if (input.minStock !== undefined) updates.minStock = input.minStock;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.ageMin !== undefined) updates.ageMin = input.ageMin;
  if (input.ageMax !== undefined) updates.ageMax = input.ageMax;

  if (updates.stock !== undefined) {
    assertStockIsNotNegative(updates.stock);
  }

  const updated = await updateProduct(id, updates);
  return toProductDTO(updated);
}
