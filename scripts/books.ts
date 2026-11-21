// Writes each tour's record books and models (Statistics) and its matches (Matches) to assets/books/, so
// the site reads them from files instead of working them out from 130,000 matches in the database.
//
//   npm run books
//
// Vercel runs it before every build (the `vercel-build` script). Neon's free plan allows 5 GB of transfer
// a month and all the matches come to about 60 MB, so they're read once per import, not once per build:
// a tiny query says whether the data has changed, and if it hasn't the matches come from Vercel's build
// cache (.next/cache). Without a database or a kept copy it writes nothing, and the site works everything
// out itself (lib/records.ts, lib/models.ts; Matches only on a local copy, lib/match-index.ts).

import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { count, max } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";
import { buildMatchFile } from "../app/diary/match-index";
import { buildModels } from "../app/diary/models";
import { buildPlayedFile } from "../app/diary/played";
import { buildRecords } from "../app/diary/records";
import { readTour, readTourModels } from "../lib/tour-data";
import type { Db } from "../db";

loadEnvConfig(process.cwd());

const tours = ["atp", "wta"] as const;
const keptFolder = join(process.cwd(), ".next", "cache", "courtsaga-matches");
const keptStamp = join(keptFolder, "stamp");
const keptFile = join(keptFolder, "matches.json");

type Matches = Record<(typeof tours)[number], { tour: Awaited<ReturnType<typeof readTour>>; models: Awaited<ReturnType<typeof readTourModels>> }>;

/** Changes when an import touches the matches, or when how they're read changes */
async function dataStamp(db: Db) {
  const [row] = await db.select({ n: count(), at: max(schema.matches.importedAt) }).from(schema.matches);
  const reader = await readFile(join(process.cwd(), "lib", "tour-data.ts"));
  return `${row.n} ${row.at?.toISOString()} ${createHash("sha256").update(reader).digest("hex")}`;
}

async function readMatches(db: Db) {
  const all = {} as Matches;
  for (const tour of tours) all[tour] = { tour: await readTour(db, tour), models: await readTourModels(db, tour) };
  return all;
}

const kept = () => readFile(keptFile, "utf8").then((text) => JSON.parse(text) as Matches).catch(() => null);

async function matchData(url: string | undefined) {
  if (!url) return { matches: await kept(), from: "the last build, with no DATABASE_URL set" };
  const pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 15000 });
  try {
    const db = drizzle(pool, { schema });
    const stamp = await dataStamp(db);
    const same = (await readFile(keptStamp, "utf8").catch(() => null)) === stamp;
    const held = same ? await kept() : null;
    if (held) return { matches: held, from: "the last build, unchanged" };
    const matches = await readMatches(db);
    await mkdir(keptFolder, { recursive: true });
    await writeFile(keptFile, JSON.stringify(matches));
    await writeFile(keptStamp, stamp);
    return { matches, from: "the database" };
  } catch (error) {
    console.log("books: the database can't be read,", error instanceof Error ? error.message : error);
    return { matches: await kept(), from: "the last build" };
  } finally {
    await pool.end();
  }
}

async function main() {
  const { matches, from } = await matchData(process.env.DATABASE_URL);
  if (!matches) {
    // The live site never reads all the matches itself, so a production build without them would replace a
    // working site with a broken one: stop, and the last deploy stays up
    if (process.env.VERCEL_ENV === "production") {
      console.error("books: no match data from the database or the build cache; stopping so the live site stays as it is.");
      process.exit(1);
    }
    console.log("books: no match data, so the site will work everything out itself.");
    return;
  }
  console.log(`books: matches from ${from}.`);
  const folder = join(process.cwd(), "assets", "books");
  await mkdir(folder, { recursive: true });
  for (const name of tours) {
    const { tour, models } = matches[name];
    if (tour) await writeFile(join(folder, `records-${name}.json`), JSON.stringify(buildRecords(tour)));
    if (models) {
      await writeFile(join(folder, `models-${name}.json`), JSON.stringify(buildModels(models)));
      await writeFile(join(folder, `played-${name}.json`), JSON.stringify(buildPlayedFile(models)));
      const file = buildMatchFile(models);
      await writeFile(join(folder, `matches-${name}.json`), JSON.stringify(file));
      console.log(`books: ${file.rows.length} ${name} matches; impossible serve stats dropped from ${file.dropped.stats}, impossible lengths from ${file.dropped.minutes}.`);
    }
  }
}

main().catch((error) => {
  // The books are a saving, not a must: the build goes on without them
  console.log("books: skipped,", error instanceof Error ? error.message : error);
});
