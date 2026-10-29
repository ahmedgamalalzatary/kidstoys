import { eq } from "drizzle-orm";
import { db, users } from "@kidstoys/db";

export type UserRow = typeof users.$inferSelect;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function insertUser(values: {
  name: string;
  email: string;
  passwordHash: string;
  role: "client" | "admin";
}): Promise<UserRow> {
  const [row] = await db.insert(users).values(values).$returningId();
  if (!row) {
    throw new Error("User was not created");
  }
  const created = await findUserById(row.id);
  if (!created) {
    throw new Error("User was not created");
  }
  return created;
}

export async function updateUser(
  id: number,
  values: Partial<{
    name: string;
    email: string;
    passwordHash: string;
    phone: string | null;
    city: string | null;
    address: string | null;
  }>,
): Promise<UserRow> {
  await db.update(users).set(values).where(eq(users.id, id));
  const updated = await findUserById(id);
  if (!updated) {
    throw new Error("User was not found");
  }
  return updated;
}
