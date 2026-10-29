import { SignJWT, jwtVerify } from "jose";
import type { Response } from "express";
import { env } from "@kidstoys/db";
import type { Role } from "@kidstoys/shared";
import { ApiError } from "./errors";

export const SESSION_COOKIE = "kidstoys_session";

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is missing from the environment");
  }
  return new TextEncoder().encode(env.jwtSecret);
}

export interface SessionPayload {
  userId: number;
  role: Role;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Malformed subject");
    }
    return { userId, role: payload.role as Role };
  } catch {
    throw ApiError.unauthorized("Your session has expired, please sign in again");
  }
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
    maxAge: ONE_WEEK_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}
