import { Router } from "express";
import { ageGroupPatchSchema, ageGroupSchema } from "@kidstoys/shared";
import { requireRole } from "../../shared/middleware/auth";
import { parseBody, parseId } from "../../shared/validation";
import {
  createAgeGroup,
  listAllAgeGroups,
  listPublicAgeGroups,
  removeAgeGroup,
  updateAgeGroupById,
} from "./service";

const publicRouter = Router();
const adminRouter = Router();

publicRouter.get("/age-groups", async (_req, res) => {
  res.status(200).json(await listPublicAgeGroups());
});

adminRouter.use(requireRole("admin"));
adminRouter.get("/age-groups", async (_req, res) => {
  res.status(200).json(await listAllAgeGroups());
});
adminRouter.post("/age-groups", async (req, res) => {
  res.status(201).json(await createAgeGroup(parseBody(ageGroupSchema, req.body)));
});
adminRouter.patch("/age-groups/:id", async (req, res) => {
  const input = parseBody(ageGroupPatchSchema, req.body);
  res.status(200).json(await updateAgeGroupById(parseId(req.params.id), input));
});
adminRouter.delete("/age-groups/:id", async (req, res) => {
  await removeAgeGroup(parseId(req.params.id));
  res.status(204).send();
});

export { publicRouter as ageGroupsPublicRouter, adminRouter as ageGroupsAdminRouter };
