import { slugify } from "@kidstoys/shared";

/**
 * Builds a slug that is not taken yet, appending `-2`, `-3`, ... when needed.
 * The `exists` callback decides whether a candidate is already used.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let suffix = 2;

  while (await exists(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
