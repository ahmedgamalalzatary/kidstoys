import { Router } from "express";
import { characterSchema } from "@kidstoys/shared";
import { requireRole } from "../../shared/middleware/auth";
import { parseBody, parseId } from "../../shared/validation";
import {
  createCharacter,
  listAllCharacters,
  listPublicCharacters,
  removeCharacter,
  updateCharacterById,
} from "./service";

const publicRouter = Router();
const adminRouter = Router();

publicRouter.get("/characters", async (_req, res) => {
  res.status(200).json(await listPublicCharacters());
});

adminRouter.use(requireRole("admin"));
adminRouter.get("/characters", async (_req, res) => {
  res.status(200).json(await listAllCharacters());
});
adminRouter.post("/characters", async (req, res) => {
  res.status(201).json(await createCharacter(parseBody(characterSchema, req.body)));
});
adminRouter.patch("/characters/:id", async (req, res) => {
  const input = parseBody(characterSchema.partial(), req.body);
  res.status(200).json(await updateCharacterById(parseId(req.params.id), input));
});
adminRouter.delete("/characters/:id", async (req, res) => {
  await removeCharacter(parseId(req.params.id));
  res.status(204).send();
});

export { publicRouter as charactersPublicRouter, adminRouter as charactersAdminRouter };
