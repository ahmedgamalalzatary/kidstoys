import { ApiError } from "../../shared/errors";

export const PASSWORD_MIN_LENGTH = 8;

/** Emails are matched case-insensitively and stored lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Throws when the password does not meet the minimum policy. */
export function assertPasswordAllowed(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw ApiError.badRequest("Please check the highlighted fields", {
      password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    });
  }
}
