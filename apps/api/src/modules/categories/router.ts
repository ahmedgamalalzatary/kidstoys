import { Router } from "express";
import { categorySchema } from "@kidstoys/shared";
import { requireRole } from "../../shared/middleware/auth";
import { parseBody, parseId } from "../../shared/validation";
import {
  createCategory,
  listCategories,
  listPublicCategories,
  removeCategory,
  updateCategoryById,
} from "./service";

const publicRouter = Router();
const adminRouter = Router();

publicRouter.get("/categories", async (_req, res) => {
  res.status(200).json(await listPublicCategories());
});

adminRouter.use(requireRole("admin"));

adminRouter.get("/categories", async (_req, res) => {
  res.status(200).json(await listCategories());
});

adminRouter.post("/categories", async (req, res) => {
  const input = parseBody(categorySchema, req.body);
  res.status(201).json(await createCategory(input));
});

adminRouter.patch("/categories/:id", async (req, res) => {
  const input = parseBody(categorySchema.partial(), req.body);
  res.status(200).json(await updateCategoryById(parseId(req.params.id), input));
});

adminRouter.delete("/categories/:id", async (req, res) => {
  await removeCategory(parseId(req.params.id));
  res.status(204).send();
});

export { publicRouter as categoriesPublicRouter, adminRouter as categoriesAdminRouter };
