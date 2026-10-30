import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import {
  createCategory,
  createOrderWithProduct,
  createProduct,
  loginAsAdmin,
  loginAsCustomer,
  resetDatabase,
} from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("GET /api/admin/products", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(createApp()).get("/api/admin/products");

    expect(response.status).toBe(401);
  });

  it("rejects a customer", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.get("/api/admin/products");

    expect(response.status).toBe(403);
  });

  it("includes inactive products", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });
    await createProduct({ name: "Wooden Train", categoryId: toys.id });
    await createProduct({ name: "Retired Car", categoryId: toys.id, isActive: false });

    const response = await agent.get("/api/admin/products");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
  });

  it("can be filtered to low stock products only", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });
    await createProduct({ name: "Plenty", categoryId: toys.id, stock: 50, minStock: 5 });
    await createProduct({ name: "Nearly Gone", categoryId: toys.id, stock: 2, minStock: 5 });

    const response = await agent.get("/api/admin/products").query({ lowStock: true });

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe("Nearly Gone");
  });
});

describe("POST /api/admin/products", () => {
  it("creates a product with a generated slug and image list", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });

    const response = await agent.post("/api/admin/products").send({
      name: "Wooden Train",
      description: "A lovely train",
      priceCents: 1999,
      buyPriceCents: 1000,
      categoryId: toys.id,
      stock: 12,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Wooden Train",
      slug: "wooden-train",
      priceCents: 1999,
      buyPriceCents: 1000,
      stock: 12,
      isActive: true,
      minStock: 5,
    });
    expect(response.body.images).toEqual([]);
  });

  it("rejects a product without a category", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.post("/api/admin/products").send({
      name: "Wooden Train",
      priceCents: 1999,
      buyPriceCents: 1000,
      stock: 12,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("categoryId");
  });

  it("rejects a negative price", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });

    const response = await agent.post("/api/admin/products").send({
      name: "Wooden Train",
      priceCents: -5,
      buyPriceCents: 1000,
      categoryId: toys.id,
      stock: 12,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("priceCents");
  });

  it("gives a product with an existing name a distinct slug", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });
    await createProduct({ name: "Wooden Train", categoryId: toys.id });

    const response = await agent.post("/api/admin/products").send({
      name: "Wooden Train",
      priceCents: 1999,
      buyPriceCents: 1000,
      categoryId: toys.id,
      stock: 12,
    });

    expect(response.status).toBe(201);
    expect(response.body.slug).toBe("wooden-train-2");
  });
});

describe("PATCH /api/admin/products/:id", () => {
  it("updates the stock and the price", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });
    const product = await createProduct({ name: "Wooden Train", categoryId: toys.id });

    const response = await agent
      .patch(`/api/admin/products/${product.id}`)
      .send({ stock: 30, priceCents: 2500 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ stock: 30, priceCents: 2500 });
  });

  it("keeps the product when the body is empty", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });
    const product = await createProduct({ name: "Wooden Train", categoryId: toys.id });

    const response = await agent.patch(`/api/admin/products/${product.id}`).send({});

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: product.id,
      name: "Wooden Train",
      priceCents: 1000,
      stock: 10,
      description: "A lovely toy",
    });
  });

  it("rejects an id that is not a number", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.patch("/api/admin/products/abc").send({ stock: 30 });

    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown product", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.patch("/api/admin/products/9999").send({ stock: 30 });

    expect(response.status).toBe(404);
  });

  it("refuses a negative stock", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });
    const product = await createProduct({ name: "Wooden Train", categoryId: toys.id });

    const response = await agent.patch(`/api/admin/products/${product.id}`).send({ stock: -5 });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("stock");
  });
});

describe("DELETE /api/admin/products/:id", () => {
  it("deletes a product that is not in any order", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const toys = await createCategory({ name: "Toys" });
    const product = await createProduct({ name: "Wooden Train", categoryId: toys.id });

    const response = await agent.delete(`/api/admin/products/${product.id}`);

    expect(response.status).toBe(204);

    const listed = await agent.get("/api/admin/products");
    expect(listed.body.total).toBe(0);
  });

  it("refuses to delete a product that appears in an order", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const { user } = await loginAsCustomer(app);
    const toys = await createCategory({ name: "Toys" });
    const product = await createProduct({ name: "Wooden Train", categoryId: toys.id });
    await createOrderWithProduct({ userId: user.id, productId: product.id });

    const response = await agent.delete(`/api/admin/products/${product.id}`);

    expect(response.status).toBe(409);
  });

  it("returns 404 for an unknown product", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.delete("/api/admin/products/9999");

    expect(response.status).toBe(404);
  });
});
