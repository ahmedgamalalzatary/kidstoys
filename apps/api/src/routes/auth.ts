import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, users } from "@kidstoys/db";
import { loginSchema, profileSchema, registerSchema } from "@kidstoys/shared";
import { ApiError } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";
import { clearSessionCookie, setSessionCookie, signSession } from "../lib/session";
import { parseBody } from "../lib/validation";
import { requireAuth, toUserDTO } from "../middleware/auth";

const router = Router();

/** Drizzle wraps driver errors, so the duplicate key code lives on the cause chain. */
function isDuplicateKeyError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

router.post("/register", async (req, res) => {
  const input = parseBody(registerSchema, req.body);

  const passwordHash = await hashPassword(input.password);

  try {
    const [row] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: "client",
      })
      .$returningId();

    if (!row) {
      throw new Error("User was not created");
    }

    const [created] = await db.select().from(users).where(eq(users.id, row.id)).limit(1);
    if (!created) {
      throw new Error("User was not created");
    }

    const token = await signSession({ userId: created.id, role: created.role });
    setSessionCookie(res, token);

    res.status(201).json({ user: toUserDTO(created) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw ApiError.conflict("An account with this email already exists");
    }
    throw error;
  }
});

router.post("/login", async (req, res) => {
  const input = parseBody(loginSchema, req.body);

  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user) {
    throw ApiError.unauthorized("Email or password is incorrect");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Email or password is incorrect");
  }

  const token = await signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);

  res.status(200).json({ user: toUserDTO(user) });
});

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

router.patch("/me", requireAuth, async (req, res) => {
  const input = parseBody(profileSchema, req.body);
  const current = req.user;
  if (!current) {
    throw ApiError.unauthorized();
  }

  const updates: Partial<typeof users.$inferInsert> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.city !== undefined) updates.city = input.city;
  if (input.address !== undefined) updates.address = input.address;

  if (input.newPassword) {
    const [row] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
    if (!row) {
      throw ApiError.unauthorized();
    }
    if (!input.currentPassword) {
      throw ApiError.badRequest("Please check the highlighted fields", {
        currentPassword: "Enter your current password",
      });
    }
    const valid = await verifyPassword(input.currentPassword, row.passwordHash);
    if (!valid) {
      throw ApiError.badRequest("Please check the highlighted fields", {
        currentPassword: "Current password is incorrect",
      });
    }
    updates.passwordHash = await hashPassword(input.newPassword);
  }

  try {
    await db.update(users).set(updates).where(eq(users.id, current.id));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw ApiError.conflict("An account with this email already exists");
    }
    throw error;
  }

  const [updated] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  if (!updated) {
    throw ApiError.unauthorized();
  }

  res.status(200).json({ user: toUserDTO(updated) });
});

export { router as authRouter };
