import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { createUser, loginAsCustomer, resetDatabase } from "../helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("PATCH /api/auth/me", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(createApp()).patch("/api/auth/me").send({ name: "Sara" });

    expect(response.status).toBe(401);
  });

  it("updates the profile fields", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.patch("/api/auth/me").send({
      name: "Sara Ahmed",
      phone: "123456",
      city: "Kuwait",
      address: "Some street 1",
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      name: "Sara Ahmed",
      phone: "123456",
      city: "Kuwait",
      address: "Some street 1",
    });
  });

  it("changes the password when the current one is correct", async () => {
    const app = createApp();
    const { agent, user } = await loginAsCustomer(app);

    const response = await agent
      .patch("/api/auth/me")
      .send({ currentPassword: user.password, newPassword: "brandnewsecret" });

    expect(response.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "brandnewsecret" });
    expect(login.status).toBe(200);
  });

  it("rejects a password change with the wrong current password", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent
      .patch("/api/auth/me")
      .send({ currentPassword: "wrongpassword", newPassword: "brandnewsecret" });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("currentPassword");
  });

  it("rejects a password change without the current password", async () => {
    const app = createApp();
    const { agent } = await loginAsCustomer(app);

    const response = await agent.patch("/api/auth/me").send({ newPassword: "brandnewsecret" });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("currentPassword");
  });

  it("rejects a new password that is too short", async () => {
    const app = createApp();
    const { agent, user } = await loginAsCustomer(app);

    const response = await agent
      .patch("/api/auth/me")
      .send({ currentPassword: user.password, newPassword: "short" });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("newPassword");
  });

  it("rejects an email that another account already uses", async () => {
    const app = createApp();
    await createUser({ email: "taken@example.com" });
    const { agent } = await loginAsCustomer(app);

    const response = await agent.patch("/api/auth/me").send({ email: "taken@example.com" });

    expect(response.status).toBe(409);
  });
});
