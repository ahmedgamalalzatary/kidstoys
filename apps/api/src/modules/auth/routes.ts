import { Router } from "express";
import { loginSchema, profileSchema, registerSchema } from "@kidstoys/shared";
import { requireAuth } from "../../shared/middleware/auth";
import { parseBody } from "../../shared/validation";
import {
  endSession,
  login,
  register,
  startSession,
  updateProfile,
} from "./service";

const router = Router();

router.post("/register", async (req, res) => {
  const input = parseBody(registerSchema, req.body);
  const user = await register(input);
  await startSession(res, user);
  res.status(201).json({ user });
});

router.post("/login", async (req, res) => {
  const input = parseBody(loginSchema, req.body);
  const user = await login(input);
  await startSession(res, user);
  res.status(200).json({ user });
});

router.post("/logout", (_req, res) => {
  endSession(res);
  res.status(200).json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

router.patch("/me", requireAuth, async (req, res) => {
  const input = parseBody(profileSchema, req.body);
  const user = await updateProfile(req.user!.id, input);
  res.status(200).json({ user });
});

export { router as authRouter };
