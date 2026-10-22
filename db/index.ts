import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

// One pool per server instance, made on first use so a build never needs the database. Kept on
// globalThis so reloads in development don't open a new pool each time.
const cache = globalThis as unknown as { courtsagaDb?: Db };

export function getDb(): Db {
  if (cache.courtsagaDb) return cache.courtsagaDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL isn't set. See .env.example.");
  const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 10_000 });
  // On Vercel, closes idle connections before a function instance is suspended
  attachDatabasePool(pool);
  return (cache.courtsagaDb = drizzle(pool, { schema }));
}
