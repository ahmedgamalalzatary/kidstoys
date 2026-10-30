import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db, orderItems } from "@kidstoys/db";
import { eq } from "drizzle-orm";
import { createApp } from "../../src/app";
import { createCategory, loginAsAdmin, loginAsCustomer, resetDatabase } from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function productFields(options: { buyPriceCents?: number } = {}) {
  const category = await createCategory({ name: `Toys ${Math.random()}` });
  return {
    name: "Wooden Train",
    priceCents: 2000,
    buyPriceCents: options.buyPriceCents ?? 800,
    categoryId: String(category.id),
    stock: "10",
  };
}

describe("product cost and video", () => {
  it("requires a buy price when creating a product", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();
    const { buyPriceCents: _buyPriceCents, ...withoutBuyPrice } = fields;

    const response = await admin.agent.post("/api/admin/products").send(withoutBuyPrice);

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("buyPriceCents");
  });

  it("returns cost and video to admins but never exposes cost publicly", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();
    const created = await admin.agent.post("/api/admin/products").send({
      ...fields,
      videoUrl: "https://example.com/product-video",
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      buyPriceCents: 800,
      videoUrl: "https://example.com/product-video",
    });

    const detail = await request(app).get(`/api/products/${created.body.slug}`);
    expect(detail.body.videoUrl).toBe("https://example.com/product-video");
    expect(detail.body).not.toHaveProperty("buyPriceCents");

    const list = await request(app).get("/api/products");
    expect(list.body.items[0]).not.toHaveProperty("buyPriceCents");
  });

  it("rejects a non-HTTPS video URL", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();

    const response = await admin.agent.post("/api/admin/products").send({
      ...fields,
      videoUrl: "http://example.com/video",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("videoUrl");
  });

  it("updates buy price and clears the video", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();
    const created = await admin.agent.post("/api/admin/products").send({
      ...fields,
      videoUrl: "https://example.com/video",
    });

    const response = await admin.agent
      .patch(`/api/admin/products/${created.body.id}`)
      .send({ buyPriceCents: 950, videoUrl: null });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ buyPriceCents: 950, videoUrl: null });
  });
});

describe("product image uploads", () => {
  it("stores uploaded files and returns same-origin paths", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();
    let builder = admin.agent.post("/api/admin/products");
    for (const [key, value] of Object.entries(fields)) builder = builder.field(key, value);

    const response = await builder
      .attach("images", png, { filename: "front.png", contentType: "image/png" })
      .attach("images", png, { filename: "back.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.images).toHaveLength(2);
    expect(response.body.images[0]).toMatch(/^\/uploads\/products\/.+\.png$/);

    const image = await request(app).get(response.body.images[0]);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toContain("image/png");
  });

  it("rejects client-supplied image URLs", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();

    const response = await admin.agent.post("/api/admin/products").send({
      ...fields,
      images: ["https://example.com/train.png"],
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("images");
  });

  it("rejects unsupported image types", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();
    let builder = admin.agent.post("/api/admin/products");
    for (const [key, value] of Object.entries(fields)) builder = builder.field(key, value);

    const response = await builder.attach("images", Buffer.from("GIF89a"), {
      filename: "animation.gif",
      contentType: "image/gif",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("images");
  });

  it("rejects content that is not really an image", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();
    let builder = admin.agent.post("/api/admin/products");
    for (const [key, value] of Object.entries(fields)) builder = builder.field(key, value);

    const response = await builder.attach("images", Buffer.from("not an image"), {
      filename: "fake.png",
      contentType: "image/png",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("images");
  });

  it("enforces the upload file-size limit", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const fields = await productFields();
    let builder = admin.agent.post("/api/admin/products");
    for (const [key, value] of Object.entries(fields)) builder = builder.field(key, value);

    const response = await builder.attach("images", Buffer.alloc(5 * 1024 * 1024 + 1), {
      filename: "large.png",
      contentType: "image/png",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("images");
  });
});

describe("order cost snapshots", () => {
  it("keeps the buy price captured at checkout", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const customer = await loginAsCustomer(app);
    const fields = await productFields();
    const created = await admin.agent.post("/api/admin/products").send(fields);
    await customer.agent.post("/api/cart/items").send({ productId: created.body.id, quantity: 2 });

    const order = await customer.agent.post("/api/orders").send({
      customerName: "Sara Ahmed",
      customerPhone: "123456",
      city: "Kuwait",
      shippingAddress: "Some street 1",
    });
    await admin.agent.patch(`/api/admin/products/${created.body.id}`).send({ buyPriceCents: 1200 });

    const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.body.id));
    expect(item?.unitCostCents).toBe(800);
    expect(order.body.items[0]).not.toHaveProperty("unitCostCents");
  });
});
