// The models behind Advanced: small statistical models fitted to every match in the data, one tour at a
// time, for a fan to play with. Like the record books (records.ts), everything comes from fixed rules over
// the data, so the same data always gives the same models. Each model also says what it was fitted on and
// how well it does, because the page shows that next to every answer.
//
//   upsets   a logistic regression of the better-ranked player winning on the ranking gap, plus the real
//            record of every pairing of ranking bands
//   elo      an Elo rating for every player, overall and per surface, season by season
//   serve    a logistic regression of winning on how a player served
//   pressure how players do on the big points (break points, tiebreaks, deciding sets) against what their
//            play in those same matches would lead you to expect, and whether that edge lasts
//   ages     a typical career: how players do at each age against their own career average

import { parseScore, type Outcome, type Player, type Round, type Surface, type Tier, type Tour } from "./library";

/* ---------- What the engine reads ---------- */

/** A match as the models read it: every row, walkovers too. Players are keys ("atp:D643"). */
export type ModelMatch = {
  id: string;
  tourneyId: string;
  event: string; // without the year
  tier: Tier;
  season: number;
  start: string; // the tournament's first day
  round: Round;
  num: number | null;
  surface: Surface;
  w: string;
  l: string;
  score: string;
  bestOf: 3 | 5;
  outcome: Outcome;
  played: boolean; // false for walkovers and empty scores
  minutes: number | null;
  wr: number | null; // rankings
  lr: number | null;
  wa: number | null; // ages
  la: number | null;
  wst: number[] | null; // serve stats, see STAT
  lst: number[] | null;
};

export type ModelsInput = { tour: Tour; matches: ModelMatch[]; players: Record<string, Player>; last: string };

/* ---------- What it gives ---------- */

// The surfaces a fan can pick. Carpet (indoor, fast, gone after 2009) counts as hard.
export type Court = "hard" | "clay" | "grass";
export const courts: Court[] = ["hard", "clay", "grass"];
export type CourtOrAll = "all" | Court;
export const courtsOrAll: CourtOrAll[] = ["all", ...courts];

// Ranking bands for the upsets' real record
export const BANDS = [1, 2, 4, 6, 11, 21, 31, 51, 76, 101, 151, 251];
export const bandLabels = BANDS.map((lo, i) => (BANDS[i + 1] ? (BANDS[i + 1] - 1 === lo ? `${lo}` : `${lo}–${BANDS[i + 1] - 1}`) : `${lo}+`));
export const bandOf = (rank: number) => {
  let b = 0;
  while (b + 1 < BANDS.length && rank >= BANDS[b + 1]) b++;
  return b;
};

/** How often a model's favourite won, by how sure it was: 50–55%, 55–60%, … 95–100% */
export type Calibration = { n: number; won: number }[];

export type UpsetModel = {
  n: number; // matches fitted
  // logit P(better-ranked wins) = gap × (slope + bo5 + clay + grass), gap = ln(underdog's rank / favourite's)
  coef: { slope: number; bo5: number; clay: number; grass: number };
  se: { slope: number; bo5: number; clay: number; grass: number }; // standard errors
  bo5: boolean; // whether this tour plays best-of-five enough to offer it
  // The real record: cells[court][bestOf][favourite's band][underdog's band], flattened (see cellIndex)
  cells: { n: number[]; upsets: number[]; latest: (string | null)[] }; // latest: the most recent upset, to open in Explore
  calibration: Calibration;
  accuracy: number; // how often the better-ranked player won
  brier: number; // mean squared error of the chances: 0.25 for a coin flip, lower is better
  logLoss: number; // mean −ln(chance given to what happened): 0.693 for a coin flip
};
export const BEST_OFS = ["any", 3, 5] as const;
export const cellIndex = (court: CourtOrAll, bestOf: (typeof BEST_OFS)[number], fav: number, dog: number) =>
  ((courtsOrAll.indexOf(court) * BEST_OFS.length + BEST_OFS.indexOf(bestOf)) * BANDS.length + fav) * BANDS.length + dog;

/**
 * A player's season, for head-to-heads, as a row of numbers to keep the page small: who (an index into
 * people), the season, their record, and their ratings after their last match of it, with how many matches
 * each surface's rating is built on so far. Read it with the S indices.
 */
export type SeasonRow = number[];
export const S = { p: 0, season: 1, w: 2, l: 3, elo: 4, hard: 5, clay: 6, grass: 7, nHard: 8, nClay: 9, nGrass: 10 } as const;
export const courtRating = (row: SeasonRow, c: Court) => row[c === "hard" ? S.hard : c === "clay" ? S.clay : S.grass];
export const courtMatches = (row: SeasonRow, c: Court) => row[c === "hard" ? S.nHard : c === "clay" ? S.nClay : S.nGrass];

export type EloModel = {
  n: number; // matches rated
  from: number; // the first season shown: the first is a warm-up
  K: string; // the rule for how far one result moves a rating, in words
  seasons: SeasonRow[];
  peaks: Record<number, { elo: number; month: string }>; // each player's best overall rating, and when ("YYYY-MM")
  // The top 10 at the end of each month, overall and per surface: [people index, rating]
  months: string[]; // "YYYY-MM"
  top: Record<CourtOrAll, [number, number][][]>;
  calibration: Calibration; // matches from `from` on, rated half overall, half surface
  accuracy: number;
  rankAccuracy: number; // the better-ranked player, on the same matches with rankings
  brier: number;
  logLoss: number;
};

export type ServeStat = "in1" | "won1" | "won2";
export const serveStats: ServeStat[] = ["in1", "won1", "won2"];
export const serveRange: Record<ServeStat, [number, number]> = { in1: [40, 80], won1: [40, 90], won2: [20, 75] };

export type ServeModel = {
  // Per surface: logit P(win) = a + b·first serves in % + c·first-serve points won % + d·second-serve points won %
  fits: Record<CourtOrAll, { n: number; coef: Record<ServeStat | "a", number>; se: Record<ServeStat | "a", number>; mean: Record<ServeStat, number>; accuracy: number }>;
  // The real record, two points at a time over serveRange: bins[court][stat] = [{ n, won }] from the range's low end
  bins: Record<CourtOrAll, Record<ServeStat, { n: number; won: number }[]>>;
  // Each player's serving across their matches with stats (≥ 20), per surface: [matches, won, then the
  // rates in % in serveStats order]
  players: Record<number, Partial<Record<CourtOrAll, number[]>>>;
  years: [number, number]; // the seasons with serve stats
};

export type AgeModel = {
  minMatches: number; // a player counts towards the typical career with this many matches
  // Per era, the typical career by whole years of age: points above or below a player's own career win
  // rate (weighted by matches), its standard error, and how many players and matches it's from
  eras: Record<AgeEra, { ages: { age: number; diff: number; se: number; players: number; matches: number }[]; fit: [number, number, number]; peak: number; players: number }>;
  // Every player who counts, all seasons: [age, won, lost] for each whole year of age, to set beside it
  players: Record<number, [number, number, number][]>;
};
export type AgeEra = "all" | "early" | "late";
export const ageEras: { id: AgeEra; label: string; seasons: [number, number] }[] = [
  { id: "all", label: "Every season", seasons: [0, 9999] },
  { id: "early", label: "2003–2014", seasons: [0, 2014] },
  { id: "late", label: "2015 on", seasons: [2015, 9999] },
];

/** The big points: the chances, what decides how many a player should win, and the tour's own curve between them */
export type PressureMeasure = "saved" | "converted" | "tiebreaks" | "deciders";
export const pressureMeasures: PressureMeasure[] = ["saved", "converted", "tiebreaks", "deciders"];
export type PressureFit = {
  n: number; // chances in all: break points, tiebreaks or deciding sets
  rate: number; // the share of them won, tour-wide (for converted, saved and the rest: by whoever had the chance)
  base: number; // the tour-wide baseline: serve points won, return points won, or points won, in %
  // expected share = sigmoid(a + b·logit(baseline)): the tour's curve from how a player played to the big points
  coef: { a: number; b: number };
  se: { a: number; b: number };
  min: number; // the chances a player needs to be listed
  // per player: [chances, won, expected won, baseline %, chances in even seasons, won, expected, the same in odd seasons]
  players: Record<number, number[]>;
  halves: { r: number; lo: number; hi: number; players: number; baseR: number }; // even v odd seasons: over-performance, then the baseline itself
  years: [number, number];
};
export type PressureModel = Record<PressureMeasure, PressureFit>;
/** A player row's columns */
export const P = { n: 0, won: 1, exp: 2, base: 3, nEven: 4, wonEven: 5, expEven: 6, nOdd: 7, wonOdd: 8, expOdd: 9 } as const;

export type AdvancedBooks = {
  tour: Tour;
  from: number;
  last: string;
  people: string[]; // player keys the models name, indexed
  names: Record<string, string>;
  full: Record<string, string>;
  upsets: UpsetModel;
  elo: EloModel;
  serve: ServeModel;
  ages: AgeModel;
  pressure: PressureModel;
  topTen: number[]; // people the models name who were ranked in the top 10 at some point
};

/* ---------- Small helpers ---------- */

// Exhibitions and events played to other rules don't count, as in the record books
const exhibitions = new Set(["Laver Cup", "Next Gen Finals"]);
// Where each serve stat sits in a side's array (see the schema)
const STAT = { ace: 0, df: 1, svpt: 2, in1: 3, won1: 4, won2: 5, svGms: 6, bpSaved: 7, bpFaced: 8 } as const;
const ladder: Round[] = ["RR", "R128", "R64", "R32", "R16", "QF", "SF", "BR", "3P", "F"];
const chron = (x: ModelMatch, y: ModelMatch) =>
  x.start.localeCompare(y.start) || ladder.indexOf(x.round) - ladder.indexOf(y.round) || (x.num ?? 0) - (y.num ?? 0) || x.id.localeCompare(y.id);
const courtOf = (s: Surface): Court | null => (s === "clay" ? "clay" : s === "grass" ? "grass" : s === "hard" || s === "carpet" ? "hard" : null);
const round1 = (x: number) => Math.round(x * 10) / 10;
const round3 = (x: number) => Math.round(x * 1000) / 1000;
const round4 = (x: number) => Math.round(x * 10000) / 10000;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
/** Played to the end, at a regular event: what every model learns from */
const counted = (m: ModelMatch) => m.played && m.outcome === "completed" && !exhibitions.has(m.event);
const emptyCalibration = (): Calibration => Array.from({ length: 10 }, () => ({ n: 0, won: 0 }));
function calibrate(c: Calibration, p: number, favouriteWon: boolean) {
  const sure = Math.max(p, 1 - p);
  const bin = Math.min(9, Math.floor((sure - 0.5) * 20));
  c[bin].n++;
  if (favouriteWon === p >= 0.5) c[bin].won++;
}

/** Solves A·x = b by Gaussian elimination (A is small and well conditioned here) */
function solve(A: number[][], b: number[]) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
    [M[c], M[pivot]] = [M[pivot], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || !M[c][c]) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => (row[i] ? row[n] / row[i] : 0));
}

/** The standard errors from a coefficient covariance matrix's inverse: the square roots of its diagonal */
function standardErrors(information: number[][], scale = 1) {
  return information.map((_, j) => {
    const unit = information.map((__, i) => (i === j ? 1 : 0));
    return Math.sqrt(Math.max(0, solve(information, unit)[j] * scale));
  });
}

/**
 * Logistic regression by Newton's method: the coefficients that make y most likely given X, and their
 * standard errors (from the information matrix at the answer)
 */
function logistic(X: number[][], y: number[], weights?: number[]) {
  const k = X[0]?.length ?? 0;
  let beta = new Array<number>(k).fill(0);
  let H: number[][] = [];
  for (let iter = 0; iter < 25; iter++) {
    H = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    const g = new Array<number>(k).fill(0);
    for (let i = 0; i < X.length; i++) {
      const x = X[i];
      const p = sigmoid(x.reduce((s, v, j) => s + v * beta[j], 0));
      const n = weights?.[i] ?? 1; // y can be a share of n tries
      const w = n * p * (1 - p);
      for (let a = 0; a < k; a++) {
        g[a] += n * (y[i] - p) * x[a];
        for (let b = 0; b < k; b++) H[a][b] += w * x[a] * x[b];
      }
    }
    // A touch of ridge keeps a step defined when a column is nearly empty
    for (let a = 0; a < k; a++) H[a][a] += 1e-6;
    const step = solve(H, g);
    beta = beta.map((v, j) => v + step[j]);
    if (Math.max(...step.map(Math.abs)) < 1e-9) break;
  }
  return { beta, se: standardErrors(H) };
}

/** Least squares: the coefficients, their standard errors, and R² */
function ols(X: number[][], y: number[]) {
  const k = X[0]?.length ?? 0;
  const A = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b = new Array<number>(k).fill(0);
  for (let i = 0; i < X.length; i++) for (let a = 0; a < k; a++) {
    b[a] += X[i][a] * y[i];
    for (let c = 0; c < k; c++) A[a][c] += X[i][a] * X[i][c];
  }
  const beta = solve(A, b);
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  let ssr = 0;
  let sst = 0;
  X.forEach((x, i) => {
    const e = y[i] - x.reduce((s, v, j) => s + v * beta[j], 0);
    ssr += e * e;
    sst += (y[i] - mean) ** 2;
  });
  return { beta, se: standardErrors(A, ssr / Math.max(1, y.length - k)), r2: sst ? 1 - ssr / sst : 0 };
}

/** The lowest and highest of many numbers (spreading 100,000 into Math.min overflows the stack) */
const extent = (xs: number[]): [number, number] => xs.reduce<[number, number]>(([lo, hi], x) => [Math.min(lo, x), Math.max(hi, x)], [Infinity, -Infinity]);

/* ---------- Win chances: the rules the page and the models share ---------- */

/** The chance a player rated `a` beats one rated `b`, best of three */
export const eloChance = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/**
 * A best-of-three chance as best of five: find the chance of winning a set that gives it, then play five.
 * Elo learns from both lengths at once, so this is an estimate: longer matches favour the better player.
 */
export function bestOfFive(p3: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const s = (lo + hi) / 2;
    if (s * s * (3 - 2 * s) < p3) lo = s;
    else hi = s;
  }
  const s = (lo + hi) / 2;
  return s ** 3 * (10 - 15 * s + 6 * s * s);
}

/** A rating for one surface: `mix` of the surface's own, the rest overall (0.5 is what the page starts on) */
export const blend = (overall: number, surface: number, mix = 0.5) => overall * (1 - mix) + surface * mix;

/** The upsets model's chance that the better-ranked player wins */
export function upsetModelChance(c: UpsetModel["coef"], favRank: number, dogRank: number, court: CourtOrAll, bestOf: 3 | 5) {
  const gap = Math.log(Math.max(dogRank, favRank) / Math.min(dogRank, favRank));
  // "Any surface" uses the hard-court line, the most common surface
  return sigmoid(gap * (c.slope + (bestOf === 5 ? c.bo5 : 0) + (court === "clay" ? c.clay : 0) + (court === "grass" ? c.grass : 0)));
}

/** The serve model's chance of winning, given a serving line in % */
export function serveChance(c: ServeModel["fits"]["all"]["coef"], line: Record<ServeStat, number>) {
  return sigmoid(c.a + c.in1 * line.in1 + c.won1 * line.won1 + c.won2 * line.won2);
}

/* ---------- Building the models ---------- */

/** A rating's step: big while a player has few matches, settling as they play more (as FiveThirtyEight's) */
const kFactor = (n: number) => 250 / (n + 5) ** 0.4;
/** How much a match counts by its tournament: a Slam moves ratings most, a 250 least */
export const tierWeight: Record<Tier, number> = { slam: 1.75, finals: 1.3, olympics: 1.2, "1000": 1.2, "500": 1, "250": 0.8, team: 0.8, other: 0.8 };
const START = 1500;

export function buildModels(input: ModelsInput): AdvancedBooks {
  const all = [...input.matches].sort(chron);
  const games = all.filter(counted);
  const from = extent(all.map((m) => m.season))[0];

  const people: string[] = [];
  const index = new Map<string, number>();
  const idx = (key: string) => {
    let i = index.get(key);
    if (i === undefined) index.set(key, (i = people.push(key) - 1));
    return i;
  };

  const upsets = buildUpsets(games);
  const elo = buildElo(input, all, games, from, idx);
  const serve = buildServe(games, idx);
  const ages = buildAges(games, idx);
  const pressure = buildPressure(games, idx, input);
  // Who has been ranked in the top 10, of the players already named
  const ranked = new Set(all.flatMap((m) => [...(m.wr && m.wr <= 10 ? [m.w] : []), ...(m.lr && m.lr <= 10 ? [m.l] : [])]));
  const topTen = [...ranked].filter((k) => index.has(k)).map((k) => index.get(k)!);

  // Name everyone the page shows: a surname, or a full name where two clash
  const named = people.map((k) => input.players[k]).filter(Boolean);
  const shortCount = new Map<string, number>();
  for (const p of named) shortCount.set(p.short, (shortCount.get(p.short) ?? 0) + 1);
  const names: Record<string, string> = {};
  const full: Record<string, string> = {};
  for (const p of named) {
    names[p.key] = shortCount.get(p.short)! > 1 ? p.name : p.short;
    full[p.key] = p.name;
  }

  return { tour: input.tour, from, last: input.last, people, names, full, upsets, elo, serve, ages, pressure, topTen };
}

function buildUpsets(games: ModelMatch[]): UpsetModel {
  const size = courtsOrAll.length * BEST_OFS.length * BANDS.length * BANDS.length;
  const cells = { n: new Array<number>(size).fill(0), upsets: new Array<number>(size).fill(0), latest: new Array<string | null>(size).fill(null) };
  const X: number[][] = [];
  const y: number[] = [];
  let favWins = 0;
  for (const m of games) {
    if (!m.wr || !m.lr || m.wr === m.lr) continue;
    const court = courtOf(m.surface);
    if (!court) continue;
    const favWon = m.wr < m.lr;
    const fav = Math.min(m.wr, m.lr);
    const dog = Math.max(m.wr, m.lr);
    const gap = Math.log(dog / fav);
    X.push([gap, m.bestOf === 5 ? gap : 0, court === "clay" ? gap : 0, court === "grass" ? gap : 0]);
    y.push(favWon ? 1 : 0);
    if (favWon) favWins++;
    for (const c of ["all", court] as CourtOrAll[])
      for (const b of ["any", m.bestOf] as const) {
        const i = cellIndex(c, b, bandOf(fav), bandOf(dog));
        cells.n[i]++;
        if (!favWon) {
          cells.upsets[i]++;
          cells.latest[i] = m.id; // matches run in order, so the last one seen is the latest
        }
      }
  }
  // Best of five gets its own term only where a tour plays enough of it (the WTA hardly does)
  const fiveSets = X.filter((x) => x[1]).length > 1000;
  const fitted = logistic(fiveSets ? X : X.map(([g, , c, gr]) => [g, c, gr]), y);
  const spread = (v: number[]) => (fiveSets ? v : [v[0], 0, v[1], v[2]]);
  const [slope, bo5, clay, grass] = spread(fitted.beta);
  const coef = { slope: round3(slope), bo5: round3(bo5), clay: round3(clay), grass: round3(grass) };
  const [seSlope, seBo5, seClay, seGrass] = spread(fitted.se);
  const se = { slope: round4(seSlope), bo5: round4(seBo5), clay: round4(seClay), grass: round4(seGrass) };
  const calibration = emptyCalibration();
  let brier = 0;
  let logLoss = 0;
  X.forEach((x, i) => {
    const p = sigmoid(x[0] * coef.slope + x[1] * coef.bo5 + x[2] * coef.clay + x[3] * coef.grass);
    calibrate(calibration, p, y[i] === 1);
    brier += (y[i] - p) ** 2;
    logLoss -= Math.log(y[i] ? p : 1 - p);
  });
  return { n: X.length, coef, se, bo5: fiveSets, cells, calibration, accuracy: favWins / X.length, brier: round4(brier / X.length), logLoss: round4(logLoss / X.length) };
}

function buildElo(input: ModelsInput, all: ModelMatch[], games: ModelMatch[], from: number, idx: (k: string) => number) {
  type R = { elo: number; n: number; court: Record<Court, number>; courtN: Record<Court, number>; last: string };
  const ratings = new Map<string, R>();
  const get = (k: string) => {
    let r = ratings.get(k);
    if (!r) ratings.set(k, (r = { elo: START, n: 0, court: { hard: START, clay: START, grass: START }, courtN: { hard: 0, clay: 0, grass: 0 }, last: "" }));
    return r;
  };
  const shownFrom = from + 1; // the first season is a warm-up: everyone starts level, however good
  type Season = { season: number; w: number; l: number };
  const seasons = new Map<string, Season>(); // `${key}|${season}`
  const best = new Map<string, { elo: number; month: string }>();
  const ends = new Map<string, { elo: number; court: Record<Court, number>; courtN: Record<Court, number> }>();
  const peaks: EloModel["peaks"] = {};
  const months: string[] = [];
  const top: EloModel["top"] = { all: [], hard: [], clay: [], grass: [] };
  const calibration = emptyCalibration();
  let rated = 0;
  let right = 0;
  let brier = 0;
  let logLoss = 0;
  let ranked = 0;
  let rankRight = 0;

  const snapshotMonth = (month: string) => {
    // Active players only: a match in the last year, and enough matches for a settled rating
    const cutoff = `${String(Number(month.slice(0, 4)) - 1)}${month.slice(4)}`;
    const active = [...ratings].filter(([, r]) => r.last.slice(0, 7) > cutoff && r.n >= 20);
    months.push(month);
    for (const c of courtsOrAll) {
      const value = (r: R) => (c === "all" ? r.elo : r.court[c]);
      const pool = c === "all" ? active : active.filter(([, r]) => r.courtN[c] >= 10);
      top[c].push(
        pool
          .sort((a, b) => value(b[1]) - value(a[1]))
          .slice(0, 10)
          .map(([k, r]) => [idx(k), Math.round(value(r))]),
      );
    }
  };

  const gameIds = new Set(games.map((m) => m.id));
  let month = "";
  for (const m of all) {
    const at = m.start.slice(0, 7);
    if (at !== month) {
      if (month && Number(month.slice(0, 4)) >= shownFrom) snapshotMonth(month);
      month = at;
    }
    if (!gameIds.has(m.id)) continue;
    const court = courtOf(m.surface);

    const a = get(m.w);
    const b = get(m.l);
    // How sure the model was, before it learns from this match
    if (m.season >= shownFrom) {
      let p = court ? eloChance(blend(a.elo, a.court[court]), blend(b.elo, b.court[court])) : eloChance(a.elo, b.elo);
      if (m.bestOf === 5) p = p >= 0.5 ? bestOfFive(p) : 1 - bestOfFive(1 - p);
      calibrate(calibration, p, true);
      brier += (1 - p) ** 2;
      logLoss -= Math.log(p);
      rated++;
      if (p > 0.5) right++;
      if (m.wr && m.lr && m.wr !== m.lr) {
        ranked++;
        if (m.wr < m.lr) rankRight++;
      }
    }
    const e = eloChance(a.elo, b.elo);
    const weight = tierWeight[m.tier] ?? 1;
    const ka = weight * kFactor(a.n);
    const kb = weight * kFactor(b.n);
    a.elo += ka * (1 - e);
    b.elo -= kb * (1 - e);
    a.n++;
    b.n++;
    if (court) {
      const ec = eloChance(a.court[court], b.court[court]);
      a.court[court] += weight * kFactor(a.courtN[court]) * (1 - ec);
      b.court[court] -= weight * kFactor(b.courtN[court]) * (1 - ec);
      a.courtN[court]++;
      b.courtN[court]++;
    }
    for (const [k, r, won] of [
      [m.w, a, true],
      [m.l, b, false],
    ] as const) {
      r.last = m.start;
      const key = `${k}|${m.season}`;
      let row = seasons.get(key);
      if (!row) seasons.set(key, (row = { season: m.season, w: 0, l: 0 }));
      if (won) row.w++;
      else row.l++;
      if (m.season >= shownFrom && r.elo > (best.get(k)?.elo ?? 0)) best.set(k, { elo: Math.round(r.elo), month: at });
    }
    // Each row keeps the ratings after the player's latest match of the season: at the end, its last
    for (const [k, r] of [
      [m.w, a],
      [m.l, b],
    ] as const)
      ends.set(`${k}|${m.season}`, { elo: Math.round(r.elo), court: { hard: Math.round(r.court.hard), clay: Math.round(r.court.clay), grass: Math.round(r.court.grass) }, courtN: { ...r.courtN } });
  }
  if (month && Number(month.slice(0, 4)) >= shownFrom) snapshotMonth(month);

  // Seasons worth showing: players with 30 matches in all, seasons with 5
  const careers = new Map<string, number>();
  for (const [key, row] of seasons) careers.set(key.split("|")[0], (careers.get(key.split("|")[0]) ?? 0) + row.w + row.l);
  const kept: SeasonRow[] = [];
  for (const [key, row] of seasons) {
    const k = key.split("|")[0];
    if (row.season < shownFrom || careers.get(k)! < 30 || row.w + row.l < 5 || !input.players[k]) continue;
    const p = idx(k);
    const e = ends.get(key)!;
    kept.push([p, row.season, row.w, row.l, e.elo, e.court.hard, e.court.clay, e.court.grass, e.courtN.hard, e.courtN.clay, e.courtN.grass]);
    if (best.has(k)) peaks[p] = best.get(k)!;
  }
  kept.sort((x, y) => x[S.p] - y[S.p] || x[S.season] - y[S.season]);

  const elo: EloModel = {
    n: games.length,
    from: shownFrom,
    K: "the tournament's weight × 250 ÷ (matches played + 5)^0.4",
    seasons: kept,
    peaks,
    months,
    top,
    calibration,
    accuracy: right / rated,
    rankAccuracy: rankRight / ranked,
    brier: round4(brier / rated),
    logLoss: round4(logLoss / rated),
  };
  return elo;
}

function buildServe(games: ModelMatch[], idx: (k: string) => number): ServeModel {
  type Line = { k: string; season: number; court: Court | null; won: boolean; in1: number; won1: number; won2: number; svpt: number; first: number; firstWon: number; secondWon: number };
  const lines: Line[] = [];
  for (const m of games)
    for (const [k, st, won] of [
      [m.w, m.wst, true],
      [m.l, m.lst, false],
    ] as const) {
      if (!st) continue;
      const svpt = st[STAT.svpt];
      const first = st[STAT.in1];
      const second = svpt - first;
      // A side with too few points served, or numbers that don't add up, says little
      if (svpt < 30 || first <= 0 || second <= 0 || st[STAT.won1] > first || st[STAT.won2] > second) continue;
      lines.push({ k, season: m.season, court: courtOf(m.surface), won, in1: (first / svpt) * 100, won1: (st[STAT.won1] / first) * 100, won2: (st[STAT.won2] / second) * 100, svpt, first, firstWon: st[STAT.won1], secondWon: st[STAT.won2] });
    }

  const fits = {} as ServeModel["fits"];
  const bins = {} as ServeModel["bins"];
  for (const c of courtsOrAll) {
    const set = c === "all" ? lines : lines.filter((l) => l.court === c);
    const { beta: coef, se } = logistic(
      set.map((l) => [1, l.in1, l.won1, l.won2]),
      set.map((l) => (l.won ? 1 : 0)),
    );
    const named = { a: round3(coef[0]), in1: round3(coef[1]), won1: round3(coef[2]), won2: round3(coef[3]) };
    const errors = { a: round4(se[0]), in1: round4(se[1]), won1: round4(se[2]), won2: round4(se[3]) };
    let right = 0;
    for (const l of set) if (serveChance(named, l) > 0.5 === l.won) right++;
    const mean = (s: ServeStat) => round1(set.reduce((t, l) => t + l[s], 0) / set.length);
    fits[c] = { n: set.length, coef: named, se: errors, mean: { in1: mean("in1"), won1: mean("won1"), won2: mean("won2") }, accuracy: right / set.length };
    bins[c] = {} as Record<ServeStat, { n: number; won: number }[]>;
    for (const s of serveStats) {
      const [lo, hi] = serveRange[s];
      const row = Array.from({ length: (hi - lo) / 2 }, () => ({ n: 0, won: 0 }));
      for (const l of set) {
        const b = Math.floor((l[s] - lo) / 2);
        if (b < 0 || b >= row.length) continue;
        row[b].n++;
        if (l.won) row[b].won++;
      }
      bins[c][s] = row;
    }
  }

  // Each player's serving: totals over their matches with stats, as rates
  const totals = new Map<string, Map<CourtOrAll, { n: number; won: number; svpt: number; first: number; firstWon: number; secondWon: number }>>();
  for (const l of lines)
    for (const c of ["all", l.court].filter(Boolean) as CourtOrAll[]) {
      let p = totals.get(l.k);
      if (!p) totals.set(l.k, (p = new Map()));
      let t = p.get(c);
      if (!t) p.set(c, (t = { n: 0, won: 0, svpt: 0, first: 0, firstWon: 0, secondWon: 0 }));
      t.n++;
      if (l.won) t.won++;
      t.svpt += l.svpt;
      t.first += l.first;
      t.firstWon += l.firstWon;
      t.secondWon += l.secondWon;
    }
  const players: ServeModel["players"] = {};
  for (const [k, byCourt] of totals) {
    if ((byCourt.get("all")?.n ?? 0) < 20) continue;
    const row: ServeModel["players"][number] = {};
    for (const [c, t] of byCourt) {
      if (t.n < 20) continue;
      row[c] = [t.n, t.won, round1((t.first / t.svpt) * 100), round1((t.firstWon / t.first) * 100), round1((t.secondWon / (t.svpt - t.first)) * 100)];
    }
    players[idx(k)] = row;
  }
  return { fits, bins, players, years: extent(lines.map((l) => l.season)) };
}

function buildAges(games: ModelMatch[], idx: (k: string) => number): AgeModel {
  const minMatches = 100;
  // Each player's record by whole years of age, per era, and in all
  const byPlayer = new Map<string, Map<number, { w: number; l: number; season: number }[]>>();
  for (const m of games)
    for (const [k, age, won] of [
      [m.w, m.wa, true],
      [m.l, m.la, false],
    ] as const) {
      if (age === null) continue;
      let p = byPlayer.get(k);
      if (!p) byPlayer.set(k, (p = new Map()));
      const a = Math.floor(age);
      let list = p.get(a);
      if (!list) p.set(a, (list = []));
      list.push({ w: won ? 1 : 0, l: won ? 0 : 1, season: m.season });
    }

  const eras = {} as AgeModel["eras"];
  for (const era of ageEras) {
    const [lo, hi] = era.seasons;
    // Per age: Σ w·d, Σ w·d², Σ w² over players (w their matches at that age, d their difference), for a
    // weighted mean and its standard error
    const sum = new Map<number, { diff: number; sq: number; w2: number; matches: number; players: number }>();
    let players = 0;
    for (const [, ages] of byPlayer) {
      const inEra = [...ages].map(([a, list]) => [a, list.filter((x) => x.season >= lo && x.season <= hi)] as const).filter(([, list]) => list.length);
      const n = inEra.reduce((t, [, list]) => t + list.length, 0);
      if (n < minMatches) continue;
      players++;
      const career = inEra.reduce((t, [, list]) => t + list.reduce((s, x) => s + x.w, 0), 0) / n;
      for (const [a, list] of inEra) {
        const w = list.reduce((s, x) => s + x.w, 0);
        const s = sum.get(a) ?? { diff: 0, sq: 0, w2: 0, matches: 0, players: 0 };
        const d = w / list.length - career;
        s.diff += d * list.length;
        s.sq += d * d * list.length;
        s.w2 += list.length ** 2;
        s.matches += list.length;
        s.players++;
        sum.set(a, s);
      }
    }
    const ages = [...sum]
      .filter(([, s]) => s.players >= 10)
      .sort((x, y) => x[0] - y[0])
      .map(([age, s]) => {
        const mean = s.diff / s.matches;
        const variance = Math.max(0, s.sq / s.matches - mean * mean);
        const effective = (s.matches * s.matches) / s.w2; // how many equally weighted players it's worth
        return { age, diff: round1(mean * 100), se: round1(Math.sqrt(variance / effective) * 100), players: s.players, matches: s.matches };
      });
    // A curve through it: diff = a + b·age + c·age², weighted by matches
    const X: number[][] = [];
    const y: number[] = [];
    for (const a of ages) {
      const weight = Math.sqrt(a.matches);
      X.push([weight, weight * a.age, weight * a.age * a.age]);
      y.push(weight * a.diff);
    }
    const { beta } = ols(X, y);
    const fit: [number, number, number] = [round3(beta[0]), round3(beta[1]), Math.round(beta[2] * 1e5) / 1e5];
    eras[era.id] = { ages, fit, peak: fit[2] < 0 ? round1(-fit[1] / (2 * fit[2])) : NaN, players };
  }
  const players: AgeModel["players"] = {};
  for (const [k, ages] of byPlayer) {
    const list = [...ages].sort((x, y) => x[0] - y[0]).map(([a, l]): [number, number, number] => [a, l.reduce((t, x) => t + x.w, 0), l.reduce((t, x) => t + x.l, 0)]);
    if (list.reduce((t, [, w, l]) => t + w + l, 0) >= minMatches) players[idx(k)] = list;
  }
  return { minMatches, eras, players };
}

/**
 * The big points. For every chance (a break point faced or held, a tiebreak, a deciding set) the baseline
 * is how the player played in that same match: serve points won for break points faced, return points won
 * for break points held, all points won for tiebreaks and deciding sets. A logistic regression across the
 * tour turns a baseline into the share of chances a player like that wins; a player's edge is what they won
 * against what that curve expects. Splitting seasons into even and odd asks whether the edge lasts.
 */
function buildPressure(games: ModelMatch[], idx: (k: string) => number, input: ModelsInput): PressureModel {
  // One chance, or a run of them in a match: whose, how many, how many won, and the baseline (a share)
  type Chance = { k: string; season: number; n: number; won: number; base: number; fit: boolean };
  const chances: Record<PressureMeasure, Chance[]> = { saved: [], converted: [], tiebreaks: [], deciders: [] };
  const sound = (st: number[] | null): st is number[] =>
    !!st && st.length > STAT.bpFaced && st[STAT.svpt] >= 30 && st[STAT.won1] <= st[STAT.in1] && st[STAT.won2] <= st[STAT.svpt] - st[STAT.in1] && st[STAT.bpSaved] <= st[STAT.bpFaced];
  const servedWon = (st: number[]) => (st[STAT.won1] + st[STAT.won2]) / st[STAT.svpt];
  const years: [number, number] = [Infinity, -Infinity];
  for (const m of games) {
    if (!sound(m.wst) || !sound(m.lst)) continue;
    years[0] = Math.min(years[0], m.season);
    years[1] = Math.max(years[1], m.season);
    const sides = [
      { k: m.w, me: m.wst, them: m.lst, won: true },
      { k: m.l, me: m.lst, them: m.wst, won: false },
    ];
    const total = m.wst[STAT.svpt] + m.lst[STAT.svpt];
    // Tiebreaks and deciding sets are one event seen from two sides: the regression takes one side of each
    // (whoever's key sorts first), so a tiebreak isn't counted twice; the players' tallies take both
    const first = m.w < m.l ? m.w : m.l;
    const sets = parseScore(m.score).sets.filter((x) => !x.super);
    for (const side of sides) {
      const spw = servedWon(side.me);
      const rpw = 1 - servedWon(side.them);
      const points = (side.me[STAT.won1] + side.me[STAT.won2] + side.them[STAT.svpt] - side.them[STAT.won1] - side.them[STAT.won2]) / total;
      const faced = side.me[STAT.bpFaced];
      if (faced) chances.saved.push({ k: side.k, season: m.season, n: faced, won: side.me[STAT.bpSaved], base: spw, fit: true });
      const had = side.them[STAT.bpFaced];
      if (had) chances.converted.push({ k: side.k, season: m.season, n: had, won: had - side.them[STAT.bpSaved], base: rpw, fit: true });
      const fit = side.k === first;
      for (const x of sets)
        if (x.tb !== null || (Math.abs(x.w - x.l) === 1 && Math.max(x.w, x.l) >= 7))
          chances.tiebreaks.push({ k: side.k, season: m.season, n: 1, won: x.w > x.l === side.won ? 1 : 0, base: points, fit });
      if (sets.length === m.bestOf) chances.deciders.push({ k: side.k, season: m.season, n: 1, won: side.won ? 1 : 0, base: points, fit });
    }
  }

  const logit = (x: number) => {
    const c = Math.min(0.98, Math.max(0.02, x));
    return Math.log(c / (1 - c));
  };
  const mins: Record<PressureMeasure, number> = { saved: 300, converted: 300, tiebreaks: 60, deciders: 50 };
  const pearson = (pairs: [number, number][]) => {
    const n = pairs.length;
    const mx = pairs.reduce((t, [x]) => t + x, 0) / n;
    const my = pairs.reduce((t, [, y]) => t + y, 0) / n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (const [x, y] of pairs) {
      sxy += (x - mx) * (y - my);
      sxx += (x - mx) ** 2;
      syy += (y - my) ** 2;
    }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  };

  const model = {} as PressureModel;
  for (const measure of pressureMeasures) {
    const list = chances[measure];
    const fitted = list.filter((c) => c.fit);
    const { beta, se } = logistic(
      fitted.map((c) => [1, logit(c.base)]),
      fitted.map((c) => c.won / c.n),
      fitted.map((c) => c.n),
    );
    const coef = { a: round4(beta[0]), b: round4(beta[1]) };
    const expect = (c: Chance) => c.n * sigmoid(coef.a + coef.b * logit(c.base));

    // Each player's tallies, in all and by even and odd seasons
    const tally = new Map<string, number[]>();
    let n = 0;
    let won = 0;
    let base = 0;
    for (const c of list) {
      if (c.fit) {
        n += c.n;
        won += c.won;
        base += c.base * c.n;
      }
      let t = tally.get(c.k);
      if (!t) tally.set(c.k, (t = new Array<number>(10).fill(0)));
      const e = expect(c);
      t[P.n] += c.n;
      t[P.won] += c.won;
      t[P.exp] += e;
      t[P.base] += c.base * c.n;
      const h = c.season % 2 === 0 ? P.nEven : P.nOdd;
      t[h] += c.n;
      t[h + 1] += c.won;
      t[h + 2] += e;
    }
    const players: Record<number, number[]> = {};
    const halves: [number, number][] = [];
    const baseHalves: [number, number][] = [];
    for (const [k, t] of tally) {
      if (t[P.n] < mins[measure] || !input.players[k]) continue;
      players[idx(k)] = [t[P.n], t[P.won], round1(t[P.exp]), round1((t[P.base] / t[P.n]) * 100), t[P.nEven], t[P.wonEven], round1(t[P.expEven]), t[P.nOdd], t[P.wonOdd], round1(t[P.expOdd])];
      // Enough in both halves to compare them
      if (t[P.nEven] >= mins[measure] / 3 && t[P.nOdd] >= mins[measure] / 3) {
        halves.push([(t[P.wonEven] - t[P.expEven]) / t[P.nEven], (t[P.wonOdd] - t[P.expOdd]) / t[P.nOdd]]);
      }
    }
    // The baseline's own halves, for comparison: how steady a real skill looks
    const baseByHalf = new Map<string, [number, number, number, number]>();
    for (const c of list) {
      let b = baseByHalf.get(c.k);
      if (!b) baseByHalf.set(c.k, (b = [0, 0, 0, 0]));
      const h = c.season % 2 === 0 ? 0 : 2;
      b[h] += c.base * c.n;
      b[h + 1] += c.n;
    }
    for (const [k, b] of baseByHalf) {
      const t = tally.get(k)!;
      if (t[P.n] >= mins[measure] && t[P.nEven] >= mins[measure] / 3 && t[P.nOdd] >= mins[measure] / 3) baseHalves.push([b[0] / b[1], b[2] / b[3]]);
    }
    const r = pearson(halves);
    const z = Math.atanh(Math.max(-0.999, Math.min(0.999, r)));
    const width = 1.96 / Math.sqrt(Math.max(1, halves.length - 3));
    model[measure] = {
      n,
      rate: round4(won / n),
      base: round1((base / n) * 100),
      coef,
      se: { a: round4(se[0]), b: round4(se[1]) },
      min: mins[measure],
      players,
      halves: { r: round3(r), lo: round3(Math.tanh(z - width)), hi: round3(Math.tanh(z + width)), players: halves.length, baseR: round3(pearson(baseHalves)) },
      years,
    };
  }
  return model;
}
