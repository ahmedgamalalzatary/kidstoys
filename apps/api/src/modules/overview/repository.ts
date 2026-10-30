import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { categories, db, orderItems, orders, products, users } from "@kidstoys/db";

export async function getOverviewData() {
  const [revenueRows, costRows, orderRows, pendingRows, customerRows, productRows, lowStockRows, recentOrders, lowStockProducts] =
    await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${orders.totalCents}), 0)` })
        .from(orders)
        .where(eq(orders.paymentStatus, "paid")),
      db
        .select({ total: sql<number>`coalesce(sum(${orderItems.unitCostCents} * ${orderItems.quantity}), 0)` })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orders.paymentStatus, "paid")),
      db.select({ total: count() }).from(orders),
      db.select({ total: count() }).from(orders).where(eq(orders.status, "pending")),
      db.select({ total: count() }).from(users).where(eq(users.role, "client")),
      db.select({ total: count() }).from(products),
      db.select({ total: count() }).from(products).where(sql`${products.stock} <= ${products.minStock}`),
      db.select().from(orders).orderBy(desc(orders.id)).limit(5),
      db
        .select({ product: products, categoryName: categories.name, categorySlug: categories.slug })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(sql`${products.stock} <= ${products.minStock}`)
        .orderBy(desc(products.id))
        .limit(10),
    ]);

  const recentOrderItems = recentOrders.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, recentOrders.map((order) => order.id)))
    : [];

  return {
    revenueCents: Number(revenueRows[0]?.total ?? 0),
    costOfGoodsSoldCents: Number(costRows[0]?.total ?? 0),
    orderCount: orderRows[0]?.total ?? 0,
    pendingOrderCount: pendingRows[0]?.total ?? 0,
    customerCount: customerRows[0]?.total ?? 0,
    productCount: productRows[0]?.total ?? 0,
    lowStockCount: lowStockRows[0]?.total ?? 0,
    recentOrders,
    recentOrderItems,
    lowStockProducts,
  };
}
