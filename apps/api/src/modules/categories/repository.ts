import { and, asc, count, eq } from "drizzle-orm";
import { categories, db, products } from "@kidstoys/db";

const categoryColumns = {
  id: categories.id,
  name: categories.name,
  slug: categories.slug,
  description: categories.description,
  imageUrl: categories.imageUrl,
  sortOrder: categories.sortOrder,
  isActive: categories.isActive,
};

/** Active categories with the number of active products they hold. */
export async function listActiveCategories() {
  return db
    .select({ ...categoryColumns, productCount: count(products.id) })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.isActive, true)))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/** Every category, including the inactive ones. */
export async function listAllCategories() {
  return db
    .select({ ...categoryColumns, productCount: count(products.id) })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.isActive, true)))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function findCategoryById(id: number) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

export async function findCategoryBySlug(slug: string) {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
}

export async function categorySlugExists(slug: string): Promise<boolean> {
  const row = await findCategoryBySlug(slug);
  return row !== null;
}

export async function insertCategory(values: {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  const [row] = await db.insert(categories).values(values).$returningId();
  if (!row) {
    throw new Error("Category was not created");
  }
  const created = await findCategoryById(row.id);
  if (!created) {
    throw new Error("Category was not created");
  }
  return created;
}

export async function updateCategory(
  id: number,
  values: Partial<{
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  await db.update(categories).set(values).where(eq(categories.id, id));
  const updated = await findCategoryById(id);
  if (!updated) {
    throw new Error("Category was not found");
  }
  return updated;
}

export async function deleteCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

/** How many products still point at this category. */
export async function countProductsInCategory(id: number): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.categoryId, id));
  return rows[0]?.total ?? 0;
}
