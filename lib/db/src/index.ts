import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || dbUrl.trim() === "") {
  const nodeEnv = process.env.NODE_ENV ?? "unset";
  const setKeys = Object.keys(process.env)
    .filter((k) => process.env[k] !== undefined && process.env[k] !== "")
    .sort();
  throw new Error(
    `DATABASE_URL must be set. Did you forget to provision a database?\n` +
      `NODE_ENV=${nodeEnv}\n` +
      `Set env vars (${setKeys.length}): ${setKeys.join(", ")}`,
  );
}

export const pool = new Pool({ connectionString: dbUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
