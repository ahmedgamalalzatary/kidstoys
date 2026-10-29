import type { ZodType } from "zod";
import { ApiError } from "./errors";

/** Turns a zod issue list into a `{ field: message }` map for inline form errors. */
export function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

/** Parses and validates a request payload, throwing a 400 with field errors when invalid. */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw ApiError.badRequest("Please check the highlighted fields", toFieldErrors(result.error.issues));
  }
  return result.data;
}

/** Parses and validates a query string, throwing a 400 with field errors when invalid. */
export function parseQuery<T>(schema: ZodType<T>, query: unknown): T {
  return parseBody(schema, query);
}
