import type { CategoryDTO } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { uniqueSlug } from "../../shared/slug";
import { toCategoryDTO } from "./mappers";
import {
  categoryNameExists,
  categorySlugExists,
  countProductsInCategory,
  deleteCategory,
  findCategoryById,
  insertCategory,
  listActiveCategories,
  listAllCategories,
  updateCategory,
} from "./repository";
import { assertCategoryCanBeDeleted, assertCategoryNameIsUnique } from "./rules";

export async function listPublicCategories(): Promise<CategoryDTO[]> {
  const rows = await listActiveCategories();
  return rows.map(toCategoryDTO);
}

export async function listCategories(): Promise<CategoryDTO[]> {
  const rows = await listAllCategories();
  return rows.map(toCategoryDTO);
}

export async function createCategory(input: {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<CategoryDTO> {
  assertCategoryNameIsUnique(await categoryNameExists(input.name));

  const slug = await uniqueSlug(input.name, categorySlugExists);

  const created = await insertCategory({
    name: input.name,
    slug,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
  });

  return toCategoryDTO(created);
}

export async function updateCategoryById(
  id: number,
  input: {
    name?: string;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
): Promise<CategoryDTO> {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw ApiError.notFound("That category no longer exists");
  }

  const updates: Parameters<typeof updateCategory>[1] = {};
  if (input.name !== undefined) {
    assertCategoryNameIsUnique(await categoryNameExists(input.name, id));
    updates.name = input.name;
  }
  if (input.description !== undefined) updates.description = input.description;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  const updated = await updateCategory(id, updates);
  return toCategoryDTO(updated);
}

export async function removeCategory(id: number): Promise<void> {
  const existing = await findCategoryById(id);
  if (!existing) {
    throw ApiError.notFound("That category no longer exists");
  }

  const productCount = await countProductsInCategory(id);
  assertCategoryCanBeDeleted(productCount);

  await deleteCategory(id);
}
