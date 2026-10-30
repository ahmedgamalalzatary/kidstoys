import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { TestAgent } from "supertest/lib/agent";
import { createApp } from "../../src/app";
import { createCategory, loginAsAdmin, resetDatabase } from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

async function createDimensionProduct(
  app: Express,
  agent: TestAgent,
  options: {
    name: string;
    characterIds?: number[];
    ageGroupIds?: number[];
    isNew?: boolean;
    isBestSeller?: boolean;
  },
) {
  const category = await createCategory({ name: `${options.name} Category` });
  const response = await agent.post("/api/admin/products").send({
    name: options.name,
    priceCents: 1000,
    categoryId: category.id,
    stock: 5,
    characterIds: options.characterIds ?? [],
    ageGroupIds: options.ageGroupIds ?? [],
    isNew: options.isNew ?? false,
    isBestSeller: options.isBestSeller ?? false,
  });
  expect(response.status).toBe(201);
  return response.body;
}

describe("product dimensions and badges", () => {
  it("returns a product's characters, age groups and badges", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const character = await admin.agent.post("/api/admin/characters").send({ name: "Elsa" });
    const group = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Kids", startAge: 4, endAge: 8 });

    const product = await createDimensionProduct(app, admin.agent, {
      name: "Ice Castle",
      characterIds: [character.body.id],
      ageGroupIds: [group.body.id],
      isNew: true,
      isBestSeller: true,
    });

    expect(product).toMatchObject({ isNew: true, isBestSeller: true });
    expect(product.characters).toEqual([{ id: character.body.id, name: "Elsa", slug: "elsa" }]);
    expect(product.ageGroups).toEqual([
      { id: group.body.id, name: "Kids", slug: "kids", startAge: 4, endAge: 8 },
    ]);

    const detail = await request(app).get(`/api/products/${product.slug}`);
    expect(detail.body.characters).toHaveLength(1);
    expect(detail.body.ageGroups).toHaveLength(1);
  });

  it("replaces all characters and age groups on patch", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const first = await admin.agent.post("/api/admin/characters").send({ name: "Elsa" });
    const second = await admin.agent.post("/api/admin/characters").send({ name: "Batman" });
    const toddlers = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Toddlers", startAge: 1, endAge: 3 });
    const kids = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Kids", startAge: 4, endAge: 8 });
    const product = await createDimensionProduct(app, admin.agent, {
      name: "Figure",
      characterIds: [first.body.id],
      ageGroupIds: [toddlers.body.id],
    });

    const response = await admin.agent.patch(`/api/admin/products/${product.id}`).send({
      characterIds: [second.body.id],
      ageGroupIds: [kids.body.id],
    });

    expect(response.status).toBe(200);
    expect(response.body.characters).toEqual([
      { id: second.body.id, name: "Batman", slug: "batman" },
    ]);
    expect(response.body.ageGroups).toEqual([
      { id: kids.body.id, name: "Kids", slug: "kids", startAge: 4, endAge: 8 },
    ]);
  });

  it("filters characters with OR inside the dimension", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const elsa = await admin.agent.post("/api/admin/characters").send({ name: "Elsa" });
    const batman = await admin.agent.post("/api/admin/characters").send({ name: "Batman" });
    const other = await admin.agent.post("/api/admin/characters").send({ name: "Other" });
    await createDimensionProduct(app, admin.agent, { name: "Castle", characterIds: [elsa.body.id] });
    await createDimensionProduct(app, admin.agent, { name: "Batmobile", characterIds: [batman.body.id] });
    await createDimensionProduct(app, admin.agent, { name: "Puzzle", characterIds: [other.body.id] });

    const response = await request(app).get("/api/products?character=elsa,batman");

    expect(response.body.total).toBe(2);
    expect(response.body.items.map((product: { name: string }) => product.name).sort()).toEqual([
      "Batmobile",
      "Castle",
    ]);
  });

  it("combines character and age-group filters with AND", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const elsa = await admin.agent.post("/api/admin/characters").send({ name: "Elsa" });
    const batman = await admin.agent.post("/api/admin/characters").send({ name: "Batman" });
    const kids = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Kids", startAge: 4, endAge: 8 });
    await createDimensionProduct(app, admin.agent, {
      name: "Castle",
      characterIds: [elsa.body.id],
      ageGroupIds: [kids.body.id],
    });
    await createDimensionProduct(app, admin.agent, {
      name: "Batmobile",
      characterIds: [batman.body.id],
      ageGroupIds: [kids.body.id],
    });

    const response = await request(app).get("/api/products?character=elsa&ageGroup=kids");

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe("Castle");
  });

  it("filters by an age covered by an open-ended group", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const toddlers = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Toddlers", startAge: 1, endAge: 3 });
    const teens = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Teens", startAge: 13 });
    await createDimensionProduct(app, admin.agent, { name: "Blocks", ageGroupIds: [toddlers.body.id] });
    await createDimensionProduct(app, admin.agent, { name: "Robot", ageGroupIds: [teens.body.id] });

    const response = await request(app).get("/api/products?age=15");

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].name).toBe("Robot");
  });

  it("filters by the new and best-seller badges", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    await createDimensionProduct(app, admin.agent, { name: "New Toy", isNew: true });
    await createDimensionProduct(app, admin.agent, { name: "Popular Toy", isBestSeller: true });

    const newest = await request(app).get("/api/products?new=true");
    const popular = await request(app).get("/api/products?bestSeller=true");

    expect(newest.body.items.map((product: { name: string }) => product.name)).toEqual(["New Toy"]);
    expect(popular.body.items.map((product: { name: string }) => product.name)).toEqual(["Popular Toy"]);
  });

  it("returns an empty page for an unknown dimension slug", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    await createDimensionProduct(app, admin.agent, { name: "Toy" });

    const response = await request(app).get("/api/products?character=unknown");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
    expect(response.body.items).toEqual([]);
  });
});
