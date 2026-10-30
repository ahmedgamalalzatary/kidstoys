import bcrypt from "bcryptjs";
import request from "supertest";
import type { Express } from "express";
import { sql } from "drizzle-orm";
import {
  cartItems,
  categories,
  characters,
  ageGroups,
  db,
  orderItems,
  orders,
  productAgeGroups,
  productCharacters,
  products,
  users,
} from "@kidstoys/db";
import { slugify } from "@kidstoys/shared";

const tables = [
  orderItems,
  orders,
  cartItems,
  productAgeGroups,
  productCharacters,
  products,
  ageGroups,
  characters,
  categories,
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
      buyPriceCents: 500,
      categoryId: options.categoryId,
      stock: options.stock ?? 10,
      minStock: options.minStock ?? 5,
      isActive: options.isActive ?? true,
    })
    .$returningId();

  if (!row) throw new Error("Product was not created");
  return { id: row.id, name, slug: options.slug ?? slugify(name) };
}

/** Creates a customer and returns a signed-in agent for them. */
export async function loginAsCustomer(app: Express) {
  const user = await createUser({ role: "client" });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: user.email, password: user.password });
  return { agent, user };
}

/** Creates an admin and returns a signed-in agent for them. */
export async function loginAsAdmin(app: Express) {
  const user = await createUser({ role: "admin" });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: user.email, password: user.password });
  return { agent, user };
}

/** Creates an order that contains the given product, so the product is "in an order". */
export async function createOrderWithProduct(options: {
  userId: number;
  productId: number;
  quantity?: number;
}): Promise<{ id: number; orderNumber: string }> {
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: `KT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      userId: options.userId,
      status: "delivered",
      paymentMethod: "cod",
      paymentStatus: "paid",
      subtotalCents: 1000,
      shippingCents: 0,
      totalCents: 1000,
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "123456",
      city: "Kuwait",
      shippingAddress: "Some street 1",
    })
    .$returningId();

  if (!order) throw new Error("Order was not created");

  await db.insert(orderItems).values({
    orderId: order.id,
    productId: options.productId,
    productName: "Wooden Train",
    productSlug: "wooden-train",
    unitPriceCents: 1000,
    unitCostCents: 500,
    quantity: options.quantity ?? 1,
  });

  return { id: order.id, orderNumber: `KT-${new Date().getFullYear()}-${order.id}` };
}
