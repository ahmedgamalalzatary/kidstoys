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
import { slugify } from "@kidstoys/shared";

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

export async function createCategory(options: {
  name?: string;
  slug?: string;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const name = options.name ?? "Toys";
  const [row] = await db
    .insert(categories)
    .values({
      name,
      slug: options.slug ?? slugify(name),
      isActive: options.isActive ?? true,
      sortOrder: options.sortOrder ?? 0,
    })
    .$returningId();

  if (!row) throw new Error("Category was not created");
  return { id: row.id, name, slug: options.slug ?? slugify(name) };
}

export async function createProduct(options: {
  name?: string;
  slug?: string;
  categoryId: number;
  priceCents?: number;
  stock?: number;
  isActive?: boolean;
  minStock?: number;
}) {
  const name = options.name ?? "Wooden Train";
  const [row] = await db
    .insert(products)
    .values({
      name,
      slug: options.slug ?? slugify(name),
      description: "A lovely toy",
      priceCents: options.priceCents ?? 1000,
      categoryId: options.categoryId,
      stock: options.stock ?? 10,
      minStock: options.minStock ?? 5,
      isActive: options.isActive ?? true,
    })
    .$returningId();

  if (!row) throw new Error("Product was not created");
  return { id: row.id, name, slug: options.slug ?? slugify(name) };
}
