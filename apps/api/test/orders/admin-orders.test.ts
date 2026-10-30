import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { TestAgent } from "supertest/lib/agent";
import { db, products } from "@kidstoys/db";
import { eq } from "drizzle-orm";
import { createApp } from "../../src/app";
import {
  createCategory,
  createProduct,
  loginAsAdmin,
  loginAsCustomer,
  resetDatabase,
} from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

const delivery = {
  customerName: "Sara Ahmed",
  customerPhone: "123456",
  city: "Kuwait",
  shippingAddress: "Some street 1",
};

async function placeOrder(
  app: Express,
  agent: TestAgent,
  options: { customerName?: string; quantity?: number } = {},
) {
  const toys = await createCategory({ name: `Toys ${Math.random()}` });
  const product = await createProduct({
    name: `Train ${Math.random()}`,
    categoryId: toys.id,
    stock: 10,
  });
  await agent.post("/api/cart/items").send({
    productId: product.id,
    quantity: options.quantity ?? 2,
  });
  const response = await agent.post("/api/orders").send({
    ...delivery,
    customerName: options.customerName ?? delivery.customerName,
  });
  expect(response.status).toBe(201);
  return { order: response.body, product };
}

async function stockOf(productId: number): Promise<number> {
  const [row] = await db.select().from(products).where(eq(products.id, productId));
  return row?.stock ?? -1;
}

describe("GET /api/admin/orders", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(createApp()).get("/api/admin/orders");

    expect(response.status).toBe(401);
  });

  it("rejects a customer", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.get("/api/admin/orders");

    expect(response.status).toBe(403);
  });

  it("returns every customer's order, newest first, with pagination", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const other = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    await placeOrder(app, customer.agent);
    const second = await placeOrder(app, other.agent);

    const response = await admin.agent.get("/api/admin/orders?page=1&pageSize=1");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].orderNumber).toBe(second.order.orderNumber);
    expect(response.body.items[0].items).toHaveLength(1);
  });

  it("searches by order number and customer name", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    await placeOrder(app, customer.agent, { customerName: "Sara Ahmed" });
    const match = await placeOrder(app, customer.agent, { customerName: "Omar Ali" });

    const byName = await admin.agent.get("/api/admin/orders?q=omar");
    const byNumber = await admin.agent.get(
      `/api/admin/orders?q=${match.order.orderNumber.toLowerCase()}`,
    );

    expect(byName.body.items).toHaveLength(1);
    expect(byName.body.items[0].id).toBe(match.order.id);
    expect(byNumber.body.items).toHaveLength(1);
    expect(byNumber.body.items[0].id).toBe(match.order.id);
  });

  it("filters by status", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const { order } = await placeOrder(app, customer.agent);
    await admin.agent.patch(`/api/admin/orders/${order.id}`).send({ status: "confirmed" });
    await placeOrder(app, customer.agent);

    const response = await admin.agent.get("/api/admin/orders?status=confirmed");

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(order.id);
  });
});

describe("PATCH /api/admin/orders/:id", () => {
  it("moves an order through the allowed status lifecycle", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const { order } = await placeOrder(app, customer.agent);

    for (const status of ["confirmed", "shipped", "delivered"]) {
      const response = await admin.agent
        .patch(`/api/admin/orders/${order.id}`)
        .send({ status });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(status);
    }
  });

  it("updates payment status without changing the order status", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const { order } = await placeOrder(app, customer.agent);

    const response = await admin.agent
      .patch(`/api/admin/orders/${order.id}`)
      .send({ paymentStatus: "paid" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "pending", paymentStatus: "paid" });
  });

  it("rejects a status that skips a lifecycle step", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const { order } = await placeOrder(app, customer.agent);

    const response = await admin.agent
      .patch(`/api/admin/orders/${order.id}`)
      .send({ status: "shipped" });

    expect(response.status).toBe(409);
  });

  it("restores stock when an order is cancelled", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const { order, product } = await placeOrder(app, customer.agent, { quantity: 2 });
    expect(await stockOf(product.id)).toBe(8);

    const response = await admin.agent
      .patch(`/api/admin/orders/${order.id}`)
      .send({ status: "cancelled" });

    expect(response.status).toBe(200);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("does not restore stock twice", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const { order, product } = await placeOrder(app, customer.agent);
    await admin.agent.patch(`/api/admin/orders/${order.id}`).send({ status: "cancelled" });

    const response = await admin.agent
      .patch(`/api/admin/orders/${order.id}`)
      .send({ status: "cancelled" });

    expect(response.status).toBe(409);
    expect(await stockOf(product.id)).toBe(10);
  });

  it("does not allow cancellation after shipping", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const { order, product } = await placeOrder(app, customer.agent);
    await admin.agent.patch(`/api/admin/orders/${order.id}`).send({ status: "confirmed" });
    await admin.agent.patch(`/api/admin/orders/${order.id}`).send({ status: "shipped" });

    const response = await admin.agent
      .patch(`/api/admin/orders/${order.id}`)
      .send({ status: "cancelled" });

    expect(response.status).toBe(409);
    expect(await stockOf(product.id)).toBe(8);
  });

  it("returns 404 for an unknown order", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);

    const response = await admin.agent
      .patch("/api/admin/orders/999")
      .send({ paymentStatus: "paid" });

    expect(response.status).toBe(404);
  });
});
