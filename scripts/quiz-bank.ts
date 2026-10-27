// Writes the quiz's questions for each tour to assets/quiz/<tour>.json, from the match data in
// DATABASE_URL, so the site reads them from a file instead of working them out from 130,000 matches
// the first time a quiz is asked for on a new server.
//
//   npm run quiz:bank
//
// Vercel runs it before every build (the `vercel-build` script). Without a database it writes nothing,
// and the site works the questions out itself (lib/quiz.ts).

import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";
import { buildQuestions } from "../app/diary/quiz";
import { buildRecords } from "../app/diary/records";
import { readTour } from "../lib/tour-data";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("quiz-bank: no DATABASE_URL set, so the site will work the questions out itself.");
    return;
  }
  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    const db = drizzle(pool, { schema });
    const folder = join(process.cwd(), "assets", "quiz");
    await mkdir(folder, { recursive: true });
    for (const tour of ["atp", "wta"] as const) {
      const data = await readTour(db, tour);
      if (!data) continue;
      const bank = buildQuestions({ ...data, books: buildRecords(data) });
      await writeFile(join(folder, `${tour}.json`), JSON.stringify(bank));
      console.log(`quiz-bank: ${bank.questions.length} ${tour} questions, ${bank.from}–${bank.to}.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  // A quiz bank is a speed-up, not a must: the build goes on without one
  console.log("quiz-bank: skipped,", error instanceof Error ? error.message : error);
});
