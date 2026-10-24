import "server-only";
import { and, eq, inArray, max, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { matches, players } from "@/db/schema";
import { buildModels, type AdvancedBooks, type ModelMatch } from "@/app/diary/models";
import type { Outcome, Player, Round, Surface, Tier, Tour } from "@/app/diary/library";

// Advanced's models (app/diary/models.ts), from the match data: every row a tour has, read once and
// fitted. Like the record books they only change when matches are imported, so they're cached for days
// and the page is built ahead of time.

/** Every model for one tour, or null if the match data can't be read. */
export async function advancedModels(tour: Tour): Promise<AdvancedBooks | null> {
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
      round: matches.round,
      num: matches.matchNum,
      surface: matches.surface,
      w: matches.winnerId,
      l: matches.loserId,
      score: matches.score,
      bestOf: matches.bestOf,
      outcome: matches.outcome,
      played: matches.searchable,
      minutes: matches.minutes,
      wr: matches.winnerRank,
      lr: matches.loserRank,
      wa: matches.winnerAge,
      la: matches.loserAge,
      wst: matches.winnerStats,
      lst: matches.loserStats,
    })
    .from(matches)
    .where(eq(matches.tour, tour));
  if (!rows.length) return null;

  const all = rows.map(
    (r): ModelMatch => ({
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
    db.select({ last: sql<string>`${max(matches.playedOn)}::text` }).from(matches).where(and(eq(matches.tour, tour), eq(matches.searchable, true))),
  ]);
  const known = Object.fromEntries(people.map((p): [string, Player] => [`${tour}:${p.id}`, { key: `${tour}:${p.id}`, name: p.name, short: p.short, ioc: p.ioc }]));
  return buildModels({ tour, matches: all, players: known, last: range?.last ?? all[all.length - 1].start });
}
