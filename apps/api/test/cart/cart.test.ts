import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import {
  createCategory,
  createProduct,
  loginAsCustomer,
  resetDatabase,
} from "../helpers";

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

describe("GET /api/cart", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(createApp()).get("/api/cart");

    expect(response.status).toBe(401);
  });

  it("returns an empty cart for a new customer", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.get("/api/cart");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [],
      subtotalCents: 0,
      shippingCents: 0,
      totalCents: 0,
      itemCount: 0,
    });
  });
});

describe("POST /api/cart/items", () => {
  it("adds a product to the cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ priceCents: 1000 });

    const response = await agent
      .post("/api/cart/items")
      .send({ productId: product.id, quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      productId: product.id,
      name: "Wooden Train",
      quantity: 2,
      unitPriceCents: 1000,
      lineTotalCents: 2000,
    });
    expect(response.body.subtotalCents).toBe(2000);
    expect(response.body.totalCents).toBe(response.body.subtotalCents + response.body.shippingCents);
    expect(response.body.itemCount).toBe(2);
  });

  it("increments the quantity when the product is already in the cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const response = await agent.post("/api/cart/items").send({ productId: product.id, quantity: 2 });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3);
  });

  it("rejects a product that is out of stock", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 0 });

    const response = await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });

    expect(response.status).toBe(409);
  });

  it("rejects a product that is no longer available", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const toys = await createCategory({ name: "Toys" });
    const product = await createProduct({
      name: "Retired Train",
      categoryId: toys.id,
      isActive: false,
    });

    const response = await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });

    expect(response.status).toBe(404);
  });

  it("rejects a product that does not exist", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.post("/api/cart/items").send({ productId: 9999, quantity: 1 });

    expect(response.status).toBe(404);
  });

  it("clamps the quantity to the available stock", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 3 });

    const response = await agent.post("/api/cart/items").send({ productId: product.id, quantity: 10 });

    expect(response.body.items[0].quantity).toBe(3);
  });

  it("keeps each customer's cart separate", async () => {
    const app = createApp();
    const first = await loginAsCustomer(app);
    const second = await loginAsCustomer(app);
    const product = await seedProduct();

    await first.agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });

    const response = await second.agent.get("/api/cart");

    expect(response.body.items).toHaveLength(0);
  });
});

describe("PATCH /api/cart/items/:productId", () => {
  it("sets a new quantity", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ priceCents: 1000 });

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const response = await agent
      .patch(`/api/cart/items/${product.id}`)
      .send({ quantity: 4 });

    expect(response.status).toBe(200);
    expect(response.body.items[0].quantity).toBe(4);
    expect(response.body.subtotalCents).toBe(4000);
  });

  it("clamps the quantity to the available stock", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 2 });

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const response = await agent
      .patch(`/api/cart/items/${product.id}`)
      .send({ quantity: 99 });

    expect(response.body.items[0].quantity).toBe(2);
  });

  it("removes the line when the quantity is zero", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const response = await agent.patch(`/api/cart/items/${product.id}`).send({ quantity: 0 });

    expect(response.body.items).toHaveLength(0);
  });

  it("rejects a product id that is not a number", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.patch("/api/cart/items/abc").send({ quantity: 2 });

    expect(response.status).toBe(400);
  });

  it("returns 404 for a product that is not in the cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();

    const response = await agent.patch(`/api/cart/items/${product.id}`).send({ quantity: 2 });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/cart/items/:productId", () => {
  it("removes the line", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct();

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const response = await agent.delete(`/api/cart/items/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
    expect(response.body.subtotalCents).toBe(0);
  });
});

describe("POST /api/cart/merge", () => {
  it("merges a guest cart into the signed-in cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 10 });

    await agent.post("/api/cart/items").send({ productId: product.id, quantity: 1 });
    const response = await agent
      .post("/api/cart/merge")
      .send({ items: [{ productId: product.id, quantity: 2 }] });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3);
  });

  it("adds the products that are only in the guest cart", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const toys = await createCategory({ name: "Toys" });
    const train = await createProduct({ name: "Wooden Train", categoryId: toys.id, stock: 10 });
    const bear = await createProduct({ name: "Robot Bear", categoryId: toys.id, stock: 10 });

    const response = await agent
      .post("/api/cart/merge")
      .send({ items: [{ productId: train.id, quantity: 1 }, { productId: bear.id, quantity: 2 }] });

    expect(response.body.items).toHaveLength(2);
    expect(response.body.itemCount).toBe(3);
  });

  it("ignores products that are out of stock", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const product = await seedProduct({ stock: 0 });

    const response = await agent
      .post("/api/cart/merge")
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    expect(response.body.items).toHaveLength(0);
  });

  it("ignores products that are no longer available", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);
    const toys = await createCategory({ name: "Toys" });
    const product = await createProduct({
      name: "Retired Train",
      categoryId: toys.id,
      isActive: false,
    });

    const response = await agent
      .post("/api/cart/merge")
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(0);
  });

  it("rejects an anonymous request", async () => {
    const response = await request(createApp())
      .post("/api/cart/merge")
      .send({ items: [] });

    expect(response.status).toBe(401);
  });
});
