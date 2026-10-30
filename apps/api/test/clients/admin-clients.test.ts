import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import {
  createCategory,
  createProduct,
  createUser,
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

describe("GET /api/admin/clients", () => {
  it("rejects anonymous users and customers", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);

    expect((await request(app).get("/api/admin/clients")).status).toBe(401);
    expect((await customer.agent.get("/api/admin/clients")).status).toBe(403);
  });

  it("returns customer order aggregates from the database", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });
    const product = await createProduct({ categoryId: category.id, priceCents: 1000, stock: 10 });
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 2 });
    const first = await customer.agent.post("/api/orders").send(delivery);
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await customer.agent.post("/api/orders").send(delivery);
    await admin.agent.patch(`/api/admin/orders/${first.body.id}`).send({ paymentStatus: "paid" });

    const response = await admin.agent.get("/api/admin/clients");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: customer.user.id,
      orderCount: 2,
      totalSpentCents: 2500,
    });
    expect(response.body[0].lastOrderAt).not.toBeNull();
  });

  it("searches customers by name or email", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    await createUser({ name: "Sara Ahmed", email: "sara@example.com" });
    await createUser({ name: "Omar Ali", email: "omar@example.com" });

    const byName = await admin.agent.get("/api/admin/clients?q=sara");
    const byEmail = await admin.agent.get("/api/admin/clients?q=omar@");

    expect(byName.body.map((client: { name: string }) => client.name)).toEqual(["Sara Ahmed"]);
    expect(byEmail.body.map((client: { name: string }) => client.name)).toEqual(["Omar Ali"]);
  });

  it("does not include admin accounts", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);

    const response = await admin.agent.get("/api/admin/clients");

    expect(response.body).toEqual([]);
  });
});

describe("GET /api/admin/clients/:id", () => {
  it("returns the customer and their orders, newest first", async () => {
    const app = createApp();
    const customer = await loginAsCustomer(app);
    const admin = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });
    const product = await createProduct({ categoryId: category.id, stock: 10 });
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    await customer.agent.post("/api/orders").send(delivery);
    await customer.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const second = await customer.agent.post("/api/orders").send(delivery);

    const response = await admin.agent.get(`/api/admin/clients/${customer.user.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: customer.user.id, orderCount: 2 });
    expect(response.body.orders).toHaveLength(2);
    expect(response.body.orders[0].id).toBe(second.body.id);
    expect(response.body.orders[0].items).toHaveLength(1);
  });

  it("returns 404 for an unknown customer", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);

    const response = await admin.agent.get("/api/admin/clients/999");

    expect(response.status).toBe(404);
  });
});
