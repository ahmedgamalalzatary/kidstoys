import { Router } from "express";
import { adminProductQuerySchema, productPatchSchema, productQuerySchema, productSchema } from "@kidstoys/shared";
import { requireRole } from "../../shared/middleware/auth";
import { parseBody, parseId, parseQuery } from "../../shared/validation";
import { productImageUpload, saveProductImages } from "../../shared/product-uploads";
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
    filters: {
      q: query.q,
      category: query.category,
      character: query.character,
      ageGroup: query.ageGroup,
      age: query.age,
      new: query.new,
      bestSeller: query.bestSeller,
    },
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
    includeCost: true,
  });

  res.status(200).json(page);
});

adminRouter.post("/products", productImageUpload, async (req, res) => {
  const input = parseBody(productSchema, req.body);
  const images = await saveProductImages((req.files as Express.Multer.File[] | undefined) ?? []);
  res.status(201).json(await createProduct(input, images));
});

adminRouter.patch("/products/:id", productImageUpload, async (req, res) => {
  const input = parseBody(productPatchSchema, req.body);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const images = files.length > 0 ? await saveProductImages(files) : undefined;
  res.status(200).json(await updateProductById(parseId(req.params.id), input, images));
});

adminRouter.delete("/products/:id", async (req, res) => {
  await removeProduct(parseId(req.params.id));
  res.status(204).send();
});

export { publicRouter as productsPublicRouter, adminRouter as productsAdminRouter };
