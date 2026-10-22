-- Accent-insensitive search (unaccent) and fuzzy name matching (pg_trgm). Both ship with Neon.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
