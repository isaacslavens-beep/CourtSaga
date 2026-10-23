import "server-only";
import { and, eq, inArray, max, or, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { matches, players } from "@/db/schema";
import { tellStory, type Played, type PlayerInfo, type Story } from "@/app/diary/story";
import type { Outcome, Round, Surface, Tier, Tour } from "@/app/diary/library";

// The story around a match (app/diary/story.ts), from the match data. The record only changes when matches
// are imported, so each piece is cached for days: a player's matches, a tournament's draw, an event's
// history and every match in a tier's round, and the story built from them.

const columns = {
  id: matches.id,
  tour: matches.tour,
  tourneyId: matches.tourneyId,
  event: matches.event,
  season: matches.season,
  date: sql<string>`${matches.playedOn}::text`,
  round: matches.round,
  tier: matches.tier,
  surface: matches.surface,
  stage: matches.stage,
  w: matches.winnerId,
  l: matches.loserId,
  score: matches.score,
  bestOf: matches.bestOf,
  outcome: matches.outcome,
  minutes: matches.minutes,
  ws: matches.winnerSeed,
  ls: matches.loserSeed,
  we: matches.winnerEntry,
  le: matches.loserEntry,
  wr: matches.winnerRank,
  lr: matches.loserRank,
  wa: matches.winnerAge,
  la: matches.loserAge,
  wst: matches.winnerStats,
  lst: matches.loserStats,
};

type Row = Awaited<ReturnType<typeof select>>[number];

function select(where: SQL | undefined) {
  return getDb().select(columns).from(matches).where(where);
}

// Players become keys ("atp:D643"), as everywhere else on the site
const toPlayed = (r: Row): Played => ({
  ...r,
  tour: r.tour as Tour,
  round: r.round as Round,
  tier: r.tier as Tier,
  surface: r.surface as Surface,
  outcome: r.outcome as Outcome,
  bestOf: r.bestOf === 5 ? 5 : 3,
  w: `${r.tour}:${r.w}`,
  l: `${r.tour}:${r.l}`,
  wa: r.wa === null ? null : Math.round(r.wa * 100) / 100,
  la: r.la === null ? null : Math.round(r.la * 100) / 100,
});

async function careerOf(tour: string, id: string) {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const rows = await select(and(eq(matches.tour, tour), or(eq(matches.winnerId, id), eq(matches.loserId, id))));
  return rows.map(toPlayed);
}

async function drawOf(tour: string, tourneyId: string) {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  return (await select(and(eq(matches.tour, tour), eq(matches.tourneyId, tourneyId)))).map(toPlayed);
}

async function eventOf(tour: string, event: string) {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  return (await select(and(eq(matches.tour, tour), eq(matches.event, event)))).map(toPlayed);
}

async function peersOf(tour: string, tier: string, round: string) {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  return (await select(and(eq(matches.tour, tour), eq(matches.tier, tier), eq(matches.round, round)))).map(toPlayed);
}

async function dataRange() {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const [row] = await getDb()
    .select({ first: sql<number>`min(${matches.season})`.mapWith(Number), last: sql<string>`${max(matches.playedOn)}::text` })
    .from(matches);
  return { from: row?.first ?? 2003, last: row?.last ?? new Date().toISOString().slice(0, 10) };
}

async function playersIn(tour: string, ids: string[]) {
  const rows = ids.length
    ? await getDb()
        .select({ id: players.id, name: players.name, short: players.shortName, ioc: players.ioc, hand: players.hand, height: players.height })
        .from(players)
        .where(and(eq(players.tour, tour), inArray(players.id, ids)))
    : [];
  return Object.fromEntries(rows.map((p): [string, PlayerInfo] => [`${tour}:${p.id}`, { key: `${tour}:${p.id}`, name: p.name, short: p.short, ioc: p.ioc, hand: p.hand, height: p.height }]));
}

/** The story around one match, or null if there's no such match or it was never played (a walkover). */
export async function matchStory(id: string): Promise<Story | null> {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const [row] = await select(and(eq(matches.id, id), eq(matches.searchable, true)));
  if (!row) return null;
  const focus = toPlayed(row);
  const team = focus.tier === "team";
  const [careerA, careerB, draw, event, peers, range] = await Promise.all([
    careerOf(row.tour, row.w),
    careerOf(row.tour, row.l),
    team ? Promise.resolve([]) : drawOf(row.tour, row.tourneyId),
    team ? Promise.resolve([]) : eventOf(row.tour, row.event),
    team ? Promise.resolve([]) : peersOf(row.tour, row.tier, row.round),
    dataRange(),
  ]);
  // Everyone in the careers and the draw, plus the peers' winners and losers the story may name
  const keys = new Set<string>();
  for (const m of [...careerA, ...careerB, ...draw, ...event, ...peers]) keys.add(m.w).add(m.l);
  const ids = [...keys].map((k) => k.slice(row.tour.length + 1));
  const known = await playersIn(row.tour, ids);
  return tellStory({ focus, players: known, careers: { [focus.w]: careerA, [focus.l]: careerB }, draw, event, peers, ...range });
}

/** Matches from the data to start exploring from: big finals played in this week of other years. */
export async function thisWeekInPast(today: string) {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const day = today.slice(5, 10);
  const rows = await getDb()
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.round, "F"),
        eq(matches.searchable, true),
        inArray(matches.tier, ["slam", "1000", "finals", "olympics"]),
        sql`abs(extract(doy from ${matches.playedOn}) - extract(doy from ${`2001-${day}`}::date)) <= 7`,
        sql`extract(year from ${matches.playedOn}) < extract(year from ${today}::date)`,
      ),
    )
    .orderBy(sql`${matches.playedOn} desc`)
    .limit(12);
  return rows.map((r) => r.id);
}

/** A match worth exploring, picked at random: a late round at a big event between two well-ranked players */
export async function randomStoryId() {
  const [row] = await getDb()
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.searchable, true),
        inArray(matches.tier, ["slam", "1000", "finals", "olympics"]),
        inArray(matches.round, ["QF", "SF", "F"]),
        sql`${matches.winnerRank} <= 30 and ${matches.loserRank} <= 30`,
      ),
    )
    .orderBy(sql`random()`)
    .limit(1);
  return row?.id ?? null;
}
