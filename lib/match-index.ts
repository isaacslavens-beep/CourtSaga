import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { buildMatchFile, extremesOf, hydrate, runSearch, suggest, type BuiltMatches, type MatchTable } from "@/app/diary/match-index";
import type { Tour } from "@/app/diary/library";
import type { Search } from "@/app/diary/matches";
import { builtBook } from "./built-books";
import { readTourModels } from "./tour-data";

// Matches (app/diary/match-index.ts) answers from every match a tour has played, kept in memory as typed
// columns. Each build writes the matches to a file (scripts/books.ts) and a server reads it once, the first
// time it's asked. Without the file, a local copy of the site reads the database instead; the live site
// never does, because reading every match on each new server would use up Neon's free monthly transfer.

const tables = new Map<Tour, Promise<MatchTable | null>>();

async function load(tour: Tour): Promise<MatchTable | null> {
  const built = await builtBook<BuiltMatches>("matches", tour);
  if (built) return hydrate(built);
  if (process.env.VERCEL_ENV === "production") return null;
  const data = await readTourModels(getDb(), tour);
  return data && hydrate(buildMatchFile(data));
}

/** A tour's matches, ready to search, or null if they can't be read */
export function matchTable(tour: Tour): Promise<MatchTable | null> {
  let table = tables.get(tour);
  if (!table) {
    table = load(tour).catch(() => null);
    tables.set(tour, table);
    // A failed read is tried again next time rather than kept
    table.then((t) => t ?? tables.delete(tour));
  }
  return table;
}

export async function searchMatches(tour: Tour, search: Search) {
  const t = await matchTable(tour);
  return t && runSearch(t, search);
}

export async function suggestMatches(tour: Tour, query: string) {
  const t = await matchTable(tour);
  return t ? suggest(t, query) : [];
}

/** How extreme a match was among its tour's, from its id ("atp_…", "wta_…"). Like the matches, it only
    changes with a deploy, so each match's is worked out once. */
export async function matchExtremes(id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const tour: Tour | null = id.startsWith("atp_") ? "atp" : id.startsWith("wta_") ? "wta" : null;
  if (!tour) return null;
  const t = await matchTable(tour);
  return t && extremesOf(t, id);
}
