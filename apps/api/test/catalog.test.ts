import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createCategory, createProduct, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("GET /api/categories", () => {
  it("returns the active categories with their product counts", async () => {
    const toys = await createCategory({ name: "Toys", sortOrder: 1 });
    await createCategory({ name: "Hidden", isActive: false });
    await createProduct({ name: "Wooden Train", categoryId: toys.id });
    await createProduct({ name: "Robot Bear", categoryId: toys.id });
    await createProduct({ name: "Old Puzzle", categoryId: toys.id, isActive: false });

    const response = await request(createApp()).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      name: "Toys",
      slug: "toys",
      productCount: 2,
    });
  });

  it("orders categories by their sort order", async () => {
    await createCategory({ name: "Second", sortOrder: 2 });
    await createCategory({ name: "First", sortOrder: 1 });

    const response = await request(createApp()).get("/api/categories");

    expect(response.body.map((category: { name: string }) => category.name)).toEqual([
      "First",
      "Second",
    ]);
  });
});

describe("GET /api/products", () => {
  async function seedCatalog() {
    const toys = await createCategory({ name: "Toys" });
    const games = await createCategory({ name: "Games" });
    await createProduct({ name: "Wooden Train", categoryId: toys.id, priceCents: 1000 });
    await createProduct({ name: "Robot Bear", categoryId: toys.id, priceCents: 3000 });
    await createProduct({ name: "Puzzle Set", categoryId: games.id, priceCents: 2000 });
    await createProduct({ name: "Retired Car", categoryId: toys.id, isActive: false });
    return { toys, games };
  }

  it("returns a page of active products", async () => {
    await seedCatalog();

    const response = await request(createApp()).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(24);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.items).toHaveLength(3);
  });

  it("leaves out inactive products", async () => {
    await seedCatalog();

    const response = await request(createApp()).get("/api/products");

    expect(response.body.items.map((item: { name: string }) => item.name)).not.toContain(
      "Retired Car",
    );
  });

  it("matches the search term against the product name", async () => {
    await seedCatalog();

    const response = await request(createApp()).get("/api/products").query({ q: "train" });

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe("Wooden Train");
  });

  it("filters by category slug", async () => {
    const { games } = await seedCatalog();

    const response = await request(createApp()).get("/api/products").query({ category: games.slug });

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe("Puzzle Set");
  });

  it("sorts by price ascending", async () => {
    await seedCatalog();

    const response = await request(createApp()).get("/api/products").query({ sort: "price_asc" });

    expect(response.body.items.map((item: { priceCents: number }) => item.priceCents)).toEqual([
      1000, 2000, 3000,
    ]);
  });

  it("sorts by price descending", async () => {
    await seedCatalog();

    const response = await request(createApp()).get("/api/products").query({ sort: "price_desc" });

    expect(response.body.items.map((item: { priceCents: number }) => item.priceCents)).toEqual([
      3000, 2000, 1000,
    ]);
  });

  it("pages the results", async () => {
    await seedCatalog();

    const response = await request(createApp())
      .get("/api/products")
      .query({ page: 2, pageSize: 2 });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.totalPages).toBe(2);
  });

  it("includes the category name and slug on each product", async () => {
    await seedCatalog();

    const response = await request(createApp()).get("/api/products");

    expect(response.body.items[0]).toMatchObject({
      categoryName: expect.any(String),
      categorySlug: expect.any(String),
    });
  });

  it("rejects an unknown sort option", async () => {
    const response = await request(createApp()).get("/api/products").query({ sort: "random" });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/products/:slug", () => {
  it("returns the product detail", async () => {
    const toys = await createCategory({ name: "Toys" });
    await createProduct({ name: "Wooden Train", categoryId: toys.id, priceCents: 1999 });

    const response = await request(createApp()).get("/api/products/wooden-train");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Wooden Train",
      slug: "wooden-train",
      priceCents: 1999,
      categoryName: "Toys",
    });
    expect(response.body.images).toEqual([]);
  });

  it("returns 404 for an unknown product", async () => {
    const response = await request(createApp()).get("/api/products/nothing-here");

    expect(response.status).toBe(404);
  });

  it("returns 404 for an inactive product", async () => {
    const toys = await createCategory({ name: "Toys" });
    await createProduct({ name: "Retired Car", categoryId: toys.id, isActive: false });

    const response = await request(createApp()).get("/api/products/retired-car");

    expect(response.status).toBe(404);
  });
});
