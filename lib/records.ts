import "server-only";
import { and, eq, inArray, max, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { matches, players } from "@/db/schema";
import { buildRecords, type RecordBooks, type RecordMatch } from "@/app/diary/records";
import type { Outcome, Player, Round, Surface, Tier, Tour } from "@/app/diary/library";

// The record books (app/diary/records.ts), from the match data: every match a tour has played, read once
// and turned into boards. The record only changes when matches are imported, so the boards are cached
// for days and the Statistics page is built from them ahead of time.

/** Every board for one tour, or null if the match data can't be read. */
export async function recordBooks(tour: Tour): Promise<RecordBooks | null> {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const db = getDb();
  const rows = await db
    .select({
      id: matches.id,
      tourneyId: matches.tourneyId,
      event: matches.event,
      tier: matches.tier,
      season: matches.season,
      start: sql<string>`${matches.startDate}::text`,
      date: sql<string>`${matches.playedOn}::text`,
      round: matches.round,
      num: matches.matchNum,
      surface: matches.surface,
      w: matches.winnerId,
      l: matches.loserId,
      score: matches.score,
      bestOf: matches.bestOf,
      outcome: matches.outcome,
      minutes: matches.minutes,
      wr: matches.winnerRank,
      lr: matches.loserRank,
      wa: matches.winnerAge,
      we: matches.winnerEntry,
      le: matches.loserEntry,
      wst: matches.winnerStats,
      lst: matches.loserStats,
    })
    .from(matches)
    .where(and(eq(matches.tour, tour), eq(matches.searchable, true)));
  if (!rows.length) return null;

  const played = rows.map(
    (r): RecordMatch => ({
      ...r,
      tier: r.tier as Tier,
      round: r.round as Round,
      surface: r.surface as Surface,
      outcome: r.outcome as Outcome,
      bestOf: r.bestOf === 5 ? 5 : 3,
      w: `${tour}:${r.w}`,
      l: `${tour}:${r.l}`,
    }),
  );
  const [people, [range]] = await Promise.all([
    db
      .select({ id: players.id, name: players.name, short: players.shortName, ioc: players.ioc })
      .from(players)
      .where(and(eq(players.tour, tour), inArray(players.id, [...new Set(rows.flatMap((r) => [r.w, r.l]))]))),
    db.select({ last: sql<string>`${max(matches.playedOn)}::text` }).from(matches).where(eq(matches.tour, tour)),
  ]);
  const known = Object.fromEntries(people.map((p): [string, Player] => [`${tour}:${p.id}`, { key: `${tour}:${p.id}`, name: p.name, short: p.short, ioc: p.ioc }]));
  return buildRecords({ tour, matches: played, players: known, last: range?.last ?? played[played.length - 1].date });
}
