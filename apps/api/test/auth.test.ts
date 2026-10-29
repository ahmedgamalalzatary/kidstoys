import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { createUser, resetDatabase } from "./helpers";

beforeEach(async () => {
  await resetDatabase();
});

describe("POST /api/auth/register", () => {
  it("creates a customer account and returns the profile", async () => {
    const response = await request(createApp()).post("/api/auth/register").send({
      name: "Sara",
      email: "sara@example.com",
      password: "supersecret",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: "Sara",
      email: "sara@example.com",
      role: "client",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects an email that is already registered", async () => {
    await createUser({ email: "sara@example.com" });

    const response = await request(createApp()).post("/api/auth/register").send({
      name: "Sara",
      email: "sara@example.com",
      password: "supersecret",
    });

    expect(response.status).toBe(409);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const response = await request(createApp()).post("/api/auth/register").send({
      name: "Sara",
      email: "sara@example.com",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty("password");
  });
});

describe("POST /api/auth/login", () => {
  it("returns the user and sets a session cookie", async () => {
    await createUser({ email: "sara@example.com", password: "supersecret" });

    const response = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "sara@example.com", password: "supersecret" });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("sara@example.com");
    expect(response.headers["set-cookie"]?.[0]).toContain("kidstoys_session=");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("rejects a wrong password", async () => {
    await createUser({ email: "sara@example.com", password: "supersecret" });

    const response = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "sara@example.com", password: "wrongpassword" });

    expect(response.status).toBe(401);
  });

  it("rejects an unknown email", async () => {
    const response = await request(createApp())
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "supersecret" });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a session", async () => {
    const response = await request(createApp()).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  it("returns the signed-in user", async () => {
    await createUser({ email: "sara@example.com", password: "supersecret" });
    const agent = request.agent(createApp());
    await agent.post("/api/auth/login").send({
      email: "sara@example.com",
      password: "supersecret",
    });

    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("sara@example.com");
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    await createUser({ email: "sara@example.com", password: "supersecret" });
    const agent = request.agent(createApp());
    await agent.post("/api/auth/login").send({
      email: "sara@example.com",
      password: "supersecret",
    });

    const response = await agent.post("/api/auth/logout");

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"]?.[0]).toContain("kidstoys_session=;");
  });
});
