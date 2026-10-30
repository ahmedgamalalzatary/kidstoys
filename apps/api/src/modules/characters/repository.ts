import { and, asc, count, eq, ne } from "drizzle-orm";
import { characters, db, productCharacters, products } from "@kidstoys/db";

const characterColumns = {
  id: characters.id,
  name: characters.name,
  slug: characters.slug,
  description: characters.description,
  imageUrl: characters.imageUrl,
  sortOrder: characters.sortOrder,
  isActive: characters.isActive,
};

export async function listCharacters(activeOnly: boolean) {
  return db
    .select({ ...characterColumns, productCount: count(products.id) })
    .from(characters)
    .leftJoin(productCharacters, eq(productCharacters.characterId, characters.id))
    .leftJoin(products, and(eq(products.id, productCharacters.productId), eq(products.isActive, true)))
    .where(activeOnly ? eq(characters.isActive, true) : undefined)
    .groupBy(characters.id)
    .orderBy(asc(characters.sortOrder), asc(characters.name));
}

export async function findCharacterById(id: number) {
  const [row] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return row ?? null;
}

export async function characterSlugExists(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: characters.id }).from(characters).where(eq(characters.slug, slug)).limit(1);
  return row !== undefined;
}

export async function characterNameExists(name: string, exceptId?: number): Promise<boolean> {
  const conditions = [eq(characters.name, name)];
  if (exceptId !== undefined) conditions.push(ne(characters.id, exceptId));
  const [row] = await db.select({ id: characters.id }).from(characters).where(and(...conditions)).limit(1);
  return row !== undefined;
}

export async function insertCharacter(values: typeof characters.$inferInsert) {
  const [row] = await db.insert(characters).values(values).$returningId();
  if (!row) throw new Error("Character was not created");
  const created = await findCharacterById(row.id);
  if (!created) throw new Error("Character was not created");
  return created;
}

export async function updateCharacter(id: number, values: Partial<typeof characters.$inferInsert>) {
  if (Object.keys(values).length > 0) {
    await db.update(characters).set(values).where(eq(characters.id, id));
  }
  const updated = await findCharacterById(id);
  if (!updated) throw new Error("Character was not found");
  return updated;
}

export async function deleteCharacter(id: number): Promise<void> {
  await db.delete(characters).where(eq(characters.id, id));
}

export async function countProductsForCharacter(id: number): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(productCharacters)
    .where(eq(productCharacters.characterId, id));
  return rows[0]?.total ?? 0;
}
