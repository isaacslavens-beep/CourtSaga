import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { buildRecords, type RecordBooks } from "@/app/diary/records";
import type { Tour } from "@/app/diary/library";
import { readTour } from "./tour-data";

// The record books (app/diary/records.ts), from the match data: every match a tour has played, read once
// and turned into boards. The record only changes when matches are imported, so the boards are cached
// for days and the Statistics page is built from them ahead of time. The quiz (lib/quiz.ts) reads the
// same matches (lib/tour-data.ts).

/** Every board for one tour, or null if the match data can't be read. */
export async function recordBooks(tour: Tour): Promise<RecordBooks | null> {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const data = await readTour(getDb(), tour);
  return data && buildRecords(data);
}
