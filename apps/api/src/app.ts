import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "@kidstoys/db";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
