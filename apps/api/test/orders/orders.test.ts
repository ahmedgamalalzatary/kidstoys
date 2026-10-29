import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { db, products } from "@kidstoys/db";
import { eq } from "drizzle-orm";
import { createApp } from "../../src/app";
import { createCategory, createProduct, loginAsCustomer, resetDatabase } from "../helpers";

/** The order number carries the year of the order, so the clock is pinned to a fixed moment. */
const FIXED_NOW = new Date("2027-01-15T09:00:00.000Z");
const ORDER_YEAR = FIXED_NOW.getFullYear();

/** The order number the API builds for a given sequence, year included. */
const orderNo = (sequence: number) => `KT-${ORDER_YEAR}-${String(sequence).padStart(4, "0")}`;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_NOW);
  await resetDatabase();
});

afterEach(() => {
  vi.useRealTimers();
});

const delivery = {
  customerName: "Sara Ahmed",
  customerPhone: "123456",
  city: "Kuwait",
  shippingAddress: "Some street 1",
};

beforeEach(async () => {
  await resetDatabase();
});

async function seedProduct(options: { priceCents?: number; stock?: number } = {}) {
  const toys = await createCategory({ name: "Toys" });
  return createProduct({
    name: "Wooden Train",
    categoryId: toys.id,
    priceCents: options.priceCents ?? 1000,
    stock: options.stock ?? 10,
  });
}

async function stockOf(productId: number): Promise<number> {
  const [row] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return row?.stock ?? -1;
}

describe("POST /api/orders", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(createApp()).post("/api/orders").send(delivery);

    expect(response.status).toBe(401);
  });

  it("rejects a checkout with an empty cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.post("/api/orders").send(delivery);

    expect(response.status).toBe(400);
  });

  it("creates a cash on delivery order from the cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ priceCents: 1000 });
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 2 });

    const response = await agent.post("/api/orders").send(delivery);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      orderNumber: orderNo(1),
      status: "pending",
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      subtotalCents: 2000,
      shippingCents: 500,
      totalCents: 2500,
      customerName: "Sara Ahmed",
      city: "Kuwait",
    });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      productId: product.id,
      productName: "Wooden Train",
      unitPriceCents: 1000,
      quantity: 2,
    });
  });

  it("gives each order the next number in the sequence", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const first = await agent.post("/api/orders").send(delivery);

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const second = await agent.post("/api/orders").send(delivery);

    expect(first.body.orderNumber).toBe(orderNo(1));
    expect(second.body.orderNumber).toBe(orderNo(2));
  });

  it("takes the stock out of the catalogue", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 5 });
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 2 });

    await agent.post("/api/orders").send(delivery);

    expect(await stockOf(product.id)).toBe(3);
  });

  it("empties the cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });

    await agent.post("/api/orders").send(delivery);

    const cart = await agent.get("/api/cart");
    expect(cart.body.items).toHaveLength(0);
  });

  it("refuses the order when the stock is not there anymore", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 1 });
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });

    // Somebody else buys the last one before the checkout happens.
    await db.update(products).set({ stock: 0 }).where(eq(products.id, product.id));

    const response = await agent.post("/api/orders").send(delivery);

    expect(response.status).toBe(409);
    expect(await stockOf(product.id)).toBe(0);
  });

  it("writes nothing when the order is refused", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 1 });
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await db.update(products).set({ stock: 0 }).where(eq(products.id, product.id));

    await agent.post("/api/orders").send(delivery);

    const orders = await agent.get("/api/orders");
    expect(orders.body).toHaveLength(0);
  });

  it("refuses the order when a product is no longer available", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 5 });
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });

    // The toy is withdrawn from the catalogue after it reached the cart.
    await db.update(products).set({ isActive: false }).where(eq(products.id, product.id));

    const response = await agent.post("/api/orders").send(delivery);

    expect(response.status).toBe(409);
    expect(await stockOf(product.id)).toBe(5);
  });

  it("rejects an incomplete delivery address", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });

    const response = await agent.post("/api/orders").send({ customerName: "Sara" });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("city");
  });
});

describe("GET /api/orders", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(createApp()).get("/api/orders");

    expect(response.status).toBe(401);
  });

  it("returns the customer's own orders, newest first", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await agent.post("/api/orders").send(delivery);
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await agent.post("/api/orders").send(delivery);

    const response = await agent.get("/api/orders");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].orderNumber).toBe(orderNo(2));
    expect(response.body[0].items).toHaveLength(1);
  });

  it("does not show another customer's orders", async () => {
    const app = createApp();
    const first = await loginAsCustomer(app);
    const second = await loginAsCustomer(app);
    const product = await seedProduct();

    await first.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await first.agent.post("/api/orders").send(delivery);

    const response = await second.agent.get("/api/orders");

    expect(response.body).toHaveLength(0);
  });
});

describe("GET /api/orders/:orderNumber", () => {
  it("returns the order detail", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ priceCents: 1000 });
    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await agent.post("/api/orders").send(delivery);

    const response = await agent.get(`/api/orders/${orderNo(1)}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ orderNumber: orderNo(1), status: "pending" });
    expect(response.body.items[0]).toMatchObject({ productName: "Wooden Train", quantity: 1 });
  });

  it("does not show another customer's order", async () => {
    const app = createApp();
    const first = await loginAsCustomer(app);
    const second = await loginAsCustomer(app);
    const product = await seedProduct();

    await first.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await first.agent.post("/api/orders").send(delivery);

    const response = await second.agent.get(`/api/orders/${orderNo(1)}`);

    expect(response.status).toBe(404);
  });

  it("returns 404 for an unknown order", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.get(`/api/orders/${orderNo(9999)}`);

    expect(response.status).toBe(404);
  });
});
