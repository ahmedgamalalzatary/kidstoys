import { sql } from "drizzle-orm";
import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const timestamps = {
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
};

export const users = mysqlTable(
  "users",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["client", "admin"]).notNull().default("client"),
    phone: varchar("phone", { length: 40 }),
    city: varchar("city", { length: 120 }),
    address: varchar("address", { length: 255 }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 500 }),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_name_unique").on(table.name),
    uniqueIndex("categories_slug_unique").on(table.slug),
  ],
);

export const products = mysqlTable(
  "products",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    sku: varchar("sku", { length: 60 }),
    shortDescription: varchar("short_description", { length: 255 }),
    description: text("description").notNull(),
    priceCents: int("price_cents").notNull(),
    compareAtCents: int("compare_at_cents"),
    categoryId: int("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    images: json("images")
      .$type<string[]>()
      .notNull()
      .default(sql`(JSON_ARRAY())`),
    stock: int("stock").notNull().default(0),
    minStock: int("min_stock").notNull().default(5),
    isActive: boolean("is_active").notNull().default(true),
    ageMin: int("age_min"),
    ageMax: int("age_max"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_idx").on(table.categoryId),
    index("products_active_idx").on(table.isActive),
  ],
);

export const cartItems = mysqlTable(
  "cart_items",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: int("quantity").notNull().default(1),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("cart_items_user_product_unique").on(table.userId, table.productId),
    index("cart_items_user_idx").on(table.userId),
  ],
);

export const orders = mysqlTable(
  "orders",
  {
    id: int("id").primaryKey().autoincrement(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: mysqlEnum("status", ["pending", "confirmed", "shipped", "delivered", "cancelled"])
      .notNull()
      .default("pending"),
    paymentMethod: mysqlEnum("payment_method", ["cod"]).notNull().default("cod"),
    paymentStatus: mysqlEnum("payment_status", ["unpaid", "paid"]).notNull().default("unpaid"),
    subtotalCents: int("subtotal_cents").notNull().default(0),
    shippingCents: int("shipping_cents").notNull().default(0),
    totalCents: int("total_cents").notNull().default(0),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 40 }).notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    shippingAddress: varchar("shipping_address", { length: 255 }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    index("orders_user_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
  ],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: int("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: varchar("product_name", { length: 200 }).notNull(),
    productSlug: varchar("product_slug", { length: 220 }).notNull(),
    unitPriceCents: int("unit_price_cents").notNull(),
    quantity: int("quantity").notNull().default(1),
  },
  (table) => [
    uniqueIndex("order_items_order_product_unique").on(table.orderId, table.productId),
    index("order_items_order_idx").on(table.orderId),
  ],
);

export const suppliers = mysqlTable(
  "suppliers",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 160 }).notNull(),
    contactName: varchar("contact_name", { length: 120 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 40 }),
    address: varchar("address", { length: 255 }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [uniqueIndex("suppliers_name_unique").on(table.name)],
);

export const purchases = mysqlTable(
  "purchases",
  {
    id: int("id").primaryKey().autoincrement(),
    purchaseNumber: varchar("purchase_number", { length: 32 }).notNull(),
    supplierId: int("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "restrict" }),
    status: mysqlEnum("status", ["draft", "ordered", "received", "cancelled"])
      .notNull()
      .default("draft"),
    orderedAt: datetime("ordered_at"),
    receivedAt: datetime("received_at"),
    totalCents: int("total_cents").notNull().default(0),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("purchases_purchase_number_unique").on(table.purchaseNumber),
    index("purchases_supplier_idx").on(table.supplierId),
  ],
);

export const purchaseItems = mysqlTable(
  "purchase_items",
  {
    id: int("id").primaryKey().autoincrement(),
    purchaseId: int("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: int("quantity").notNull(),
    unitCostCents: int("unit_cost_cents").notNull(),
    receivedQuantity: int("received_quantity").notNull().default(0),
  },
  (table) => [
    uniqueIndex("purchase_items_purchase_product_unique").on(table.purchaseId, table.productId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
