import type { Response } from "express";
import type { LoginInput, RegisterInput, UserDTO } from "@kidstoys/shared";
import { ApiError } from "../../shared/errors";
import { toUserDTO } from "../../shared/mappers";
import { hashPassword, verifyPassword } from "../../shared/password";
import { clearSessionCookie, setSessionCookie, signSession } from "../../shared/session";
import { findUserById, findUserByEmail, insertUser, updateUser } from "./repository";
import { assertPasswordAllowed, normalizeEmail } from "./rules";

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

export async function register(input: RegisterInput): Promise<UserDTO> {
  assertPasswordAllowed(input.password);

  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  try {
    const created = await insertUser({ name: input.name, email, passwordHash, role: "client" });
    return toUserDTO(created);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw ApiError.conflict("An account with this email already exists");
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<UserDTO> {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  if (!user) {
    throw ApiError.unauthorized("Email or password is incorrect");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized("Email or password is incorrect");
  }

  return toUserDTO(user);
}

export async function updateProfile(
  userId: number,
  input: {
    name?: string;
    email?: string;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    currentPassword?: string;
    newPassword?: string;
  },
): Promise<UserDTO> {
  const updates: Parameters<typeof updateUser>[1] = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = normalizeEmail(input.email);
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.city !== undefined) updates.city = input.city;
  if (input.address !== undefined) updates.address = input.address;

  if (input.newPassword) {
    assertPasswordAllowed(input.newPassword);

    const current = await findUserById(userId);
    if (!current) {
      throw ApiError.unauthorized();
    }
    if (!input.currentPassword) {
      throw ApiError.badRequest("Please check the highlighted fields", {
        currentPassword: "Enter your current password",
      });
    }
    const valid = await verifyPassword(input.currentPassword, current.passwordHash);
    if (!valid) {
      throw ApiError.badRequest("Please check the highlighted fields", {
        currentPassword: "Current password is incorrect",
      });
    }
    updates.passwordHash = await hashPassword(input.newPassword);
  }

  try {
    const updated = await updateUser(userId, updates);
    return toUserDTO(updated);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw ApiError.conflict("An account with this email already exists");
    }
    throw error;
  }
}

export async function startSession(res: Response, user: UserDTO): Promise<void> {
  const token = await signSession({ userId: user.id, role: user.role });
  setSessionCookie(res, token);
}

export function endSession(res: Response): void {
  clearSessionCookie(res);
}
