import { exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { beforeEach, describe, expect, it } from "vitest";
import { ageGroups, categories, characters, db, products, users } from "@kidstoys/db";
import { count, eq } from "drizzle-orm";
import type { MySqlTable } from "drizzle-orm/mysql-core";
import { resetDatabase } from "../helpers";

const execute = promisify(exec);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

async function runSeed() {
  return execute("pnpm --filter @kidstoys/db run db:seed", {
    cwd: repoRoot,
    env: {
      ...process.env,
      ADMIN_EMAIL: "owner@example.com",
      ADMIN_PASSWORD: "owner-password",
    },
    timeout: 30_000,
  });
}

async function total(table: MySqlTable) {
  const rows = await db.select({ total: count() }).from(table);
  return rows[0]?.total ?? 0;
}

beforeEach(async () => {
  await resetDatabase();
});

describe("database seed", () => {
  it("creates the documented catalog without duplicating it on a second run", async () => {
    await runSeed();

    expect(await total(products)).toBe(24);
    expect(await total(categories)).toBeGreaterThanOrEqual(4);
    expect(await total(characters)).toBe(0);
    expect(await total(ageGroups)).toBe(0);
    const [admin] = await db.select().from(users).where(eq(users.email, "owner@example.com"));
    expect(admin).toMatchObject({ role: "admin" });
    const catalog = await db.select().from(products);
    expect(catalog.every((product) => product.buyPriceCents >= 0)).toBe(true);
    expect(catalog.every((product) => product.images.every((image) => image.startsWith("/uploads/seed/")))).toBe(true);

    await runSeed();

    expect(await total(products)).toBe(24);
    expect(await total(categories)).toBeGreaterThanOrEqual(4);
    expect(await total(users)).toBe(1);
  }, 60_000);
});
