import "server-only";
import { getDb } from "@/db";
import { buildPlayedFile, hydratePlayed, type BuiltPlayed, type PlayedTable } from "@/app/diary/played";
import type { Tour } from "@/app/diary/library";
import { builtBook } from "./built-books";
import { readTourModels } from "./tour-data";

// Every match a tour has played, for match pages, Tournaments and search (app/diary/played.ts). Each build
// writes it to a file (scripts/books.ts) and a server reads it once. Without the file, a local copy of the
// site reads the database instead; the live site never does, so visitors cost Neon no transfer at all.

const tables = new Map<Tour, Promise<PlayedTable | null>>();

async function load(tour: Tour): Promise<PlayedTable | null> {
  const built = await builtBook<BuiltPlayed>("played", tour);
  if (built) return hydratePlayed(built);
  if (process.env.VERCEL_ENV === "production") return null;
  const data = await readTourModels(getDb(), tour);
  return data && hydratePlayed(buildPlayedFile(data));
}

/** A tour's matches, or null if they can't be read */
export function playedTable(tour: Tour): Promise<PlayedTable | null> {
  let table = tables.get(tour);
  if (!table) {
    table = load(tour).catch(() => null);
    tables.set(tour, table);
    table.then((t) => t ?? tables.delete(tour));
  }
  return table;
}

/** The tour a match id belongs to ("atp_…", "wta_…") */
export const tourOfId = (id: string): Tour | null => (id.startsWith("atp_") ? "atp" : id.startsWith("wta_") ? "wta" : null);
