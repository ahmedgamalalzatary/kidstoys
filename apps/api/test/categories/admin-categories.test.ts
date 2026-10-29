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

describe("GET /api/admin/categories", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(createApp()).get("/api/admin/categories");

    expect(response.status).toBe(401);
  });

  it("rejects a customer", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.get("/api/admin/categories");

    expect(response.status).toBe(403);
  });

  it("returns every category, including the inactive ones", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    await createCategory({ name: "Toys" });
    await createCategory({ name: "Hidden", isActive: false });

    const response = await agent.get("/api/admin/categories");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((category: { name: string }) => category.name)).toContain("Hidden");
  });
});

describe("POST /api/admin/categories", () => {
  it("creates a category with a generated slug", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.post("/api/admin/categories").send({ name: "Building Blocks" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "Building Blocks",
      slug: "building-blocks",
      isActive: true,
      productCount: 0,
    });
  });

  it("rejects a duplicate name", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    await createCategory({ name: "Toys" });

    const response = await agent.post("/api/admin/categories").send({ name: "Toys" });

    expect(response.status).toBe(409);
  });

  it("rejects a category without a name", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.post("/api/admin/categories").send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("name");
  });
});

describe("PATCH /api/admin/categories/:id", () => {
  it("updates the category", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });

    const response = await agent.patch(`/api/admin/categories/${category.id}`).send({ name: "Games" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: category.id, name: "Games" });
  });

  it("can hide a category without deleting it", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });

    const response = await agent
      .patch(`/api/admin/categories/${category.id}`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.isActive).toBe(false);
  });

  it("returns 404 for an unknown category", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.patch("/api/admin/categories/9999").send({ name: "Games" });

    expect(response.status).toBe(404);
  });

  it("refuses a name that another category already uses", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    await createCategory({ name: "Toys" });
    const games = await createCategory({ name: "Games" });

    const response = await agent.patch(`/api/admin/categories/${games.id}`).send({ name: "Toys" });

    expect(response.status).toBe(409);
  });
});

describe("DELETE /api/admin/categories/:id", () => {
  it("deletes an empty category", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });

    const response = await agent.delete(`/api/admin/categories/${category.id}`);

    expect(response.status).toBe(204);

    const listed = await agent.get("/api/admin/categories");
    expect(listed.body).toHaveLength(0);
  });

  it("refuses to delete a category that still holds products", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });
    await createProduct({ name: "Wooden Train", categoryId: category.id });

    const response = await agent.delete(`/api/admin/categories/${category.id}`);

    expect(response.status).toBe(409);
  });

  it("returns 404 for an unknown category", async () => {
    const app = createApp();
    const { agent } = await loginAsAdmin(app);

    const response = await agent.delete("/api/admin/categories/9999");

    expect(response.status).toBe(404);
  });
});
