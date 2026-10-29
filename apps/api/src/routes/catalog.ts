import { Router } from "express";
import { and, asc, count, desc, eq, like, type SQL } from "drizzle-orm";
import { categories, db, products } from "@kidstoys/db";
import { productQuerySchema } from "@kidstoys/shared";
import { ApiError } from "../lib/errors";
import { toCategoryDTO, toProductDTO } from "../lib/mappers";
import { parseQuery } from "../lib/validation";

const router = Router();

const productColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  sku: products.sku,
  shortDescription: products.shortDescription,
  description: products.description,
  priceCents: products.priceCents,
  compareAtCents: products.compareAtCents,
  categoryId: products.categoryId,
  images: products.images,
  stock: products.stock,
  minStock: products.minStock,
  isActive: products.isActive,
  ageMin: products.ageMin,
  ageMax: products.ageMax,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

router.get("/categories", async (_req, res) => {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      imageUrl: categories.imageUrl,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(products.categoryId, categories.id), eq(products.isActive, true)),
    )
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  res.status(200).json(rows.map(toCategoryDTO));
});

router.get("/products", async (req, res) => {
  const query = parseQuery(productQuerySchema, req.query);

  const filters: SQL[] = [eq(products.isActive, true)];

  if (query.q) {
    filters.push(like(products.name, `%${query.q}%`));
  }

  if (query.category) {
    filters.push(eq(categories.slug, query.category));
  }

  const where = and(...filters);

  const orderBy =
    query.sort === "price_asc"
      ? [asc(products.priceCents)]
      : query.sort === "price_desc"
        ? [desc(products.priceCents)]
        : query.sort === "name_asc"
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
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  res.status(200).json({
    items: rows.map(toProductDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  });
});

router.get("/products/:slug", async (req, res) => {
  const [row] = await db
    .select({
      ...productColumns,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, req.params.slug), eq(products.isActive, true)))
    .limit(1);

  if (!row) {
    throw ApiError.notFound("That product is no longer available");
  }

  res.status(200).json(toProductDTO(row));
});

export { router as catalogRouter };
