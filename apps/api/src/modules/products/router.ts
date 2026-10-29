import { Router } from "express";
import { adminProductQuerySchema, productPatchSchema, productQuerySchema, productSchema } from "@kidstoys/shared";
import { requireRole } from "../../shared/middleware/auth";
import { parseBody, parseId, parseQuery } from "../../shared/validation";
import {
  createProduct,
  getProduct,
  listCatalogProducts,
  removeProduct,
  updateProductById,
} from "./service";

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

adminRouter.get("/products", async (req, res) => {
  const query = parseQuery(adminProductQuerySchema, req.query);

  const page = await listCatalogProducts({
    filters: {
      q: query.q,
      category: query.category,
      includeInactive: query.includeInactive,
      lowStock: query.lowStock,
    },
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  });

  res.status(200).json(page);
});

adminRouter.post("/products", async (req, res) => {
  const input = parseBody(productSchema, req.body);
  res.status(201).json(await createProduct(input));
});

adminRouter.patch("/products/:id", async (req, res) => {
  const input = parseBody(productPatchSchema, req.body);
  res.status(200).json(await updateProductById(parseId(req.params.id), input));
});

adminRouter.delete("/products/:id", async (req, res) => {
  await removeProduct(parseId(req.params.id));
  res.status(204).send();
});

export { publicRouter as productsPublicRouter, adminRouter as productsAdminRouter };
