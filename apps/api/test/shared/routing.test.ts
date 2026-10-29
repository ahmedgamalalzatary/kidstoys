import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";

describe("unknown routes", () => {
  it("answers with a 404 instead of the sign-in guard", async () => {
    const response = await request(createApp()).get("/api/nope");

    expect(response.status).toBe(404);
  });

  it("keeps the whole cart prefix behind the sign-in guard", async () => {
    const response = await request(createApp()).get("/api/cart/nope");

    expect(response.status).toBe(401);
  });
});
