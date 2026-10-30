import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createCategory, loginAsAdmin, resetDatabase } from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("characters", () => {
  it("creates a character with a generated slug", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);

    const response = await admin.agent.post("/api/admin/characters").send({ name: "Spider-Man" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: "Spider-Man", slug: "spider-man", isActive: true });
  });

  it("rejects a duplicate character name", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    await admin.agent.post("/api/admin/characters").send({ name: "Batman" });

    const response = await admin.agent.post("/api/admin/characters").send({ name: "Batman" });

    expect(response.status).toBe(409);
  });

  it("updates a character", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const created = await admin.agent.post("/api/admin/characters").send({ name: "Batman" });

    const response = await admin.agent
      .patch(`/api/admin/characters/${created.body.id}`)
      .send({ description: "Gotham hero", isActive: false });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ description: "Gotham hero", isActive: false });
  });

  it("lists every character for admins but only active characters publicly", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    await admin.agent.post("/api/admin/characters").send({ name: "Batman" });
    await admin.agent.post("/api/admin/characters").send({ name: "Hidden", isActive: false });

    const adminList = await admin.agent.get("/api/admin/characters");
    const publicList = await request(app).get("/api/characters");

    expect(adminList.body).toHaveLength(2);
    expect(publicList.status).toBe(200);
    expect(publicList.body).toHaveLength(1);
    expect(publicList.body[0]).toMatchObject({ name: "Batman", productCount: 0 });
  });

  it("blocks deleting a character that products use", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });
    const character = await admin.agent.post("/api/admin/characters").send({ name: "Batman" });
    await admin.agent.post("/api/admin/products").send({
      name: "Batmobile",
      priceCents: 2000,
      buyPriceCents: 1000,
      categoryId: category.id,
      stock: 2,
      characterIds: [character.body.id],
    });

    const response = await admin.agent.delete(`/api/admin/characters/${character.body.id}`);

    expect(response.status).toBe(409);
  });

  it("deletes an unused character", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const character = await admin.agent.post("/api/admin/characters").send({ name: "Batman" });

    const response = await admin.agent.delete(`/api/admin/characters/${character.body.id}`);

    expect(response.status).toBe(204);
  });
});

describe("age groups", () => {
  it("creates an open-ended age group", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);

    const response = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Teens", startAge: 13 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: "Teens", slug: "teens", startAge: 13, endAge: null });
  });

  it("rejects an end age below the start age", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);

    const response = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Invalid", startAge: 8, endAge: 3 });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("endAge");
  });

  it("lists age groups youngest first", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    await admin.agent.post("/api/admin/age-groups").send({ name: "Kids", startAge: 4, endAge: 8 });
    await admin.agent.post("/api/admin/age-groups").send({ name: "Toddlers", startAge: 1, endAge: 3 });

    const response = await admin.agent.get("/api/admin/age-groups");

    expect(response.body.map((group: { name: string }) => group.name)).toEqual(["Toddlers", "Kids"]);
  });

  it("updates an age group", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const created = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Toddlers", startAge: 1, endAge: 3 });

    const response = await admin.agent
      .patch(`/api/admin/age-groups/${created.body.id}`)
      .send({ endAge: 4 });

    expect(response.status).toBe(200);
    expect(response.body.endAge).toBe(4);
  });

  it("lists only active age groups publicly", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    await admin.agent.post("/api/admin/age-groups").send({ name: "Toddlers", startAge: 1 });
    await admin.agent.post("/api/admin/age-groups").send({ name: "Hidden", startAge: 5, isActive: false });

    const response = await request(app).get("/api/age-groups");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({ name: "Toddlers", productCount: 0 });
  });

  it("blocks deleting an age group that products use", async () => {
    const app = createApp();
    const admin = await loginAsAdmin(app);
    const category = await createCategory({ name: "Toys" });
    const group = await admin.agent
      .post("/api/admin/age-groups")
      .send({ name: "Toddlers", startAge: 1, endAge: 3 });
    await admin.agent.post("/api/admin/products").send({
      name: "Blocks",
      priceCents: 1000,
      buyPriceCents: 500,
      categoryId: category.id,
      stock: 2,
      ageGroupIds: [group.body.id],
    });

    const response = await admin.agent.delete(`/api/admin/age-groups/${group.body.id}`);

    expect(response.status).toBe(409);
  });
});
