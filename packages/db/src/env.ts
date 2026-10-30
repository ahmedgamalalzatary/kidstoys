import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The repo keeps a single .env at its root; both apps and tooling load it from there. */
export function loadRootEnv(): void {
  config({ path: path.resolve(here, "../../../.env") });
  config({ path: path.resolve(here, "../../../.env.local"), override: true });
}

loadRootEnv();

function buildUrlFromParts(): string | undefined {
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  if (!user || !host || !database) return undefined;
  const credentials = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : user;
  return `mysql://${credentials}@${host}:${port ?? "3306"}/${database}`;
}

export const databaseUrl: string = (() => {
  const url = process.env.DATABASE_URL ?? buildUrlFromParts();
  if (!url) {
    throw new Error(
      "No database connection string. Set DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME in the root .env.",
    );
  }
  return url;
})();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl,
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  apiPort: Number(process.env.API_PORT ?? 4000),
  apiBaseUrl: process.env.API_BASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:4000",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads"),
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@kidstoys.test",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin",
};
