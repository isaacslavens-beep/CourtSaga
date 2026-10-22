import { defineConfig } from "drizzle-kit";

// Migrations are generated from db/schema.ts into drizzle/ and applied by scripts/migrate.ts.
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
