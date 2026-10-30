import type { PaginatedDTO, ProductDTO, ProductInput, ProductPatchInput } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { uniqueSlug } from "../../shared/slug";
import { toProductDTO } from "./mappers";
import {
  countOrderItemsForProduct,
  deleteProduct,
  findProductById,
  findProductBySlug,
  insertProduct,
  listProductAgeGroups,
  listProductCharacters,
  listProducts,
  productSlugExists,
  replaceProductAgeGroups,
  replaceProductCharacters,
  updateProduct,
  type ProductFilters,
} from "./repository";
import { assertProductCanBeDeleted, assertStockIsNotNegative } from "./rules";

async function withDimensions(
  rows: Parameters<typeof toProductDTO>[0][],
  includeCost = false,
): Promise<ProductDTO[]> {
  const productIds = rows.map((row) => row.id);
  const [characters, ageGroups] = await Promise.all([
    listProductCharacters(productIds),
    listProductAgeGroups(productIds),
  ]);
  return rows.map((row) =>
    toProductDTO(
      row,
      characters
        .filter((character) => character.productId === row.id)
        .map(({ productId: _productId, ...character }) => character),
      ageGroups
        .filter((group) => group.productId === row.id)
        .map(({ productId: _productId, ...group }) => group),
      includeCost,
    ),
  );
}

export async function listCatalogProducts(options: {
  filters: ProductFilters;
  sort: "newest" | "price_asc" | "price_desc" | "name_asc";
  page: number;
  pageSize: number;
  includeCost?: boolean;
}): Promise<PaginatedDTO<ProductDTO>> {  const { rows, total } = await listProducts(
    options.filters,
    options.sort,
    options.page,
    options.pageSize,
  );

  return {
    items: await withDimensions(rows, options.includeCost),
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
  return (await withDimensions([row]))[0]!;
}

export async function removeProduct(id: number): Promise<void> {
  const existing = await findProductById(id);
  if (!existing) {
    throw ApiError.notFound("That product no longer exists");
  }

  const orderCount = await countOrderItemsForProduct(id);
  assertProductCanBeDeleted(orderCount);

  await deleteProduct(id);
}

export async function createProduct(input: ProductInput, images: string[]): Promise<ProductDTO> {
  assertStockIsNotNegative(input.stock);

  const slug = await uniqueSlug(input.name, productSlugExists);

  const created = await insertProduct({
    name: input.name,
    slug,
    sku: input.sku ?? null,
    shortDescription: input.shortDescription ?? null,
    description: input.description ?? "",
    priceCents: input.priceCents,
    buyPriceCents: input.buyPriceCents,
    compareAtCents: input.compareAtCents ?? null,
    categoryId: input.categoryId,
    images,
    videoUrl: input.videoUrl ?? null,
    stock: input.stock,
    minStock: input.minStock ?? 5,
    isActive: input.isActive ?? true,
    isNew: input.isNew ?? false,
    isBestSeller: input.isBestSeller ?? false,
  });
  await replaceProductCharacters(created.id, input.characterIds ?? []);
  await replaceProductAgeGroups(created.id, input.ageGroupIds ?? []);

  return (await withDimensions([created], true))[0]!;
}

export async function updateProductById(
  id: number,
  input: ProductPatchInput,
  images?: string[],
): Promise<ProductDTO> {
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
  if (input.buyPriceCents !== undefined) updates.buyPriceCents = input.buyPriceCents;
  if (input.compareAtCents !== undefined) updates.compareAtCents = input.compareAtCents;
  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (images !== undefined) updates.images = images;
  if (input.videoUrl !== undefined) updates.videoUrl = input.videoUrl;
  if (input.stock !== undefined) updates.stock = input.stock;
  if (input.minStock !== undefined) updates.minStock = input.minStock;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.isNew !== undefined) updates.isNew = input.isNew;
  if (input.isBestSeller !== undefined) updates.isBestSeller = input.isBestSeller;

  if (updates.stock !== undefined) {
    assertStockIsNotNegative(updates.stock);
  }

  const updated = await updateProduct(id, updates);
  if (input.characterIds !== undefined) {
    await replaceProductCharacters(id, input.characterIds);
  }
  if (input.ageGroupIds !== undefined) {
    await replaceProductAgeGroups(id, input.ageGroupIds);
  }
  return (await withDimensions([updated], true))[0]!;
}
