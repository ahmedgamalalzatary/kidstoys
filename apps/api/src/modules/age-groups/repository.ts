import { and, asc, count, eq, ne } from "drizzle-orm";
import { ageGroups, db, productAgeGroups, products } from "@kidstoys/db";

const ageGroupColumns = {
  id: ageGroups.id,
  name: ageGroups.name,
  slug: ageGroups.slug,
  startAge: ageGroups.startAge,
  endAge: ageGroups.endAge,
  isActive: ageGroups.isActive,
};

export async function listAgeGroups(activeOnly: boolean) {
  return db
    .select({ ...ageGroupColumns, productCount: count(products.id) })
    .from(ageGroups)
    .leftJoin(productAgeGroups, eq(productAgeGroups.ageGroupId, ageGroups.id))
    .leftJoin(products, and(eq(products.id, productAgeGroups.productId), eq(products.isActive, true)))
    .where(activeOnly ? eq(ageGroups.isActive, true) : undefined)
    .groupBy(ageGroups.id)
    .orderBy(asc(ageGroups.startAge), asc(ageGroups.name));
}

export async function findAgeGroupById(id: number) {
  const [row] = await db.select().from(ageGroups).where(eq(ageGroups.id, id)).limit(1);
  return row ?? null;
}

export async function ageGroupSlugExists(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: ageGroups.id }).from(ageGroups).where(eq(ageGroups.slug, slug)).limit(1);
  return row !== undefined;
}

export async function ageGroupNameExists(name: string, exceptId?: number): Promise<boolean> {
  const conditions = [eq(ageGroups.name, name)];
  if (exceptId !== undefined) conditions.push(ne(ageGroups.id, exceptId));
  const [row] = await db.select({ id: ageGroups.id }).from(ageGroups).where(and(...conditions)).limit(1);
  return row !== undefined;
}

export async function insertAgeGroup(values: typeof ageGroups.$inferInsert) {
  const [row] = await db.insert(ageGroups).values(values).$returningId();
  if (!row) throw new Error("Age group was not created");
  const created = await findAgeGroupById(row.id);
  if (!created) throw new Error("Age group was not created");
  return created;
}

export async function updateAgeGroup(id: number, values: Partial<typeof ageGroups.$inferInsert>) {
  if (Object.keys(values).length > 0) {
    await db.update(ageGroups).set(values).where(eq(ageGroups.id, id));
  }
  const updated = await findAgeGroupById(id);
  if (!updated) throw new Error("Age group was not found");
  return updated;
}

export async function deleteAgeGroup(id: number): Promise<void> {
  await db.delete(ageGroups).where(eq(ageGroups.id, id));
}

export async function countProductsForAgeGroup(id: number): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(productAgeGroups)
    .where(eq(productAgeGroups.ageGroupId, id));
  return rows[0]?.total ?? 0;
}
