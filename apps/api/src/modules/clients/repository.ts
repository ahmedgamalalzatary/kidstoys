import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db, orderItems, orders, users } from "@kidstoys/db";

const clientColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  city: users.city,
  createdAt: users.createdAt,
  orderCount: sql<number>`count(${orders.id})`,
  totalSpentCents: sql<number>`coalesce(sum(case when ${orders.paymentStatus} = 'paid' then ${orders.totalCents} else 0 end), 0)`,
  lastOrderAt: sql<Date | string | null>`max(${orders.createdAt})`,
};

export async function listClients(q?: string) {
  const term = q ? `%${q}%` : undefined;
  return db
    .select(clientColumns)
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(
      and(
        eq(users.role, "client"),
        term ? or(like(users.name, term), like(users.email, term)) : undefined,
      ),
    )
    .groupBy(users.id)
    .orderBy(desc(users.createdAt), desc(users.id));
}

export async function findClientById(id: number) {
  const rows = await db
    .select(clientColumns)
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(and(eq(users.id, id), eq(users.role, "client")))
    .groupBy(users.id)
    .limit(1);
  return rows[0] ?? null;
}

export async function listOrdersForClient(userId: number) {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.id));
}

export async function listItemsForClientOrders(orderIds: number[]) {
  if (orderIds.length === 0) return [];
  return db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
}
