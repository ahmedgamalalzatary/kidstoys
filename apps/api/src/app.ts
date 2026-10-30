import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "@kidstoys/db";
import { errorHandler, notFoundHandler } from "./shared/middleware/error";
import { authRouter } from "./modules/auth";
import { cartRouter } from "./modules/cart";
import { categoriesAdminRouter, categoriesPublicRouter } from "./modules/categories";
import { healthRouter } from "./modules/health";
import { ordersAdminRouter, ordersRouter } from "./modules/orders";
import { productsAdminRouter, productsPublicRouter } from "./modules/products";

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

  // Public surface
  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api", categoriesPublicRouter);
  app.use("/api", productsPublicRouter);
  app.use("/api", cartRouter);
  app.use("/api", ordersRouter);

  // Dashboard surface
  app.use("/api/admin", categoriesAdminRouter);
  app.use("/api/admin", productsAdminRouter);
  app.use("/api/admin", ordersAdminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
