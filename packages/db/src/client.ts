import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { env } from "./env";
import * as schema from "./schema";

export const pool = mysql.createPool({
  uri: env.databaseUrl,
  connectionLimit: 10,
  waitForConnections: true,
  timezone: "Z",
  decimalNumbers: true,
});

export const db = drizzle(pool, { schema, mode: "default" });

export { schema };
export * from "./schema";
export { env, loadRootEnv } from "./env";
