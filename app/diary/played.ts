import type { ModelMatch } from "./models";
import type { Played, PlayerInfo } from "./story";
import type { MatchRow, Outcome, Round, Surface, Tier, Tour } from "./library";
import { bigEvents, bigRounds } from "./library";
import { eventWords, roundWords, slamRoundWords, tourWords } from "../../lib/search-words";

/* Every match a tour has played, as a file each build writes (scripts/books.ts), so match pages, Tournaments
   and search read nothing from the database. A row is an array in `columns` order, which keeps the file
   about half the size of objects. */

const columns = ["id", "tourneyId", "event", "season", "date", "round", "tier", "surface", "stage", "w", "l", "score", "bestOf", "outcome", "minutes", "ws", "ls", "we", "le", "wr", "lr", "wa", "la", "wst", "lst"] as const;

type Cell = string | number | boolean | number[] | null;

export type BuiltPlayed = { tour: Tour; from: number; last: string; players: Record<string, PlayerInfo>; rows: Cell[][] };

/** The file for a tour, from the rows the models read (walkovers left out: they never happened) */
export function buildPlayedFile(data: { tour: Tour; matches: ModelMatch[]; players: Record<string, PlayerInfo>; last: string }): BuiltPlayed {
  const prefix = `${data.tour}:`;
  const rows = data.matches
    .filter((m) => m.played)
    .map((m): Cell[] => {
      const p: Played = {
        id: m.id,
        tour: data.tour,
        tourneyId: m.tourneyId,
        event: m.event,
        season: m.season,
        date: m.date ?? m.start,
        round: m.round,
        tier: m.tier,
        surface: m.surface,
        stage: m.stage ?? null,
        w: m.w.slice(prefix.length),
        l: m.l.slice(prefix.length),
        score: m.score,
        bestOf: m.bestOf,
        outcome: m.outcome,
        minutes: m.minutes,
        ws: m.ws ?? null,
        ls: m.ls ?? null,
        we: m.we ?? null,
        le: m.le ?? null,
        wr: m.wr,
        lr: m.lr,
        wa: m.wa === null ? null : Math.round(m.wa * 100) / 100,
        la: m.la === null ? null : Math.round(m.la * 100) / 100,
        wst: m.wst,
        lst: m.lst,
      };
      return columns.map((c) => p[c] as Cell);
    });
  const used = new Set(rows.flatMap((r) => [`${prefix}${r[9]}`, `${prefix}${r[10]}`]));
  const players = Object.fromEntries(Object.entries(data.players).filter(([k]) => used.has(k)));
  const from = rows.reduce((a, r) => Math.min(a, r[3] as number), Infinity);
  return { tour: data.tour, from: Number.isFinite(from) ? from : 2003, last: data.last, players, rows };
}

/* ---------- Reading it ---------- */

// Later rounds first among matches on the same day
const roundOrder: Round[] = ["RR", "R128", "R64", "R32", "R16", "QF", "SF", "BR", "3P", "F"];
const roundRank = (r: Round) => roundOrder.indexOf(r);
const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const wordsIn = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export type PlayedTable = {
  tour: Tour;
  from: number;
  last: string;
  players: Record<string, PlayerInfo>;
  all: Played[]; // newest first, later rounds first on a day
  byId: Map<string, Played>;
  byPlayer: Map<string, Played[]>;
  byTourney: Map<string, Played[]>;
  byEvent: Map<string, Played[]>;
  byTierRound: Map<string, Played[]>;
  words: string[][] | null; // each match's search words, made the first time anyone searches
};

const push = <T,>(map: Map<string, T[]>, key: string, v: T) => {
  const list = map.get(key);
  if (list) list.push(v);
  else map.set(key, [v]);
};

export function hydratePlayed(file: BuiltPlayed): PlayedTable {
  const prefix = `${file.tour}:`;
  const all = file.rows.map((r) => {
    const p = Object.fromEntries(columns.map((c, i) => [c, r[i]])) as unknown as Played;
    p.tour = file.tour;
    p.w = prefix + p.w;
    p.l = prefix + p.l;
    p.round = p.round as Round;
    p.tier = p.tier as Tier;
    p.surface = p.surface as Surface;
    p.outcome = p.outcome as Outcome;
    return p;
  });
  all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : roundRank(b.round) - roundRank(a.round) || (a.id < b.id ? -1 : 1)));
  const t: PlayedTable = { tour: file.tour, from: file.from, last: file.last, players: file.players, all, byId: new Map(), byPlayer: new Map(), byTourney: new Map(), byEvent: new Map(), byTierRound: new Map(), words: null };
  for (const m of all) {
    t.byId.set(m.id, m);
    push(t.byPlayer, m.w, m);
    push(t.byPlayer, m.l, m);
    push(t.byTourney, m.tourneyId, m);
    push(t.byEvent, m.event, m);
    push(t.byTierRound, `${m.tier}|${m.round}`, m);
  }
  return t;
}

const unknown = (key: string): PlayerInfo => ({ key, name: "Unknown", short: "Unknown", ioc: null, hand: null, height: null });

/** A match as the site's lists show it */
export function toMatchRow(t: PlayedTable, m: Played): MatchRow {
  const person = (key: string) => {
    const p = t.players[key] ?? unknown(key);
    return { key, name: p.name, short: p.short, ioc: p.ioc };
  };
  return {
    id: m.id,
    event: m.event,
    season: m.season,
    stage: m.stage,
    round: m.round,
    tour: m.tour,
    tier: m.tier,
    surface: m.surface,
    date: m.date,
    score: m.score,
    bestOf: m.bestOf,
    winner: person(m.w),
    loser: person(m.l),
  };
}

/** Chronological, oldest first: how the story reads a player's career, a draw or an event */
const oldestFirst = (list: Played[] | undefined) => (list ? [...list].reverse() : []);

/** What the story around one match is told from */
export function storyInputs(t: PlayedTable, id: string) {
  const focus = t.byId.get(id);
  if (!focus) return null;
  const team = focus.tier === "team";
  const careerA = oldestFirst(t.byPlayer.get(focus.w));
  const careerB = oldestFirst(t.byPlayer.get(focus.l));
  const draw = team ? [] : oldestFirst(t.byTourney.get(focus.tourneyId));
  const event = team ? [] : oldestFirst(t.byEvent.get(focus.event));
  const peers = team ? [] : oldestFirst(t.byTierRound.get(`${focus.tier}|${focus.round}`));
  const players: Record<string, PlayerInfo> = {};
  for (const m of [...careerA, ...careerB, ...draw, ...event, ...peers]) {
    players[m.w] ??= t.players[m.w] ?? unknown(m.w);
    players[m.l] ??= t.players[m.l] ?? unknown(m.l);
  }
  return { focus, players, careers: { [focus.w]: careerA, [focus.l]: careerB }, draw, event, peers, from: t.from, last: t.last };
}

/** A Slam semifinal or final, or one at the event asked for, at random; null if the tour has none */
export function randomPick(t: PlayedTable, event?: string) {
  const big = bigEvents.find((b) => b.key === event);
  if (big && !big.tours.includes(t.tour)) return null;
  const pool = t.all.filter((m) =>
    big ? bigRounds.includes(m.round) && big.events.includes(m.event) : (m.round === "SF" || m.round === "F") && (event ? m.event === event : m.tier === "slam"),
  );
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
}

/** Every Slam final, and the finals, semifinals and bronze medal matches of the big events, newest first */
export function bigFinalsOf(t: PlayedTable) {
  return t.all.filter(
    (m) => (m.tier === "slam" && m.round === "F") || (bigRounds.includes(m.round) && bigEvents.some((b) => b.tours.includes(t.tour) && b.events.includes(m.event))),
  );
}

/** The words a match is found by: its event (and other names for it), year, round, tour and players */
function searchWordsOf(t: PlayedTable, m: Played) {
  const p = (k: string) => t.players[k]?.name ?? "";
  const text = [m.event, eventWords[m.event] ?? "", m.stage ?? "", String(m.season), roundWords[m.round], m.tier === "slam" ? (slamRoundWords[m.round] ?? "") : "", tourWords[m.tour], p(m.w), p(m.l)].join(" ");
  return [...new Set(wordsIn(text))];
}

/** Every match where each word starts a word of its search text, newest first */
export function findByWords(t: PlayedTable, words: string[]) {
  t.words ??= t.all.map((m) => searchWordsOf(t, m));
  const want = words.map(fold);
  const found: Played[] = [];
  for (let i = 0; i < t.all.length; i++) {
    const have = t.words[i];
    if (want.every((w) => have.some((h) => h.startsWith(w)))) found.push(t.all[i]);
  }
  return found;
}

/** Every distinct word a tour's players and events are called by, for correcting a misspelt search */
export function namesOf(t: PlayedTable) {
  const words = new Set<string>();
  for (const p of Object.values(t.players)) for (const w of wordsIn(p.name)) if (w.length > 2) words.add(w);
  for (const e of t.byEvent.keys()) for (const w of wordsIn(e)) if (w.length > 2) words.add(w);
  return words;
}

export const newestFirst = (a: Played, b: Played) => (a.date < b.date ? 1 : a.date > b.date ? -1 : roundRank(b.round) - roundRank(a.round) || (a.tour < b.tour ? -1 : a.tour > b.tour ? 1 : a.id < b.id ? -1 : 1));
