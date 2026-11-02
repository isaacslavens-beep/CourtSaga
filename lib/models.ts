import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { buildModels, type AdvancedBooks } from "@/app/diary/models";
import type { Tour } from "@/app/diary/library";
import { builtBook } from "./built-books";
import { readTourModels } from "./tour-data";

// Advanced's models (app/diary/models.ts), from the match data. Each build writes them to a file
// (scripts/books.ts); without the file every row a tour has is read and fitted. Like the record books
// they only change when matches are imported, so they're cached for days and the page is built ahead of
// time.

/** Every model for one tour, or null if the match data can't be read. */
export async function advancedModels(tour: Tour): Promise<AdvancedBooks | null> {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const built = await builtBook<AdvancedBooks>("models", tour);
  if (built) return built;
  const data = await readTourModels(getDb(), tour);
  return data && buildModels(data);
}
