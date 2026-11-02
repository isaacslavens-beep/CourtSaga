import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Tour } from "@/app/diary/library";

// What each build worked out ahead of time (scripts/books.ts). Reading these instead of the database is
// what keeps every tour's 65,000 matches from crossing the network each time a page is rebuilt.

/** One tour's built file, or null if this build has none */
export function builtBook<T>(kind: "records" | "models" | "quiz", tour: Tour): Promise<T | null> {
  return readFile(join(process.cwd(), "assets", "books", `${kind}-${tour}.json`), "utf8")
    .then((text) => JSON.parse(text) as T)
    .catch(() => null);
}
