// Applies the migrations in drizzle/ to the database in DATABASE_URL_UNPOOLED (or DATABASE_URL).
//
//   npm run db:migrate
//
// Vercel runs it before every production build (the `vercel-build` script). Preview builds skip it, so a
// branch's migrations never reach the production database before the branch is merged.

import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.log("migrate: no DATABASE_URL set, so there is nothing to migrate.");
    return;
  }
  if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
    console.log(`migrate: skipped on a ${process.env.VERCEL_ENV} build; only production builds migrate.`);
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("migrate: the database is up to date.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("migrate: failed.", err);
  process.exit(1);
});
