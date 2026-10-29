import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import {
  cartItems,
  categories,
  db,
  orderItems,
  orders,
  products,
  purchaseItems,
  purchases,
  suppliers,
  users,
} from "@kidstoys/db";

const tables = [
  orderItems,
  orders,
  purchaseItems,
  purchases,
  cartItems,
  products,
  categories,
  suppliers,
  users,
];

/** Wipes every table so each test starts from a known state. */
export async function resetDatabase(): Promise<void> {
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  for (const table of tables) {
    await db.delete(table);
  }
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
}

export async function createUser(options: {
  email?: string;
  name?: string;
  password?: string;
  role?: "client" | "admin";
}) {
  const email = options.email ?? `user-${Math.random().toString(36).slice(2)}@example.com`;
  const password = options.password ?? "supersecret";

  const [row] = await db
    .insert(users)
    .values({
      name: options.name ?? "Test User",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: options.role ?? "client",
    })
    .$returningId();

  return { id: row.id, email, password, role: options.role ?? "client" };
}
