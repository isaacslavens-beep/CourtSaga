import { and, eq, inArray, max, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { matches, players } from "@/db/schema";
import type { RecordMatch } from "@/app/diary/records";
import type { Outcome, Round, Surface, Tier, Tour } from "@/app/diary/library";
import type { QuizPlayer } from "@/app/diary/quiz";

// Every match a tour has played, read the one way the record books (lib/records.ts) and the quiz's
// questions (lib/quiz.ts, scripts/quiz-bank.ts) need it. Takes the database rather than opening it, so a
// build script can use it as well as the site.

/** Every match a tour has played, as the record books and the quiz read them, with everyone in them */
export async function readTour(db: Db, tour: Tour): Promise<{ tour: Tour; matches: RecordMatch[]; players: Record<string, QuizPlayer>; last: string } | null> {
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
      .select({ id: players.id, name: players.name, short: players.shortName, ioc: players.ioc, hand: players.hand, height: players.height })
      .from(players)
      .where(and(eq(players.tour, tour), inArray(players.id, [...new Set(rows.flatMap((r) => [r.w, r.l]))]))),
    db.select({ last: sql<string>`${max(matches.playedOn)}::text` }).from(matches).where(eq(matches.tour, tour)),
  ]);
  const known = Object.fromEntries(people.map((p): [string, QuizPlayer] => [`${tour}:${p.id}`, { key: `${tour}:${p.id}`, name: p.name, short: p.short, ioc: p.ioc, hand: p.hand, height: p.height }]));
  return { tour, matches: played, players: known, last: range?.last ?? played[played.length - 1].date };
}
