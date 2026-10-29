import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createCategory, createProduct, resetDatabase } from "../helpers";

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
