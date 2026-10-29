import { Router } from "express";
import { productQuerySchema } from "@kidstoys/shared";
import { requireRole } from "../../shared/middleware/auth";
import { parseQuery } from "../../shared/validation";
import { getProduct, listCatalogProducts } from "./service";

const publicRouter = Router();
const adminRouter = Router();

publicRouter.get("/products", async (req, res) => {
  const query = parseQuery(productQuerySchema, req.query);

  const page = await listCatalogProducts({
    filters: { q: query.q, category: query.category },
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.status(200).json(page);
});

publicRouter.get("/products/:slug", async (req, res) => {
  res.status(200).json(await getProduct(req.params.slug));
});

adminRouter.use(requireRole("admin"));

export { publicRouter as productsPublicRouter, adminRouter as productsAdminRouter };
