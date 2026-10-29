import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config as loadEnv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

// The connection settings live in the single root .env.
loadEnv({ path: path.join(repoRoot, ".env") });

/**
 * The suite runs against a disposable MySQL schema so the development data is never touched.
 * The connection string is taken from the root .env and the database name is swapped.
 */
const baseUrl = process.env.DATABASE_URL ?? "mysql://root:root@127.0.0.1:3306/kidstoys";
const testUrl = new URL(baseUrl);
testUrl.pathname = "/kidstoys_test";

// Set before @kidstoys/db is imported: dotenv never overrides an existing variable.
process.env.DATABASE_URL = testUrl.toString();
process.env.NODE_ENV = "test";

async function ensureDatabaseExists(): Promise<void> {
  const connection = await mysql.createConnection({
    host: testUrl.hostname,
    port: Number(testUrl.port || 3306),
    user: decodeURIComponent(testUrl.username),
    password: decodeURIComponent(testUrl.password),
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`kidstoys_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();
}

await ensureDatabaseExists();

const { runMigrations } = await import("@kidstoys/db");

await runMigrations(path.join(repoRoot, "packages/db/drizzle"));
