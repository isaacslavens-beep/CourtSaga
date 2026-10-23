import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { cache } from "react";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { diaryEntries, matches, players, sagaShares, user } from "@/db/schema";
import { buildShelf, shelfCount } from "@/app/diary/books";
import { vocabulary } from "./search-words";
import {
  diaryPages,
  findRivalries,
  toFanEntry,
  toMatches,
  type MatchRow,
  type Player,
  type RecordMeeting,
  type Round,
  type StoredEntry,
  type Surface,
  type Tier,
  type Tour,
  type WatchMode,
} from "@/app/diary/library";

// Reading the match data and fans' diaries. Every function that touches a diary takes the user id from
// a checked session (see lib/auth.ts); none of them trusts an id from the browser.

const winner = alias(players, "winner");
const loser = alias(players, "loser");

// A match and both its players, in one row
const matchColumns = {
  id: matches.id,
  event: matches.event,
  season: matches.season,
  stage: matches.stage,
  round: matches.round,
  tour: matches.tour,
  tier: matches.tier,
  surface: matches.surface,
  date: sql<string>`${matches.playedOn}::text`,
  score: matches.score,
  bestOf: matches.bestOf,
  winnerId: winner.id,
  winnerName: winner.name,
  winnerShort: winner.shortName,
  winnerIoc: winner.ioc,
  loserId: loser.id,
  loserName: loser.name,
  loserShort: loser.shortName,
  loserIoc: loser.ioc,
};

function selectMatches() {
  return getDb()
    .select(matchColumns)
    .from(matches)
    .innerJoin(winner, and(eq(winner.tour, matches.tour), eq(winner.id, matches.winnerId)))
    .innerJoin(loser, and(eq(loser.tour, matches.tour), eq(loser.id, matches.loserId)));
}

type MatchColumns = Awaited<ReturnType<typeof selectMatches>>[number];

const player = (tour: string, id: string, name: string, short: string, ioc: string | null): Player => ({ key: `${tour}:${id}`, name, short, ioc });

function toRow(r: MatchColumns): MatchRow {
  return {
    id: r.id,
    event: r.event,
    season: r.season,
    stage: r.stage,
    round: r.round as Round,
    tour: r.tour as Tour,
    tier: r.tier as Tier,
    surface: r.surface as Surface,
    date: r.date,
    score: r.score,
    bestOf: r.bestOf === 5 ? 5 : 3,
    winner: player(r.tour, r.winnerId, r.winnerName, r.winnerShort, r.winnerIoc),
    loser: player(r.tour, r.loserId, r.loserName, r.loserShort, r.loserIoc),
  };
}

// Later rounds first among matches on the same day
const roundRank = sql`array_position(array['RR','R128','R64','R32','R16','QF','SF','BR','3P','F'], ${matches.round})`;

/* ---------- A fan's diary ---------- */

export type DiaryData = {
  rows: MatchRow[];
  entries: Record<string, StoredEntry>;
  order: string[]; // match ids, best first
  records?: Record<string, RecordMeeting[]>; // every meeting in each rivalry, by rivalry id
  // Changes whenever anything saved changes. Next keeps recently visited pages mounted, so a page keys its
  // log on this: coming back after a change elsewhere starts it afresh, and otherwise it's left as it was.
  version: string;
};

export async function loadDiary(userId: string, { records = false } = {}): Promise<DiaryData> {
  const rows = await getDb()
    .select({
      ...matchColumns,
      watchedOn: diaryEntries.watchedOn,
      watchedDate: diaryEntries.watchedDate,
      rating: diaryEntries.rating,
      cheering: diaryEntries.cheering,
      pickWinner: diaryEntries.pickWinner,
      tags: diaryEntries.tags,
      note: diaryEntries.note,
      classic: diaryEntries.classic,
    })
    .from(diaryEntries)
    .innerJoin(matches, eq(matches.id, diaryEntries.matchId))
    .innerJoin(winner, and(eq(winner.tour, matches.tour), eq(winner.id, matches.winnerId)))
    .innerJoin(loser, and(eq(loser.tour, matches.tour), eq(loser.id, matches.loserId)))
    .where(eq(diaryEntries.userId, userId))
    .orderBy(asc(diaryEntries.position), asc(diaryEntries.createdAt));

  const entries = Object.fromEntries(
    rows.map((r): [string, StoredEntry] => [
      r.id,
      {
        watchedOn: r.watchedOn as WatchMode,
        watchedDate: r.watchedDate,
        rating: r.rating,
        cheering: r.cheering as StoredEntry["cheering"],
        pick: r.pickWinner ? { side: r.pickWinner as "winner" | "loser" } : null,
        tags: r.tags,
        note: r.note,
        classic: r.classic,
      },
    ]),
  );
  const matchRows = rows.map(toRow);
  const order = rows.map((r) => r.id);
  return {
    rows: matchRows,
    entries,
    order,
    version: createHash("sha1").update(JSON.stringify([order, entries])).digest("base64url").slice(0, 16),
    ...(records && { records: await rivalryRecords(matchRows, entries) }),
  };
}

/**
 * The full head-to-head of each of the diary's rivalries, from the match data: every meeting that was
 * played (walkovers never were), with the ones in the diary linked to their page.
 */
async function rivalryRecords(rows: MatchRow[], entries: Record<string, StoredEntry>) {
  const named = toMatches(rows);
  const fans = Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, toFanEntry(e, named[id])]));
  const playerOf = new Map<string, Player>();
  for (const r of rows) {
    playerOf.set(named[r.id].winner, r.winner);
    playerOf.set(named[r.id].loser, r.loser);
  }
  const records: Record<string, RecordMeeting[]> = {};
  for (const { id, players: names } of findRivalries(fans, named)) {
    const [a, b] = names.map((n) => playerOf.get(n)!);
    const [tour, aId] = a.key.split(":");
    const bId = b.key.split(":")[1];
    const meetings = await selectMatches()
      .where(
        and(
          eq(matches.tour, tour),
          eq(matches.searchable, true),
          or(and(eq(matches.winnerId, aId), eq(matches.loserId, bId)), and(eq(matches.winnerId, bId), eq(matches.loserId, aId))),
        ),
      )
      .orderBy(asc(matches.playedOn), asc(roundRank));
    records[id] = meetings.map((m) => ({
      date: m.date,
      event: m.event,
      round: m.round as Round,
      stage: m.stage,
      tour: m.tour as Tour,
      surface: m.surface as Surface,
      winner: m.winnerId === aId ? names[0] : names[1],
      score: m.score,
      ...(entries[m.id] ? { logId: m.id } : { matchId: m.id }),
    }));
  }
  return records;
}

/** What a saga's cover says about it: how many matches, the seasons they span, and its rivalries */
// The diary as the saga's books read it: matches with players' display names, and the fan's entries
function sagaLog({ rows, entries, order, records }: DiaryData) {
  const named = toMatches(rows);
  const fans = Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, toFanEntry(e, named[id])]));
  return { matches: named, entries: fans, order, records: records ?? {} };
}

/** The books on a saga's shelf, each with how many matches it holds: for the card its shared link shows */
export function shelfOf(diary: DiaryData) {
  const log = sagaLog(diary);
  return buildShelf(log).map((b) => ({ ...b, count: shelfCount(b.id, log) }));
}

export function coverLines(diary: DiaryData) {
  const { rows } = diary;
  if (!rows.length) return [];
  const seasons = rows.map((r) => r.season);
  const [first, last] = [Math.min(...seasons), Math.max(...seasons)];
  const rivalries = buildShelf(sagaLog(diary)).filter((b) => b.kind === "rivalry").length;
  return [
    rows.length === 1 ? "1 match" : `${rows.length} matches`,
    first === last ? `played in ${first}` : `played ${first} to ${last}`,
    ...(rivalries ? [rivalries === 1 ? "1 rivalry" : `${rivalries} rivalries`] : []),
  ];
}

/** The diary's newest page: the match open in the log when no other is asked for */
export function latestPage({ rows, entries }: DiaryData) {
  const named = toMatches(rows);
  const fans = Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, toFanEntry(e, named[id])]));
  const pages = diaryPages(fans, named);
  return [...pages.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/* ---------- Finding a match ---------- */

export const SEARCH_PAGE_SIZE = 20;

export type SearchResults = { results: MatchRow[]; total: number; page: number; pages: number; size: number; query: string; corrected: string | null };

// Words that only join a query together: "alcaraz vs sinner", "the final"
const fillers = new Set(["vs", "v", "versus", "against", "and", "the", "at", "in", "match", "matches"]);

/** A search's words: lower case, accents left for unaccent(), "'08" read as 2008. */
function wordsOf(query: string) {
  return query
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/(^|\s)'(\d{2})\b/g, "$120$2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !fillers.has(w));
}

async function runSearch(words: string[], page: number) {
  // Every word must start a word somewhere in the match's search text: its event, year, round, players
  const tsquery = words.map((w) => `${w}:*`).join(" & ");
  const where: SQL = and(eq(matches.searchable, true), sql`${matches.search} @@ to_tsquery('simple', unaccent(${tsquery}))`)!;
  const rows = await getDb()
    .select({ ...matchColumns, total: sql<number>`count(*) over ()`.mapWith(Number) })
    .from(matches)
    .innerJoin(winner, and(eq(winner.tour, matches.tour), eq(winner.id, matches.winnerId)))
    .innerJoin(loser, and(eq(loser.tour, matches.tour), eq(loser.id, matches.loserId)))
    .where(where)
    .orderBy(desc(matches.playedOn), desc(roundRank), asc(matches.tour), asc(matches.id))
    .limit(SEARCH_PAGE_SIZE)
    .offset((page - 1) * SEARCH_PAGE_SIZE);
  return { results: rows.map(toRow), total: rows[0]?.total ?? 0 };
}

/**
 * Search by players, tournament, year and round, in any order: "alcaraz sinner", "wimbledon 2008 final",
 * "sabalenka ao 2023". Newest first. A search that finds nothing tries again with misspelt names
 * corrected to the closest player (by trigram similarity) or event.
 */
export async function searchMatches(query: string, page = 1): Promise<SearchResults> {
  const words = wordsOf(query).slice(0, 8);
  const at = Math.max(1, Math.floor(page));
  const empty = { results: [], total: 0, page: 1, pages: 0, size: SEARCH_PAGE_SIZE, query, corrected: null };
  if (!words.length) return empty;

  let found = await runSearch(words, at);
  let corrected: string | null = null;
  if (!found.total && at === 1) {
    const fixed = await correct(words);
    if (fixed.join(" ") !== words.join(" ")) {
      found = await runSearch(fixed, at);
      if (found.total) corrected = fixed.join(" ");
    }
  }
  return { ...found, page: at, pages: Math.ceil(found.total / SEARCH_PAGE_SIZE), size: SEARCH_PAGE_SIZE, query, corrected };
}

const editDistance = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
};

/** Each word that starts no player's name or event, swapped for the closest one that does. */
async function correct(words: string[]) {
  const db = getDb();
  const events = await eventWords();
  return Promise.all(
    words.map(async (w) => {
      const fold = w.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      if (/^\d+$/.test(w) || w.length < 3 || vocabulary.has(fold) || events.some((e) => e.startsWith(fold))) return w;
      const [best] = await db
        .select({ name: players.searchName, sim: sql<number>`word_similarity(${fold}, ${players.searchName})`.mapWith(Number) })
        .from(players)
        .where(sql`${fold} <% ${players.searchName}`)
        .orderBy(sql`word_similarity(${fold}, ${players.searchName}) desc`, desc(players.matchCount))
        .limit(1);
      const nameWords = best?.name.split(/[\s-]+/) ?? [];
      if (nameWords.some((n) => n.startsWith(fold))) return w;
      const candidates = [...nameWords, ...events].map((c) => ({ c, d: editDistance(fold, c) }));
      const closest = candidates.sort((a, b) => a.d - b.d)[0];
      return closest && closest.d <= Math.max(1, Math.floor(fold.length / 3)) ? closest.c : w;
    }),
  );
}

let eventWordCache: { at: number; words: string[] } | null = null;

/** Every word in every event's name, for correcting misspelt tournaments. Refreshed hourly. */
async function eventWords() {
  if (eventWordCache && Date.now() - eventWordCache.at < 60 * 60 * 1000) return eventWordCache.words;
  const rows = await getDb().selectDistinct({ event: matches.event }).from(matches);
  const words = [...new Set(rows.flatMap((r) => r.event.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/)))].filter((w) => w.length > 2);
  eventWordCache = { at: Date.now(), words };
  return words;
}

/** The first and last seasons in the match data, for saying what search covers */
export async function seasonRange(): Promise<[number, number] | null> {
  "use cache";
  cacheLife("hours");
  const [row] = await getDb()
    .select({ first: sql<number>`min(${matches.season})`.mapWith(Number), last: sql<number>`max(${matches.season})`.mapWith(Number) })
    .from(matches);
  return row?.first ? [row.first, row.last] : null;
}

/** One match from the data, with its players, if it can be logged (walkovers never happened). */
export async function findMatch(id: string) {
  const [row] = await selectMatches().where(and(eq(matches.id, id), eq(matches.searchable, true))).limit(1);
  return row ? toRow(row) : null;
}

/** Several matches from the data, in the order asked for */
export async function findMatches(ids: string[]) {
  if (!ids.length) return [];
  const rows = await selectMatches().where(and(inArray(matches.id, ids), eq(matches.searchable, true)));
  const byId = new Map(rows.map((r) => [r.id, toRow(r)]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** How many pages a diary has */
export async function pageCount(userId: string) {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId));
  return row?.n ?? 0;
}

/* ---------- Sharing ---------- */

export async function shareSlugOf(userId: string) {
  const [row] = await getDb().select({ slug: sagaShares.slug }).from(sagaShares).where(eq(sagaShares.userId, userId));
  return row?.slug ?? null;
}

/** Whose saga a share link opens, or null if the link is off or never existed. Looked up once a request. */
export const sharedSagaOwner = cache(async (slug: string) => {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(slug)) return null;
  const [row] = await getDb()
    .select({ id: user.id, name: user.name })
    .from(sagaShares)
    .innerJoin(user, eq(user.id, sagaShares.userId))
    .where(eq(sagaShares.slug, slug));
  return row ?? null;
});
