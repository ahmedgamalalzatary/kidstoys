import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { message: `No route matches ${req.method} ${req.path}` } });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: {
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { message: "Something went wrong on our side" } });
}
