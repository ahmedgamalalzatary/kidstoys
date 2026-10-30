import { and, asc, count, desc, eq, exists, gte, inArray, isNull, like, or, sql, type SQL } from "drizzle-orm";
import {
  ageGroups,
  categories,
  characters,
  db,
  orderItems,
  productAgeGroups,
  productCharacters,
  products,
} from "@kidstoys/db";

const productColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  sku: products.sku,
  shortDescription: products.shortDescription,
  description: products.description,
  priceCents: products.priceCents,
  buyPriceCents: products.buyPriceCents,
  compareAtCents: products.compareAtCents,
  categoryId: products.categoryId,
  images: products.images,
  videoUrl: products.videoUrl,
  stock: products.stock,
  minStock: products.minStock,
  isActive: products.isActive,
  isNew: products.isNew,
  isBestSeller: products.isBestSeller,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

export interface ProductFilters {
  q?: string;
  category?: string;
  character?: string;
  ageGroup?: string;
  age?: number;
  new?: boolean;
  bestSeller?: boolean;
  includeInactive?: boolean;
  lowStock?: boolean;
}

function buildFilters(filters: ProductFilters): SQL[] {
  const conditions: SQL[] = [];

  if (!filters.includeInactive) {
    conditions.push(eq(products.isActive, true));
  }
  if (filters.q) {
    conditions.push(like(products.name, `%${filters.q}%`));
  }
  if (filters.category) {
    conditions.push(eq(categories.slug, filters.category));
  }
  if (filters.character) {
    const slugs = filters.character.split(",").map((slug) => slug.trim()).filter(Boolean);
    conditions.push(
      exists(
        db
          .select({ id: productCharacters.productId })
          .from(productCharacters)
          .innerJoin(characters, eq(productCharacters.characterId, characters.id))
          .where(
            and(
              eq(productCharacters.productId, products.id),
              inArray(characters.slug, slugs),
              eq(characters.isActive, true),
            ),
          ),
      ),
    );
  }
  if (filters.ageGroup) {
    const slugs = filters.ageGroup.split(",").map((slug) => slug.trim()).filter(Boolean);
    conditions.push(
      exists(
        db
          .select({ id: productAgeGroups.productId })
          .from(productAgeGroups)
          .innerJoin(ageGroups, eq(productAgeGroups.ageGroupId, ageGroups.id))
          .where(
            and(
              eq(productAgeGroups.productId, products.id),
              inArray(ageGroups.slug, slugs),
              eq(ageGroups.isActive, true),
            ),
          ),
      ),
    );
  }
  if (filters.age !== undefined) {
    conditions.push(
      exists(
        db
          .select({ id: productAgeGroups.productId })
          .from(productAgeGroups)
          .innerJoin(ageGroups, eq(productAgeGroups.ageGroupId, ageGroups.id))
          .where(
            and(
              eq(productAgeGroups.productId, products.id),
              eq(ageGroups.isActive, true),
              sql`${ageGroups.startAge} <= ${filters.age}`,
              or(isNull(ageGroups.endAge), gte(ageGroups.endAge, filters.age)),
            ),
          ),
      ),
    );
  }
  if (filters.new !== undefined) conditions.push(eq(products.isNew, filters.new));
  if (filters.bestSeller !== undefined) conditions.push(eq(products.isBestSeller, filters.bestSeller));
  if (filters.lowStock) {
    conditions.push(sql`${products.stock} <= ${products.minStock}`);
  }

  return conditions;
}

export async function listProducts(
  filters: ProductFilters,
  sort: "newest" | "price_asc" | "price_desc" | "name_asc",
  page: number,
  pageSize: number,
) {
  const where = and(...buildFilters(filters));

  const orderBy =
    sort === "price_asc"
      ? [asc(products.priceCents)]
      : sort === "price_desc"
        ? [desc(products.priceCents)]
        : sort === "name_asc"
          ? [asc(products.name)]
          : [desc(products.id)];

  const countRows = await db
    .select({ total: count() })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where);
  const total = countRows[0]?.total ?? 0;

  const rows = await db
    .select({
      ...productColumns,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total };
}

export async function findProductBySlug(slug: string, includeInactive = false) {
  const [row] = await db
    .select({
      ...productColumns,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      includeInactive
        ? eq(products.slug, slug)
        : and(eq(products.slug, slug), eq(products.isActive, true)),
    )
    .limit(1);

  return row ?? null;
}

export async function findProductById(id: number) {
  const [row] = await db
    .select({
      ...productColumns,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id))
    .limit(1);

  return row ?? null;
}

export async function productSlugExists(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  return row !== undefined;
}

export async function insertProduct(values: {
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string | null;
  description: string;
  priceCents: number;
  buyPriceCents: number;
  compareAtCents: number | null;
  categoryId: number;
  images: string[];
  videoUrl: string | null;
  stock: number;
  minStock: number;
  isActive: boolean;
  isNew: boolean;
  isBestSeller: boolean;
}) {
  const [row] = await db.insert(products).values(values).$returningId();
  if (!row) {
    throw new Error("Product was not created");
  }
  const created = await findProductById(row.id);
  if (!created) {
    throw new Error("Product was not created");
  }
  return created;
}

export async function updateProduct(
  id: number,
  values: Partial<{
    name: string;
    slug: string;
    sku: string | null;
    shortDescription: string | null;
    description: string;
    priceCents: number;
    buyPriceCents: number;
    compareAtCents: number | null;
    categoryId: number;
    images: string[];
    videoUrl: string | null;
    stock: number;
    minStock: number;
    isActive: boolean;
    isNew: boolean;
    isBestSeller: boolean;
  }>,
) {
  if (Object.keys(values).length > 0) {
    await db.update(products).set(values).where(eq(products.id, id));
  }
  const updated = await findProductById(id);
  if (!updated) {
    throw new Error("Product was not found");
  }
  return updated;
}

export async function deleteProduct(id: number): Promise<void> {
  await db.delete(products).where(eq(products.id, id));
}

/** How many order lines reference this product. */
export async function countOrderItemsForProduct(id: number): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(orderItems)
    .where(eq(orderItems.productId, id));
  return rows[0]?.total ?? 0;
}

export async function replaceProductCharacters(productId: number, characterIds: number[]): Promise<void> {
  await db.delete(productCharacters).where(eq(productCharacters.productId, productId));
  if (characterIds.length > 0) {
    await db.insert(productCharacters).values(characterIds.map((characterId) => ({ productId, characterId })));
  }
}

export async function replaceProductAgeGroups(productId: number, ageGroupIds: number[]): Promise<void> {
  await db.delete(productAgeGroups).where(eq(productAgeGroups.productId, productId));
  if (ageGroupIds.length > 0) {
    await db.insert(productAgeGroups).values(ageGroupIds.map((ageGroupId) => ({ productId, ageGroupId })));
  }
}

export async function listProductCharacters(productIds: number[]) {
  if (productIds.length === 0) return [];
  return db
    .select({
      productId: productCharacters.productId,
      id: characters.id,
      name: characters.name,
      slug: characters.slug,
    })
    .from(productCharacters)
    .innerJoin(characters, eq(productCharacters.characterId, characters.id))
    .where(inArray(productCharacters.productId, productIds))
    .orderBy(asc(characters.sortOrder), asc(characters.name));
}

export async function listProductAgeGroups(productIds: number[]) {
  if (productIds.length === 0) return [];
  return db
    .select({
      productId: productAgeGroups.productId,
      id: ageGroups.id,
      name: ageGroups.name,
      slug: ageGroups.slug,
      startAge: ageGroups.startAge,
      endAge: ageGroups.endAge,
    })
    .from(productAgeGroups)
    .innerJoin(ageGroups, eq(productAgeGroups.ageGroupId, ageGroups.id))
    .where(inArray(productAgeGroups.productId, productIds))
    .orderBy(asc(ageGroups.startAge), asc(ageGroups.name));
}
