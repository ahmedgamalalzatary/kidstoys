import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
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

describe("GET /api/admin/overview", () => {
  it("rejects anonymous users and customers", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);

    expect((await request(app).get("/api/admin/overview")).status).toBe(401);
    expect((await customer.agent.get("/api/admin/overview")).status).toBe(403);
  });

  it("computes paid-order revenue, cost and gross profit from snapshots", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });
    const product = await createProduct({ categoryId: category.id, priceCents: 1000, stock: 10 });
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 2 });
    const paid = await customer.agent.post("/api/orders").send(delivery);
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await customer.agent.post("/api/orders").send(delivery);
    await admin.agent.patch(`/api/admin/orders/${paid.body.id}`).send({ paymentStatus: "paid" });
    await admin.agent.patch(`/api/admin/products/${product.id}`).send({ buyPriceCents: 900 });

    const response = await admin.agent.get("/api/admin/overview");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      revenueCents: 2500,
      costOfGoodsSoldCents: 1000,
      grossProfitCents: 1500,
      orderCount: 2,
      pendingOrderCount: 2,
      customerCount: 1,
      productCount: 1,
      lowStockCount: 0,
    });
  });

  it("returns recent orders and products at or below their stock threshold", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });
    const product = await createProduct({ categoryId: category.id, stock: 10 });
    const low = await createProduct({ name: "Low", categoryId: category.id, stock: 5, minStock: 5 });
    await createProduct({ name: "Empty", categoryId: category.id, stock: 0, minStock: 5 });
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await customer.agent.post("/api/orders").send(delivery);
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const newest = await customer.agent.post("/api/orders").send(delivery);

    const response = await admin.agent.get("/api/admin/overview");

    expect(response.body.lowStockCount).toBe(2);
    expect(response.body.recentOrders[0].id).toBe(newest.body.id);
    expect(response.body.recentOrders[0].items).toHaveLength(1);
    expect(response.body.lowStockProducts.map((item: { id: number }) => item.id)).toContain(low.id);
    expect(response.body.lowStockProducts).toHaveLength(2);
  });
});
