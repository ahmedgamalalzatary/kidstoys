import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, users } from "@kidstoys/db";
import type { Role, UserDTO } from "@kidstoys/shared";
import { ApiError } from "../errors";
import { toUserDTO } from "../mappers";
import { SESSION_COOKIE, verifySession } from "../session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDTO;
    }
  }
}

/** Loads the signed-in user, or null when there is no valid session. */
export async function loadSessionUser(req: Request): Promise<UserDTO | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = await verifySession(token);
  const [row] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return row ? toUserDTO(row) : null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user = await loadSessionUser(req);
  if (!user) {
    next(ApiError.unauthorized());
    return;
  }
  req.user = user;
  next();
}

export function requireRole(...roles: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = await loadSessionUser(req);
    if (!user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(user.role)) {
      next(ApiError.forbidden());
      return;
    }
    req.user = user;
    next();
  };
}
