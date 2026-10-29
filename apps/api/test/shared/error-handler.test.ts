import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../src/shared/errors";
import { errorHandler, notFoundHandler } from "../../src/shared/middleware/error";

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("notFoundHandler", () => {
  it("answers with a 404 and the requested route", () => {
    const res = fakeResponse();

    notFoundHandler({ method: "GET", path: "/api/nope" } as Request, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: { message: "No route matches GET /api/nope" },
    });
  });
});

describe("errorHandler", () => {
  it("keeps the status and the field errors of an ApiError", () => {
    const res = fakeResponse();

    errorHandler(
      ApiError.badRequest("Please check the highlighted fields", { email: "Invalid" }),
      {} as Request,
      res,
      (() => undefined) as NextFunction,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        message: "Please check the highlighted fields",
        fields: { email: "Invalid" },
      },
    });
  });

  it("hides the details of an unexpected error behind a 500", () => {
    const res = fakeResponse();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    errorHandler(
      new Error("connection pool exhausted"),
      {} as Request,
      res,
      (() => undefined) as NextFunction,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: { message: "Something went wrong on our side" },
    });
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
