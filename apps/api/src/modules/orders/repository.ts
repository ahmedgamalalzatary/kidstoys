import { and, count, desc, eq, gte, inArray, like, or, sql } from "drizzle-orm";
import { cartItems, db, orderItems, orders, products } from "@kidstoys/db";
import type { OrderStatus } from "@kidstoys/shared";

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;

/** Either the database or an open transaction — both can run the same queries. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Executor = Pick<Tx, "select" | "insert" | "update" | "delete">;

export interface CartLine {
  productId: number;
  productName: string;
  productSlug: string;
  unitPriceCents: number;
  quantity: number;
  stock: number;
  isActive: boolean;
}

/** The cart of a customer, with the current product details. */
export async function listCartLines(executor: Executor, userId: number): Promise<CartLine[]> {
  const rows = await executor
    .select({
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      unitPriceCents: products.priceCents,
      quantity: cartItems.quantity,
      stock: products.stock,
      isActive: products.isActive,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));

  return rows;
}

/** How many orders already exist in the given year, used for the order number. */
export async function countOrdersInYear(executor: Executor, year: number): Promise<number> {
  const rows = await executor
    .select({ total: count() })
    .from(orders)
    .where(like(orders.orderNumber, `KT-${year}-%`));

  return rows[0]?.total ?? 0;
}

export async function insertOrder(
  executor: Executor,
  values: typeof orders.$inferInsert,
): Promise<number> {
  const [row] = await executor.insert(orders).values(values).$returningId();
  if (!row) {
    throw new Error("Order was not created");
  }
  return row.id;
}

export async function insertOrderItems(
  executor: Executor,
  values: (typeof orderItems.$inferInsert)[],
): Promise<void> {
  if (values.length === 0) return;
  await executor.insert(orderItems).values(values);
}

export async function listOrdersForUser(executor: Executor, userId: number): Promise<OrderRow[]> {
  return executor
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.id));
}

export async function listAdminOrders(options: {
  q?: string;
  status: OrderStatus | "all";
  page: number;
  pageSize: number;
}): Promise<{ rows: OrderRow[]; total: number }> {
  const conditions = [];
  if (options.q) {
    const term = `%${options.q}%`;
    conditions.push(or(like(orders.orderNumber, term), like(orders.customerName, term)));
  }
  if (options.status !== "all") {
    conditions.push(eq(orders.status, options.status));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.id))
      .limit(options.pageSize)
      .offset((options.page - 1) * options.pageSize),
    db.select({ total: count() }).from(orders).where(where),
  ]);

  return { rows, total: totals[0]?.total ?? 0 };
}

export async function findOrderById(
  executor: Executor,
  id: number,
): Promise<OrderRow | null> {
  const [row] = await executor.select().from(orders).where(eq(orders.id, id)).limit(1);
  return row ?? null;
}

export async function updateOrder(
  executor: Executor,
  id: number,
  values: { status?: OrderStatus; paymentStatus?: "paid" | "unpaid" },
): Promise<void> {
  await executor.update(orders).set(values).where(eq(orders.id, id));
}

export async function listItemsForOrders(
  executor: Executor,
  orderIds: number[],
): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  return executor.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
}

export async function findOrderByNumber(
  executor: Executor,
  orderNumber: string,
  userId: number,
): Promise<OrderRow | null> {
  const [row] = await executor
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function listItemsForOrder(
  executor: Executor,
  orderId: number,
): Promise<OrderItemRow[]> {
  return executor.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

/** Takes stock away, but only when there is enough of it. Returns false when there is not. */
export async function decrementStock(
  executor: Executor,
  productId: number,
  quantity: number,
): Promise<boolean> {
  const result = await executor
    .update(products)
    .set({ stock: sql`${products.stock} - ${quantity}` })
    .where(and(eq(products.id, productId), gte(products.stock, quantity)));

  return affectedRows(result) > 0;
}

/** The raw mysql result is a tuple: [ResultSetHeader, fields]. */
function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

/** Puts stock back when an order is cancelled. */
export async function restoreStock(
  executor: Executor,
  productId: number,
  quantity: number,
): Promise<void> {
  await executor
    .update(products)
    .set({ stock: sql`${products.stock} + ${quantity}` })
    .where(eq(products.id, productId));
}

export async function deleteCartItems(
  executor: Executor,
  userId: number,
  productIds: number[],
): Promise<void> {
  if (productIds.length === 0) return;

  await executor
    .delete(cartItems)
    .where(
      and(eq(cartItems.userId, userId), inArray(cartItems.productId, productIds)),
    );
}
