import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { db } from "./client";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path of the generated migration folder. */
export const migrationsFolder = path.resolve(here, "../drizzle");

/** Applies any pending migrations to the configured database. */
export async function runMigrations(folder: string = migrationsFolder): Promise<void> {
  await migrate(db, { migrationsFolder: folder });
}
