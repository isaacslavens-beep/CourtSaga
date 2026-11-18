// The engine behind Matches (matches.ts has the catalogue it works from). Two halves:
//
// 1. buildMatchFile turns a tour's rows into a compact file, at build time (scripts/books.ts). It also checks
//    the data: serve stats whose numbers can't be true (more aces than first serves in, a service game
//    lasting 58 points, stats copied in eight times over) and match lengths that can't be (a 6-4 6-2 that
//    "lasted" 41 hours) are dropped, because sorting by an extreme always finds the typos first.
// 2. hydrate reads that file into one typed column per number, and runSearch, suggest and extremesOf answer
//    the page from those columns in a single pass over every match.

import { displayNames, initialsOf, parseScore, type Outcome, type Round, type SetScore, type Surface, type Tier, type Tour } from "./library";
import type { ModelMatch } from "./models";
import {
  PAGE_SIZE,
  nationNames,
  oddities,
  statById,
  stats,
  type DramaPart,
  type Extremes,
  type FacetId,
  type Hist,
  type MatchesResult,
  type Neighbour,
  type ResultCell,
  type ResultPlayer,
  type ResultRow,
  type Search,
  type Side,
  type Standing,
  type StatDef,
  type Suggestion,
} from "./matches";

/* ---------- The file each build writes ---------- */

const TIERS: Tier[] = ["slam", "1000", "500", "250", "finals", "olympics", "team", "other"];
const SURFACES: Surface[] = ["hard", "clay", "grass", "carpet", "unknown"];
const ROUNDS: Round[] = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "RR", "BR", "3P"];
const OUTCOMES: Outcome[] = ["completed", "retired", "defaulted", "abandoned"];
// Later rounds sort after earlier ones played the same day
const ROUND_ORDER: Record<Round, number> = { RR: 0, R128: 1, R64: 2, R32: 3, R16: 4, QF: 5, SF: 6, BR: 7, "3P": 7, F: 8 };

type BuiltPlayer = [id: string, name: string, short: string, ioc: string | null, hand: string | null, height: number | null];
type BuiltRow = [
  id: string,
  event: number,
  tier: number,
  surface: number,
  indoor: 0 | 1 | null,
  round: number,
  bestOf: 3 | 5,
  season: number,
  date: string,
  outcome: number,
  w: number,
  l: number,
  score: string,
  minutes: number | null,
  wr: number | null,
  lr: number | null,
  ws: number | null,
  ls: number | null,
  we: string | null,
  le: string | null,
  wa: number | null,
  la: number | null,
  wst: number[] | null,
  lst: number[] | null,
];

export type BuiltMatches = { v: 1; tour: Tour; from: number; last: string; players: BuiltPlayer[]; events: string[]; rows: BuiltRow[]; dropped: { stats: number; minutes: number } };

type MatchPlayer = { key: string; name: string; short: string; ioc: string | null; hand?: string | null; height?: number | null };

// The serve stats, as the data orders them: aces, double faults, points served, first serves in, first-serve
// points won, second-serve points won, service games, break points saved, break points faced
const S = { ace: 0, df: 1, svpt: 2, in1: 3, won1: 4, won2: 5, svGms: 6, bpSaved: 7, bpFaced: 8 } as const;

const gamesOf = (sets: SetScore[]) => sets.reduce((g, s) => g + (s.super ? 1 : s.w + s.l), 0);
const tiebreakSet = (s: SetScore) => s.super || s.tb !== null || (Math.max(s.w, s.l) === 7 && Math.min(s.w, s.l) === 6);

/** Whether a match's serve stats can be true: each side adds up, and the service games fit the score */
function statsHold(wst: number[] | null, lst: number[] | null, sets: SetScore[], completed: boolean) {
  if (!wst || !lst || wst.length < 9 || lst.length < 9) return false;
  for (const s of [wst, lst]) {
    if (s.some((x) => x === null || x < 0 || !Number.isFinite(x))) return false;
    const second = s[S.svpt] - s[S.in1];
    if (s[S.svpt] <= 0 || s[S.svGms] <= 0) return false;
    if (s[S.in1] > s[S.svpt] || s[S.won1] > s[S.in1] || s[S.won2] > second || s[S.ace] > s[S.in1] || s[S.df] > second) return false;
    if (s[S.bpSaved] > s[S.bpFaced]) return false;
    // A service game takes four points at least; past a dozen on average, the numbers are wrong
    const perGame = s[S.svpt] / s[S.svGms];
    if (perGame < 3.2 || perGame > 12) return false;
  }
  if (completed) {
    const played = gamesOf(sets) - sets.filter(tiebreakSet).length;
    if (Math.abs(wst[S.svGms] + lst[S.svGms] - played) > 3) return false;
    // Each player's games are their holds, their breaks and their tiebreaks: stats that don't add up to the
    // score (most often the two players' stats swapped) are someone else's numbers
    const brokenW = wst[S.bpFaced] - wst[S.bpSaved];
    const brokenL = lst[S.bpFaced] - lst[S.bpSaved];
    const tbW = sets.filter((x) => tiebreakSet(x) && x.w > x.l).length;
    const tbL = sets.filter((x) => tiebreakSet(x) && x.l > x.w).length;
    const gamesW = sets.reduce((g, x) => g + (x.super ? 0 : x.w), 0);
    const gamesL = sets.reduce((g, x) => g + (x.super ? 0 : x.l), 0);
    if (Math.abs(wst[S.svGms] - brokenW + brokenL + tbW - gamesW) > 2 || Math.abs(lst[S.svGms] - brokenL + brokenW + tbL - gamesL) > 2) return false;
  }
  return true;
}

/** Played to the end: the data says so, and the winner has the sets to show for it (some retirements aren't marked) */
export function playedOut(outcome: Outcome, sets: SetScore[], bestOf: 3 | 5) {
  return outcome === "completed" && sets.filter((x) => x.w > x.l).length === Math.ceil(bestOf / 2);
}

/** Whether a match's recorded length can be true for its games */
function minutesHold(minutes: number | null, sets: SetScore[], completed: boolean) {
  if (!minutes || minutes <= 0) return false;
  const games = gamesOf(sets);
  if (!games) return false;
  const perGame = minutes / games;
  return completed ? perGame >= 1.8 && perGame <= 8.5 && minutes >= 20 : perGame >= 1.2 && perGame <= 15;
}

/** A tour's rows as Matches keeps them: only matches that were played, with impossible numbers left out */
export function buildMatchFile(input: { tour: Tour; matches: ModelMatch[]; players: Record<string, MatchPlayer>; last: string }): BuiltMatches {
  const players: BuiltPlayer[] = [];
  const playerIndex = new Map<string, number>();
  const events: string[] = [];
  const eventIndex = new Map<string, number>();
  const playerOf = (key: string) => {
    let i = playerIndex.get(key);
    if (i === undefined) {
      const p = input.players[key];
      i = players.length;
      playerIndex.set(key, i);
      players.push([key.slice(input.tour.length + 1), p?.name ?? key, p?.short ?? key, p?.ioc ?? null, p?.hand ?? null, p?.height ?? null]);
    }
    return i;
  };
  const eventOf = (name: string) => {
    let i = eventIndex.get(name);
    if (i === undefined) {
      i = events.length;
      eventIndex.set(name, i);
      events.push(name);
    }
    return i;
  };
  const dropped = { stats: 0, minutes: 0 };
  const rows: BuiltRow[] = [];
  const played = input.matches
    .filter((m) => m.played && OUTCOMES.includes(m.outcome))
    .sort((a, b) => (a.date ?? a.start).localeCompare(b.date ?? b.start) || ROUND_ORDER[a.round] - ROUND_ORDER[b.round] || a.id.localeCompare(b.id));
  for (const m of played) {
    const { sets } = parseScore(m.score);
    if (!sets.length) continue;
    const completed = playedOut(m.outcome, sets, m.bestOf);
    const statsOk = statsHold(m.wst, m.lst, sets, completed);
    if ((m.wst || m.lst) && !statsOk) dropped.stats++;
    const minutesOk = minutesHold(m.minutes, sets, completed);
    if (m.minutes && !minutesOk) dropped.minutes++;
    const age = (a: number | null) => (a === null ? null : Math.round(a * 100) / 100);
    rows.push([
      m.id,
      eventOf(m.event),
      TIERS.indexOf(m.tier),
      SURFACES.indexOf(m.surface),
      m.indoor === undefined || m.indoor === null ? null : m.indoor ? 1 : 0,
      ROUNDS.indexOf(m.round),
      m.bestOf,
      m.season,
      m.date ?? m.start,
      OUTCOMES.indexOf(m.outcome),
      playerOf(m.w),
      playerOf(m.l),
      m.score,
      minutesOk ? m.minutes : null,
      m.wr,
      m.lr,
      m.ws ?? null,
      m.ls ?? null,
      m.we ?? null,
      m.le ?? null,
      age(m.wa),
      age(m.la),
      statsOk ? m.wst : null,
      statsOk ? m.lst : null,
    ]);
  }
  return { v: 1, tour: input.tour, from: played.length ? played[0].season : 0, last: input.last, players, events, rows, dropped };
}

/* ---------- The drama score ---------- */

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * How dramatic a match was, out of 100, from how it unfolded (never from who played or what was at stake):
 * closeness 20 (the loser's share of points, 40% → 0 and 50% or more → 20; estimated from games where points
 * weren't recorded), distance 20 (a deciding set; best of five in four sets 8), swings 20 (10 for each set
 * the winner took from behind, 6 for each the loser did), the finish 20 (last set a tiebreak or past 7–5 20,
 * 7–5 14, 6–4 6), tiebreaks 10 (5 each) and length 10 (games played against the format's longest usual
 * match). Matches not played to the end have none.
 */
export function dramaOf(sets: SetScore[], bestOf: 3 | 5, completed: boolean, loserShare: number | null, fit: { a: number; b: number }): { score: number; parts: DramaPart[]; estimated: boolean } | null {
  if (!completed || sets.length < (bestOf === 5 ? 3 : 2)) return null;
  const gw = sets.reduce((g, s) => g + (s.super ? (s.w > s.l ? 1 : 0) : s.w), 0);
  const gl = sets.reduce((g, s) => g + (s.super ? (s.l > s.w ? 1 : 0) : s.l), 0);
  const games = gw + gl;
  const estimated = loserShare === null;
  const share = loserShare ?? fit.a + fit.b * (gl / games);
  const closeness = 20 * clamp01((share - 0.4) / 0.1);
  const distance = sets.length === bestOf ? 20 : bestOf === 5 && sets.length === 4 ? 8 : 0;
  let ww = 0;
  let wl = 0;
  let fromBehindW = 0;
  let fromBehindL = 0;
  for (const s of sets) {
    if (s.w > s.l) {
      if (ww < wl) fromBehindW++;
      ww++;
    } else {
      if (wl < ww) fromBehindL++;
      wl++;
    }
  }
  const swings = Math.min(20, 10 * fromBehindW + 6 * fromBehindL);
  const last = sets[sets.length - 1];
  const top = Math.max(last.w, last.l);
  const finish = tiebreakSet(last) || top >= 8 ? 20 : top === 7 ? 14 : top === 6 && Math.min(last.w, last.l) === 4 ? 6 : 0;
  const tbs = sets.filter(tiebreakSet).length;
  const tiebreaks = Math.min(10, 5 * tbs);
  const length = 10 * clamp01((games / (13 * bestOf) - 0.5) / 0.5);
  const parts: DramaPart[] = [
    { id: "closeness", label: "Closeness", got: closeness, max: 20, why: `The loser won ${(share * 100).toFixed(1)}% of the points${estimated ? " (estimated from games: points weren't recorded)" : ""}` },
    { id: "distance", label: "Distance", got: distance, max: 20, why: distance === 20 ? "Went to a deciding set" : distance ? "Four sets of five" : "No deciding set" },
    {
      id: "swings",
      label: "Swings",
      got: swings,
      max: 20,
      why: fromBehindW || fromBehindL ? [fromBehindW && `the winner took ${fromBehindW === 1 ? "a set" : `${fromBehindW} sets`} from behind`, fromBehindL && `the loser took ${fromBehindL === 1 ? "a set" : `${fromBehindL} sets`} from behind`].filter(Boolean).join(", ").replace(/^./, (c) => c.toUpperCase()) : "No set was won from behind",
    },
    { id: "finish", label: "Finish", got: finish, max: 20, why: `The last set went ${last.super ? `to a match tiebreak, ${last.w}–${last.l}` : `${last.w}–${last.l}`}` },
    { id: "tiebreaks", label: "Tiebreaks", got: tiebreaks, max: 10, why: tbs ? `${tbs} tiebreak${tbs > 1 ? "s" : ""}` : "No tiebreaks" },
    { id: "length", label: "Length", got: length, max: 10, why: `${games} games, best of ${bestOf}` },
  ];
  const score = parts.reduce((t, p) => t + p.got, 0);
  return { score: Math.round(score * 10) / 10, parts: parts.map((p) => ({ ...p, got: Math.round(p.got * 10) / 10 })), estimated };
}

/* ---------- In memory: one typed column per number ---------- */

type Col = Float32Array;

export type MatchTable = {
  tour: Tour;
  from: number;
  last: string;
  n: number;
  ids: string[];
  idIndex: Map<string, number>;
  players: { key: string; id: string; name: string; short: string; ioc: string | null; hand: string | null; height: number | null; fold: string; matches: number; first: number; last: number }[];
  events: string[];
  eventMatches: number[];
  event: Uint16Array;
  tier: Uint8Array;
  surface: Uint8Array;
  indoor: Int8Array; // -1 unknown
  round: Uint8Array;
  bestOf: Uint8Array;
  outcome: Uint8Array;
  done: Uint8Array; // played to the end (playedOut)
  w: Uint32Array;
  l: Uint32Array;
  dateKey: Float64Array; // YYYYMMDD and the round, for sorting by when
  dates: string[];
  scores: string[];
  wr: Col;
  lr: Col;
  ws: Col;
  ls: Col;
  we: (string | null)[];
  le: (string | null)[];
  odd: Uint32Array; // a bit for each oddity, in the order matches.ts lists them
  cols: Map<string, Col>; // "aces.w", "aces.l", "aces.b", "drama.m"…
  fit: { a: number; b: number; n: number };
  loserShare: Col; // NaN where points weren't recorded
};

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Points share from games share, fitted on the matches that recorded both: the drama score's estimate */
function fitShare(pairs: [number, number][]) {
  const n = pairs.length;
  if (n < 100) return { a: 0.284, b: 0.429, n };
  const mx = pairs.reduce((t, p) => t + p[0], 0) / n;
  const my = pairs.reduce((t, p) => t + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
  }
  const b = sxy / sxx;
  return { a: Math.round((my - b * mx) * 10000) / 10000, b: Math.round(b * 10000) / 10000, n };
}

export function hydrate(file: BuiltMatches): MatchTable {
  const n = file.rows.length;
  const col = () => new Float32Array(n).fill(NaN);
  const cols = new Map<string, Col>();
  for (const s of stats) {
    if (s.per === "match") cols.set(`${s.id}.m`, col());
    else {
      cols.set(`${s.id}.w`, col());
      cols.set(`${s.id}.l`, col());
      if (s.sum) cols.set(`${s.id}.b`, col());
    }
  }
  const set = (key: string, i: number, v: number | null | undefined) => {
    if (v !== null && v !== undefined && Number.isFinite(v)) cols.get(key)![i] = v;
  };
  const pair = (id: string, i: number, w: number | null | undefined, l: number | null | undefined) => {
    set(`${id}.w`, i, w);
    set(`${id}.l`, i, l);
    if (statById.get(id)!.sum && w !== null && w !== undefined && l !== null && l !== undefined) set(`${id}.b`, i, w + l);
  };

  const players = file.players.map(([id, name, short, ioc, hand, height]) => ({ key: `${file.tour}:${id}`, id, name, short, ioc, hand, height, fold: fold(name), matches: 0, first: 9999, last: 0 }));
  const t: MatchTable = {
    tour: file.tour,
    from: file.from,
    last: file.last,
    n,
    ids: new Array(n),
    idIndex: new Map(),
    players,
    events: file.events,
    eventMatches: new Array(file.events.length).fill(0),
    event: new Uint16Array(n),
    tier: new Uint8Array(n),
    surface: new Uint8Array(n),
    indoor: new Int8Array(n),
    round: new Uint8Array(n),
    bestOf: new Uint8Array(n),
    outcome: new Uint8Array(n),
    done: new Uint8Array(n),
    w: new Uint32Array(n),
    l: new Uint32Array(n),
    dateKey: new Float64Array(n),
    dates: new Array(n),
    scores: new Array(n),
    wr: col(),
    lr: col(),
    ws: col(),
    ls: col(),
    we: new Array(n),
    le: new Array(n),
    odd: new Uint32Array(n),
    cols,
    fit: { a: 0.284, b: 0.429, n: 0 },
    loserShare: col(),
  };
  const bit = Object.fromEntries(oddities.map((o, i) => [o.id, 1 << i])) as Record<string, number>;

  // First pass: everything but the drama score, which needs the fit from every match's points
  const parsed: SetScore[][] = new Array(n);
  const sharePairs: [number, number][] = [];
  file.rows.forEach((row, i) => {
    const [id, event, tier, surface, indoor, round, bestOf, season, date, outcome, w, l, score, minutes, wr, lr, ws, ls, we, le, wa, la, wst, lst] = row;
    t.ids[i] = id;
    t.idIndex.set(id, i);
    t.event[i] = event;
    t.eventMatches[event]++;
    t.tier[i] = tier;
    t.surface[i] = surface;
    t.indoor[i] = indoor === null ? -1 : indoor;
    t.round[i] = round;
    t.bestOf[i] = bestOf;
    t.outcome[i] = outcome;
    t.w[i] = w;
    t.l[i] = l;
    t.dates[i] = date;
    t.scores[i] = score;
    t.dateKey[i] = Number(date.replace(/-/g, "")) * 10 + ROUND_ORDER[ROUNDS[round]];
    if (wr !== null) t.wr[i] = wr;
    if (lr !== null) t.lr[i] = lr;
    if (ws !== null) t.ws[i] = ws;
    if (ls !== null) t.ls[i] = ls;
    t.we[i] = we;
    t.le[i] = le;
    for (const p of [players[w], players[l]]) {
      p.matches++;
      p.first = Math.min(p.first, season);
      p.last = Math.max(p.last, season);
    }

    const sets = parseScore(score).sets;
    parsed[i] = sets;
    const completed = playedOut(OUTCOMES[outcome], sets, bestOf);
    t.done[i] = completed ? 1 : 0;
    const finished = completed ? sets : sets.slice(0, -1);
    const gw = sets.reduce((g, s) => g + (s.super ? (s.w > s.l ? 1 : 0) : s.w), 0);
    const gl = sets.reduce((g, s) => g + (s.super ? (s.l > s.w ? 1 : 0) : s.l), 0);
    pair("games", i, gw, gl);
    set("totalGames.m", i, gw + gl);
    set("gameMargin.m", i, gw - gl);
    set("sets.m", i, sets.length);
    set("season.m", i, season);
    const tbs = finished.filter(tiebreakSet);
    set("tiebreaks.m", i, tbs.length);
    // The longest tiebreak and set, as points or games played with the loser's share after the point
    // (24–22 is 46.022, 70–68 is 138.068): sorted by length, shown as the score. A tiebreak's winner has 7
    // points at least and two clear, unless it was a match tiebreak, written out in full.
    const tbPoints = tbs
      .map((s) => (s.super ? [Math.max(s.w, s.l), Math.min(s.w, s.l)] : s.tb !== null ? [Math.max(7, s.tb + 2), s.tb] : null))
      .filter((x): x is number[] => x !== null)
      .map(([won, lost]) => won + lost + lost / 1000);
    if (tbPoints.length) set("longestTb.m", i, Math.max(...tbPoints));
    const longest = finished.filter((s) => !s.super).map((s) => s.w + s.l + Math.min(s.w, s.l) / 1000);
    if (longest.length) set("longestSet.m", i, Math.max(...longest));
    pair("bagels", i, finished.filter((s) => !s.super && s.w === 6 && s.l === 0).length, finished.filter((s) => !s.super && s.l === 6 && s.w === 0).length);

    set("minutes.m", i, minutes);
    pair("rank", i, wr, lr);
    pair("seed", i, ws, ls);
    pair("age", i, wa, la);
    const wh = players[w].height;
    const lh = players[l].height;
    pair("height", i, wh, lh);
    if (wr !== null && lr !== null && lr > 0) set("rankRatio.m", i, wr / lr);
    if (wa !== null && la !== null) set("ageGap.m", i, Math.round((wa - la) * 100) / 100);
    if (wh && lh) set("heightGap.m", i, wh - lh);

    // Oddities are about matches played to the end: winning on fewer games when the other player retired isn't one
    let flags = 0;
    if (completed && gw < gl) flags |= bit["fewer-games"];
    if (completed && sets.length >= 3 && sets[0].w < sets[0].l && sets[1].w < sets[1].l) flags |= bit["two-down"];
    if (completed && sets[0].w < sets[0].l) flags |= bit["first-set"];
    if (completed && sets.some((s) => !s.super && s.w === 0 && s.l === 6)) flags |= bit.bagel;
    if (completed && sets.length >= 2 && sets.every(tiebreakSet)) flags |= bit["all-tb"];
    const decided = completed && sets.length === bestOf;
    const lastSet = sets[sets.length - 1];
    if (decided && tiebreakSet(lastSet)) flags |= bit["decider-tb"];
    if (decided && !lastSet.super && Math.max(lastSet.w, lastSet.l) >= 8) flags |= bit["long-decider"];
    if (completed && sets.filter((s) => !s.super && s.w === 6 && s.l === 0).length >= 2) flags |= bit["double-bagel"];

    if (wst && lst) {
      const svW = wst[S.svpt];
      const svL = lst[S.svpt];
      const wonOnServeW = wst[S.won1] + wst[S.won2];
      const wonOnServeL = lst[S.won1] + lst[S.won2];
      const pw = wonOnServeW + (svL - wonOnServeL);
      const pl = wonOnServeL + (svW - wonOnServeW);
      const brokenW = wst[S.bpFaced] - wst[S.bpSaved];
      const brokenL = lst[S.bpFaced] - lst[S.bpSaved];
      pair("pointsWon", i, pw, pl);
      pair("pointShare", i, (100 * pw) / (pw + pl), (100 * pl) / (pw + pl));
      set("pointMargin.m", i, pw - pl);
      set("points.m", i, svW + svL);
      pair("aces", i, wst[S.ace], lst[S.ace]);
      pair("df", i, wst[S.df], lst[S.df]);
      pair("aceRate", i, (100 * wst[S.ace]) / svW, (100 * lst[S.ace]) / svL);
      pair("firstIn", i, (100 * wst[S.in1]) / svW, (100 * lst[S.in1]) / svL);
      pair("firstWon", i, wst[S.in1] ? (100 * wst[S.won1]) / wst[S.in1] : null, lst[S.in1] ? (100 * lst[S.won1]) / lst[S.in1] : null);
      pair("secondWon", i, svW > wst[S.in1] ? (100 * wst[S.won2]) / (svW - wst[S.in1]) : null, svL > lst[S.in1] ? (100 * lst[S.won2]) / (svL - lst[S.in1]) : null);
      const serveW = (100 * wonOnServeW) / svW;
      const serveL = (100 * wonOnServeL) / svL;
      pair("serveWon", i, serveW, serveL);
      pair("returnWon", i, 100 - serveL, 100 - serveW);
      pair("dominance", i, serveW < 100 ? (100 - serveL) / (100 - serveW) : null, serveL < 100 ? (100 - serveW) / (100 - serveL) : null);
      pair("held", i, (100 * (wst[S.svGms] - brokenW)) / wst[S.svGms], (100 * (lst[S.svGms] - brokenL)) / lst[S.svGms]);
      pair("bpFaced", i, wst[S.bpFaced], lst[S.bpFaced]);
      pair("bpSaved", i, wst[S.bpSaved], lst[S.bpSaved]);
      pair("bpSavedPct", i, wst[S.bpFaced] ? (100 * wst[S.bpSaved]) / wst[S.bpFaced] : null, lst[S.bpFaced] ? (100 * lst[S.bpSaved]) / lst[S.bpFaced] : null);
      pair("broken", i, brokenW, brokenL);
      pair("breaks", i, brokenL, brokenW);
      pair("bpChances", i, lst[S.bpFaced], wst[S.bpFaced]);
      pair("bpConverted", i, lst[S.bpFaced] ? (100 * brokenL) / lst[S.bpFaced] : null, wst[S.bpFaced] ? (100 * brokenW) / wst[S.bpFaced] : null);
      if (minutes) set("pace.m", i, (minutes * 60) / (svW + svL));
      if (completed && pw < pl) flags |= bit["fewer-points"];
      if (completed && brokenW > brokenL) flags |= bit["more-broken"];
      if (completed && brokenL === 0) flags |= bit["no-breaks"];
      if (completed && ((wst[S.bpFaced] >= 10 && brokenW === 0) || (lst[S.bpFaced] >= 10 && brokenL === 0))) flags |= bit["saved-all"];
      t.loserShare[i] = pl / (pw + pl);
      if (completed) sharePairs.push([gl / (gw + gl), pl / (pw + pl)]);
    }
    t.odd[i] = flags;
  });

  // Second pass: the drama score, closeness estimated from games where points weren't recorded
  t.fit = fitShare(sharePairs);
  const drama = cols.get("drama.m")!;
  for (let i = 0; i < n; i++) {
    const share = t.loserShare[i];
    const d = dramaOf(parsed[i], t.bestOf[i] === 5 ? 5 : 3, t.done[i] === 1, Number.isNaN(share) ? null : share, t.fit);
    if (d) drama[i] = d.score;
  }
  return t;
}

/* ---------- Reading a number off a match ---------- */

/** The column for a statistic and side, if the side is one a column holds (w, l, b, m) */
const colOf = (t: MatchTable, stat: string, side: "w" | "l" | "b" | "m") => t.cols.get(`${stat}.${side}`);

type Getter = (i: number) => number;

/** One number per match for a statistic and side; "either" takes the larger (or, sorting least first, the smaller) */
function getter(t: MatchTable, stat: StatDef, side: Side, player: number | null, least = false): Getter {
  if (stat.per === "match") return ((c) => (i: number) => c[i])(colOf(t, stat.id, "m")!);
  const w = colOf(t, stat.id, "w")!;
  const l = colOf(t, stat.id, "l")!;
  switch (side) {
    case "w":
      return (i) => w[i];
    case "l":
      return (i) => l[i];
    case "b":
      return ((b) => (i: number) => b[i])(colOf(t, stat.id, "b")!);
    case "p":
      return (i) => (t.w[i] === player ? w[i] : l[i]);
    case "o":
      return (i) => (t.w[i] === player ? l[i] : w[i]);
    default:
      return least
        ? (i) => (Number.isNaN(w[i]) ? l[i] : Number.isNaN(l[i]) ? w[i] : Math.min(w[i], l[i]))
        : (i) => (Number.isNaN(w[i]) ? l[i] : Number.isNaN(l[i]) ? w[i] : Math.max(w[i], l[i]));
  }
}

/** Both players' numbers for a statistic, where it's one each */
function pairOf(t: MatchTable, stat: StatDef, i: number) {
  if (stat.per === "match") return null;
  const w = colOf(t, stat.id, "w")![i];
  const l = colOf(t, stat.id, "l")![i];
  return { w: Number.isNaN(w) ? null : w, l: Number.isNaN(l) ? null : l };
}

const isInt = (stat: StatDef) => ["int", "rank", "cm", "year", "minutes"].includes(stat.format) || (stat.format === "signed" && !["ageGap"].includes(stat.id));

/** A histogram of values: one bar per whole number when few, else forty even bars */
function histogram(values: number[], stat: StatDef): Hist | null {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const lo = values[0];
  const hi = values[values.length - 1];
  const whole = isInt(stat);
  let step = whole && hi - lo <= 60 ? 1 : (hi - lo) / 40 || 1;
  if (whole) step = Math.max(1, Math.ceil(step));
  const count = Math.max(1, Math.floor((hi - lo) / step) + 1);
  const bins = new Array(count).fill(0);
  for (const v of values) bins[Math.min(count - 1, Math.floor((v - lo) / step))]++;
  const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))];
  return { lo, hi, step, bins, n: values.length, q: [q(0.01), q(0.1), q(0.5), q(0.9), q(0.99)] };
}

/* ---------- Running a search ---------- */

const FACET_BITS: FacetId[] = ["tier", "surface", "court", "round", "format", "ending", "wentry", "lentry", "hands", "nations"];

/** The value a match has for a filter of the given kind */
function facetValue(t: MatchTable, f: FacetId, i: number): string {
  switch (f) {
    case "tier":
      return TIERS[t.tier[i]];
    case "surface":
      return SURFACES[t.surface[i]];
    case "court":
      return t.indoor[i] === 1 ? "indoor" : t.indoor[i] === 0 ? "outdoor" : "";
    case "round": {
      const r = ROUNDS[t.round[i]];
      return r === "3P" ? "BR" : r;
    }
    case "format":
      return String(t.bestOf[i]);
    case "ending":
      // A "completed" match the winner didn't win enough sets in ended some other way the data doesn't say
      return t.done[i] ? "completed" : OUTCOMES[t.outcome[i]] === "completed" ? "" : OUTCOMES[t.outcome[i]];
    case "wentry":
      return t.we[i] ?? "direct";
    case "lentry":
      return t.le[i] ?? "direct";
    case "hands": {
      const w = t.players[t.w[i]].hand;
      const l = t.players[t.l[i]].hand;
      if (!w || !l || w === "U" || l === "U") return "";
      return w === "L" && l === "L" ? "both" : w === "L" ? "won" : l === "L" ? "lost" : "none";
    }
    case "nations": {
      const w = t.players[t.w[i]].ioc;
      const l = t.players[t.l[i]].ioc;
      return !w || !l ? "" : w === l ? "same" : "different";
    }
  }
}

/** The players named on a page of results: what to call each among them, and their initials */
function namePlayers(t: MatchTable, indices: Iterable<number>) {
  const people = [...new Set(indices)].map((i) => t.players[i]);
  const names = displayNames(people.map((p) => ({ key: p.key, name: p.name, short: p.short, ioc: p.ioc })));
  return (i: number) => names.get(t.players[i].key) ?? t.players[i].short;
}

export function runSearch(t: MatchTable, s: Search): MatchesResult {
  const tour = t.tour;
  const playerIdx = s.players.map((id) => t.players.findIndex((p) => p.id === id));
  const main = playerIdx[0] ?? null;
  const nobody = playerIdx.some((i) => i < 0);
  const eventSet = new Set(s.events.map((e) => t.events.indexOf(e)));
  const nations = s.nations;

  // Each range: a test, and the values its histogram is drawn from
  const ranges = s.ranges.map((r) => {
    const stat = statById.get(r.stat)!;
    const inside = (v: number) => !Number.isNaN(v) && (r.min === null || v >= r.min - 1e-6) && (r.max === null || v <= r.max + 1e-6);
    if (r.side === "x" && stat.per === "player") {
      const w = colOf(t, stat.id, "w")!;
      const l = colOf(t, stat.id, "l")!;
      return { stat, test: (i: number) => inside(w[i]) || inside(l[i]), values: (i: number, out: number[]) => [w[i], l[i]].forEach((v) => !Number.isNaN(v) && out.push(v)) };
    }
    const get = getter(t, stat, r.side, main);
    return { stat, test: (i: number) => inside(get(i)), values: (i: number, out: number[]) => ((v) => !Number.isNaN(v) && out.push(v))(get(i)) };
  });
  const facetTests = FACET_BITS.map((f) => {
    const want = s.facets[f];
    return want?.length ? new Set(want) : null;
  });
  const oddMask = s.odd.reduce((m, o) => m | (1 << oddities.findIndex((d) => d.id === o)), 0);

  // A bit for each filter a match fails: ranges 0–7, facets 8–17, oddities 18. Players, events and
  // countries aren't relaxed for any count, so a match that fails them is skipped outright.
  const RANGE = 0;
  const FACET = 8;
  const ODD = 18;
  const found: number[] = [];
  const rangeValues: number[][] = ranges.map(() => []);
  const facetCounts: Partial<Record<FacetId, Record<string, number>>> = {};
  for (const f of FACET_BITS) facetCounts[f] = {};
  const oddCounts: Record<string, number> = Object.fromEntries(oddities.map((o) => [o.id, 0]));

  if (!nobody)
    for (let i = 0; i < t.n; i++) {
      let mask = 0;
      // Who played, where, and which countries: never relaxed for the counts
      if (playerIdx.length) {
        const w = t.w[i];
        const l = t.l[i];
        if (!playerIdx.every((p) => p === w || p === l)) continue;
        if (s.result === "won" && w !== main) continue;
        if (s.result === "lost" && l !== main) continue;
      }
      if (eventSet.size && !eventSet.has(t.event[i])) continue;
      if (nations.length) {
        const a = t.players[t.w[i]].ioc;
        const b = t.players[t.l[i]].ioc;
        if (nations.length === 1 ? a !== nations[0] && b !== nations[0] : !((a === nations[0] && b === nations[1]) || (a === nations[1] && b === nations[0]))) continue;
      }
      for (let k = 0; k < ranges.length; k++) if (!ranges[k].test(i)) mask |= 1 << (RANGE + k);
      for (let k = 0; k < FACET_BITS.length; k++) {
        const want = facetTests[k];
        if (want && !want.has(facetValue(t, FACET_BITS[k], i))) mask |= 1 << (FACET + k);
      }
      if (oddMask && (t.odd[i] & oddMask) !== oddMask) mask |= 1 << ODD;

      if (mask === 0) {
        found.push(i);
        for (let k = 0; k < oddities.length; k++) if (t.odd[i] & (1 << k)) oddCounts[oddities[k].id]++;
      }
      // Every other filter let it through: it counts towards this range's histogram, or this filter's values
      for (let k = 0; k < ranges.length; k++) if ((mask & ~(1 << (RANGE + k))) === 0) ranges[k].values(i, rangeValues[k]);
      for (let k = 0; k < FACET_BITS.length; k++)
        if ((mask & ~(1 << (FACET + k))) === 0) {
          const v = facetValue(t, FACET_BITS[k], i);
          if (v) facetCounts[FACET_BITS[k]]![v] = (facetCounts[FACET_BITS[k]]![v] ?? 0) + 1;
        }
    }

  // Sorted by when, or by a number with the matches that don't have it last
  const desc = s.sort.dir === "desc";
  let sortable = found.length;
  let sortHist: Hist | null = null;
  const sortStat = s.sort.stat === "date" ? null : statById.get(s.sort.stat)!;
  if (!sortStat) {
    found.sort((a, b) => (desc ? t.dateKey[b] - t.dateKey[a] : t.dateKey[a] - t.dateKey[b]) || (desc ? b - a : a - b));
  } else {
    const get = getter(t, sortStat, s.sort.side, main, !desc);
    const key = new Float64Array(t.n);
    const values: number[] = [];
    for (const i of found) {
      key[i] = get(i);
      if (!Number.isNaN(key[i])) values.push(key[i]);
    }
    sortable = values.length;
    found.sort((a, b) => {
      const x = key[a];
      const y = key[b];
      if (Number.isNaN(x)) return Number.isNaN(y) ? t.dateKey[b] - t.dateKey[a] : 1;
      if (Number.isNaN(y)) return -1;
      return (desc ? y - x : x - y) || t.dateKey[b] - t.dateKey[a];
    });
    sortHist = histogram(values, sortStat);
  }

  // The page asked for, its players named among themselves
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const page = Math.min(s.page, pages - 1);
  const shown = found.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const nameOf = namePlayers(t, [...shown.flatMap((i) => [t.w[i], t.l[i]]), ...playerIdx.filter((i) => i >= 0)]);
  const columns = [...(sortStat ? [{ stat: sortStat, side: s.sort.side, least: !desc }] : []), ...s.ranges.map((r) => ({ stat: statById.get(r.stat)!, side: r.side, least: false }))];
  const getters = columns.map((c) => getter(t, c.stat, c.side, main, c.least));
  const person = (p: number, i: number, won: boolean): ResultPlayer => {
    const pl = t.players[p];
    return {
      key: pl.key,
      name: nameOf(p),
      full: pl.name,
      initials: initialsOf(pl),
      ioc: pl.ioc,
      rank: ((r) => (Number.isNaN(r) ? null : r))(won ? t.wr[i] : t.lr[i]),
      seed: ((r) => (Number.isNaN(r) ? null : r))(won ? t.ws[i] : t.ls[i]),
      entry: won ? t.we[i] : t.le[i],
    };
  };
  const rows: ResultRow[] = shown.map((i, k) => ({
    id: t.ids[i],
    n: page * PAGE_SIZE + k + 1,
    event: t.events[t.event[i]],
    season: Math.round(colOf(t, "season", "m")![i]),
    date: t.dates[i],
    round: ROUNDS[t.round[i]],
    tier: TIERS[t.tier[i]],
    surface: SURFACES[t.surface[i]],
    score: t.scores[i],
    w: person(t.w[i], i, true),
    l: person(t.l[i], i, false),
    cells: columns.map((c, j): ResultCell => {
      const v = getters[j](i);
      const both = c.side === "x" || c.side === "b" ? pairOf(t, c.stat, i) : null;
      return { value: Number.isNaN(v) ? null : v, ...(both ?? {}) };
    }),
  }));

  const people = Object.fromEntries(playerIdx.filter((i) => i >= 0).map((i) => [t.players[i].id, { name: t.players[i].name, ioc: t.players[i].ioc, matches: t.players[i].matches }]));
  return {
    tour,
    all: t.n,
    total: found.length,
    sortable,
    page,
    rows,
    sortHist,
    rangeHists: ranges.map((r, k) => histogram(rangeValues[k], r.stat)),
    odd: oddCounts,
    facets: facetCounts,
    people,
    from: t.from,
    last: t.last,
  };
}

/* ---------- Finding a player, an event or a country ---------- */

export function suggest(t: MatchTable, query: string): Suggestion[] {
  const words = fold(query).split(/[\s'-]+/).filter(Boolean);
  if (!words.length) return [];
  const players = t.players
    .filter((p) => {
      const parts = p.fold.split(/[\s'-]+/);
      return words.every((w) => parts.some((part) => part.startsWith(w)));
    })
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 6)
    .map((p): Suggestion => ({ kind: "player", id: p.id, name: p.name, ioc: p.ioc, matches: p.matches, years: [p.first, p.last], tour: t.tour }));
  const events = t.events
    .map((name, i) => ({ name, n: t.eventMatches[i], parts: fold(name).split(/[\s'-]+/) }))
    .filter((e) => words.every((w) => e.parts.some((part) => part.startsWith(w))))
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map((e): Suggestion => ({ kind: "event", name: e.name, matches: e.n }));
  const q = fold(query).trim();
  const nationCount = new Map<string, number>();
  for (const p of t.players) if (p.ioc) nationCount.set(p.ioc, (nationCount.get(p.ioc) ?? 0) + p.matches);
  const nations = [...nationCount.keys()]
    .filter((ioc) => q.length >= 2 && (fold(ioc) === q || fold(nationNames[ioc] ?? "").split(/\s+/).some((part) => part.startsWith(q))))
    .sort((a, b) => nationCount.get(b)! - nationCount.get(a)!)
    .slice(0, 2)
    .map((ioc): Suggestion => ({ kind: "nation", ioc, matches: nationCount.get(ioc)! }));
  return [...players, ...events, ...nations];
}

/* ---------- A match's own page: how extreme it was ---------- */

/** "Wimbledon 2018 · Semifinal · Anderson v Isner" */
function labelOf(t: MatchTable, i: number) {
  const round = ROUNDS[t.round[i]];
  const roundText = round === "F" ? "Final" : round === "SF" ? "Semifinal" : round === "QF" ? "Quarterfinal" : round;
  return `${t.events[t.event[i]]} ${Math.round(colOf(t, "season", "m")![i])} · ${roundText} · ${t.players[t.w[i]].short} v ${t.players[t.l[i]].short}`;
}

/**
 * Where a match's numbers rank among every match its tour has played: for each statistic it's remarkable
 * for (most or least), how many matches went further, how many tie, and the matches just either side. One
 * pass over the tour per statistic, so it needs nothing kept in memory between pages.
 */
export function extremesOf(t: MatchTable, id: string, keep = 8): Extremes | null {
  const i = t.idIndex.get(id);
  if (i === undefined) return null;
  const candidates: (Standing & { score: number })[] = [];
  for (const stat of stats) {
    if (stat.extreme === "none") continue;
    const sides: ("w" | "l" | "b" | "m")[] = stat.per === "match" ? ["m"] : stat.sum ? ["w", "l", "b"] : ["w", "l"];
    const dirs: ("desc" | "asc")[] = stat.extreme === "both" ? ["desc", "asc"] : stat.extreme === "most" ? ["desc"] : ["asc"];
    for (const side of sides) {
      const c = colOf(t, stat.id, side)!;
      const v = c[i];
      if (Number.isNaN(v)) continue;
      let greater = 0;
      let less = 0;
      let equal = 0;
      let up = -1;
      let down = -1;
      for (let j = 0; j < t.n; j++) {
        const x = c[j];
        if (Number.isNaN(x)) continue;
        if (x > v) {
          greater++;
          if (up < 0 || x < c[up]) up = j;
        } else if (x < v) {
          less++;
          if (down < 0 || x > c[down]) down = j;
        } else equal++;
      }
      const n = greater + less + equal;
      for (const dir of dirs) {
        const better = dir === "desc" ? greater : less;
        const score = (better + equal / 2) / n;
        // Remarkable: even last among its ties, in the top tenth
        if ((better + equal) / n > 0.1) continue;
        const above = dir === "desc" ? up : down;
        const below = dir === "desc" ? down : up;
        const neighbour = (j: number): Neighbour | null => (j < 0 ? null : { id: t.ids[j], label: labelOf(t, j), value: c[j] });
        candidates.push({ stat: stat.id, side, dir, value: v, better, ties: equal, n, above: neighbour(above), below: neighbour(below), score });
      }
    }
  }
  // The most remarkable first, one line per statistic
  candidates.sort((a, b) => a.score - b.score);
  const seen = new Set<string>();
  const standings: Standing[] = [];
  for (const c of candidates) {
    if (seen.has(c.stat) || c.stat === "drama") continue;
    seen.add(c.stat);
    const { score: _score, ...rest } = c;
    void _score;
    standings.push(rest);
    if (standings.length >= keep) break;
  }

  const share = t.loserShare[i];
  const d = dramaOf(parseScore(t.scores[i]).sets, t.bestOf[i] === 5 ? 5 : 3, t.done[i] === 1, Number.isNaN(share) ? null : share, t.fit);
  let drama: Extremes["drama"] = null;
  if (d) {
    const c = colOf(t, "drama", "m")!;
    let better = 0;
    let ties = 0;
    let n = 0;
    for (let j = 0; j < t.n; j++) {
      if (Number.isNaN(c[j])) continue;
      n++;
      if (c[j] > c[i]) better++;
      else if (c[j] === c[i]) ties++;
    }
    drama = { score: d.score, parts: d.parts, better, ties, n, estimated: d.estimated };
  }
  return { tour: t.tour, drama, standings, names: { w: t.players[t.w[i]].short, l: t.players[t.l[i]].short } };
}
