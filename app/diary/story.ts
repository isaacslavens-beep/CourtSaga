// The story around one match, told from the whole record rather than a fan's log: the two players'
// head-to-head, their history at the tournament, their seasons, the draw, the match's own numbers, and
// what came after. Like the saga's books (books.ts), every line comes from fixed rules over the data, so
// a match always reads the same; but which lines a match gets, and in what order, depends on what is
// unusual about it. Dozens of rules each look for one kind of story and say how remarkable it is (its
// weight, from how rare or how big it was, against the event's own past and every match like it since
// the data begins). The heaviest lines lead, each thread keeps its best few, and the rest are dropped.

import { parseScore, slams, displayNames, type Outcome, type Player, type Round, type Surface, type Tier, type Tour } from "./library";

/* ---------- What the engine reads ---------- */

/** A match from the data, as the story reads it. Players are keys ("atp:D643"). */
export type Played = {
  id: string;
  tour: Tour;
  tourneyId: string;
  event: string; // without the year
  season: number;
  date: string; // "YYYY-MM-DD", estimated from the start date and the round
  round: Round;
  tier: Tier;
  surface: Surface;
  stage: string | null;
  w: string;
  l: string;
  score: string;
  bestOf: 3 | 5;
  outcome: Outcome;
  minutes: number | null;
  ws: number | null; // seeds
  ls: number | null;
  we: string | null; // entries: Q, WC, LL, PR, ...
  le: string | null;
  wr: number | null; // rankings
  lr: number | null;
  wa: number | null; // ages
  la: number | null;
  wst: number[] | null; // serve stats, see STAT
  lst: number[] | null;
};

export type PlayerInfo = Player & { hand: string | null; height: number | null };

export type StoryInput = {
  focus: Played;
  players: Record<string, PlayerInfo>;
  careers: Record<string, Played[]>; // every match of both players, walkovers included
  draw: Played[]; // the whole tournament
  event: Played[]; // every match at this event on this tour, every year
  peers: Played[]; // every match at this tier and round on this tour, every year
  from: number; // the first season in the data
  last: string; // the latest date in the data
};

// Where each serve stat sits in a side's array
const STAT = { ace: 0, df: 1, svpt: 2, in1: 3, won1: 4, won2: 5, games: 6, bpSaved: 7, bpFaced: 8 } as const;

/* ---------- What it tells ---------- */

/** A line's text, with links to other matches in it */
export type Part = string | { ref: string; text: string };
export type ThreadId = "match" | "h2h" | "event" | "season" | "draw" | "after";
export type Fact = { key: string; thread: ThreadId; parts: Part[]; weight: number; side?: "a" | "b" };

export type Ref = { id: string; label: string; w: string; l: string; score: string; surface: Surface; event: string };

export type H2HVisual = {
  kind: "h2h";
  meetings: { id: string; year: number; label: string; surface: Surface; winner: "a" | "b"; focus: boolean; big: boolean }[];
};
export type EventVisual = {
  kind: "event";
  seasons: number[];
  rows: { side: "a" | "b"; cells: ({ result: string; id: string; won: boolean } | null)[]; record: [number, number]; titles: number }[];
};
export type SeasonVisual = {
  kind: "season";
  rows: {
    side: "a" | "b";
    record: [number, number];
    events: { event: string; tier: Tier; surface: Surface; result: string; matches: { id: string; won: boolean; focus: boolean; opp: string }[] }[];
  }[];
};
export type DrawVisual = {
  kind: "draw";
  paths: { side: "a" | "b"; steps: { id: string; round: Round; opp: string; oppSeed: number | null; won: boolean; score: string; focus: boolean }[] }[];
  champion: string | null;
};
export type StatsVisual = { kind: "stats"; rows: { label: string; a: string; b: string; lead: "a" | "b" | null }[] };
export type Visual = H2HVisual | EventVisual | SeasonVisual | DrawVisual | StatsVisual;

export type Thread = { id: ThreadId; title: string; kicker: string; facts: Fact[]; weight: number; visual: Visual | null };

export type StorySide = {
  key: string;
  name: string; // full name
  ioc: string | null;
  seed: number | null;
  entry: string | null;
  rank: number | null;
  age: number | null;
  hand: string | null;
  height: number | null;
};

export type Story = {
  id: string;
  tour: Tour;
  event: string;
  season: number;
  date: string;
  round: Round;
  stage: string | null;
  tier: Tier;
  surface: Surface;
  score: string; // winner first, as the data has it
  bestOf: 3 | 5;
  minutes: number | null;
  a: StorySide; // the winner
  b: StorySide;
  names: Record<string, string>; // what to call everyone the story mentions, by key
  lede: Fact[];
  threads: Thread[];
  refs: Record<string, Ref>;
  trail: { ref: string; why: string }[]; // where to go next
};

/* ---------- Small helpers ---------- */

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
const numberWords = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => numberWords[n] ?? String(n);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
const nth = (n: number) => (n === 1 ? "" : n === 2 ? "second-" : n === 3 ? "third-" : `${ordinal(n)}-`);
const s = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ws = (n: number, one: string, many = `${one}s`) => `${word(n)} ${n === 1 ? one : many}`;
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${word(n)} times`);
/** "Wimbledon final" -> "Wimbledon finals", "match at Wimbledon" -> "matches at Wimbledon" */
const plural = (label: string) => (label.startsWith("match ") ? `matches${label.slice(5)}` : label.endsWith("match") ? `${label}es` : `${label}s`);
const record = (w: number, l: number) => `${w}–${l}`;
const hm = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`);
const months = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

const ladder: Round[] = ["RR", "R128", "R64", "R32", "R16", "QF", "SF", "BR", "3P", "F"];
const roundOrder = (r: Round) => ladder.indexOf(r);
/** How far a round is into a draw, so results compare across events with and without round robins */
const level: Record<Round, number> = { R128: 1, R64: 2, R32: 3, R16: 4, RR: 4.5, QF: 5, SF: 6, BR: 6.5, "3P": 6.5, F: 7 };
/** The round a win takes a player to */
const nextRounds: Record<Round, Round | "W"> = { R128: "R64", R64: "R32", R32: "R16", R16: "QF", QF: "SF", RR: "SF", SF: "F", BR: "W", "3P": "W", F: "W" };
const nextRound = (r: Round) => nextRounds[r];
const chron = (x: Played, y: Played) => x.date.localeCompare(y.date) || roundOrder(x.round) - roundOrder(y.round) || x.id.localeCompare(y.id);
const played = (m: Played) => m.outcome !== "walkover" && m.outcome !== "unplayed";
const opp = (m: Played, p: string) => (m.w === p ? m.l : m.w);
const isSlam = (m: { tier: Tier }) => m.tier === "slam";

const slamRoundNouns: Partial<Record<Round, string>> = { R128: "first round", R64: "second round", R32: "third round", R16: "fourth round" };
const roundNouns: Record<Round, string> = {
  R128: "round of 128",
  R64: "round of 64",
  R32: "round of 32",
  R16: "round of 16",
  QF: "quarterfinal",
  SF: "semifinal",
  F: "final",
  RR: "round robin",
  BR: "bronze medal match",
  "3P": "third-place match",
};
/** "final", "fourth round" */
const roundNoun = (m: { round: Round; tier: Tier }) => (isSlam(m) && slamRoundNouns[m.round]) || roundNouns[m.round];
/** A match in that round: "final", "fourth-round match" */
const roundMatch = (m: { round: Round; tier: Tier }) => {
  const n = roundNoun(m);
  return /final|match/.test(n) ? n : `${n.replace(/ /g, "-")} match`;
};
const resultCode: Record<Round, string> = { R128: "R128", R64: "R64", R32: "R32", R16: "R16", QF: "QF", SF: "SF", F: "F", RR: "RR", BR: "SF", "3P": "SF" };
const slamCodes: Partial<Record<Round, string>> = { R128: "1R", R64: "2R", R32: "3R", R16: "4R" };

/** "at Wimbledon", "at the US Open" */
const atEvent = (event: string) => (/^(US |the )|(Open|Finals|Cup|Trophy|Olympics|International|Championships|Classic|Games)$/.test(event) ? `at the ${event}` : `at ${event}`);
const theEvent = (event: string) => atEvent(event).slice(3);

const tierLabel = (tier: Tier, tour: Tour) =>
  ({ slam: "Slam", "1000": tour === "atp" ? "Masters 1000" : "WTA 1000", "500": tour === "atp" ? "ATP 500" : "WTA 500", "250": tour === "atp" ? "ATP 250" : "WTA 250", finals: "tour finals", olympics: "Olympic", team: "team", other: "tour" })[tier];

const surfaceWords: Record<Surface, string> = { clay: "clay", grass: "grass", hard: "hard courts", carpet: "carpet", unknown: "" };

const stakes: Record<Tier, number> = { slam: 1, finals: 0.8, olympics: 0.8, "1000": 0.7, "500": 0.55, "250": 0.45, team: 0.4, other: 0.35 };
const roundStakes: Record<Round, number> = { F: 1, SF: 0.85, BR: 0.7, QF: 0.7, RR: 0.6, R16: 0.55, "3P": 0.5, R32: 0.45, R64: 0.4, R128: 0.35 };
/** How much rides on a match, 0.12 (a 250's first round) to 1 (a Slam final) */
const stakeOf = (m: Played) => stakes[m.tier] * roundStakes[m.round];

/** Sets won by each side, and the order they came in */
function setsOf(m: Played) {
  const { sets, outcome } = parseScore(m.score);
  const done = outcome === "completed";
  const winners = sets.map((x, i) => (!done && i === sets.length - 1 ? null : x.w > x.l ? "w" : "l"));
  return { sets, done, winners };
}

/** Points each side won, when the data has serve stats */
function pointsOf(m: Played) {
  if (!m.wst || !m.lst) return null;
  const served = (st: number[]) => st[STAT.won1] + st[STAT.won2];
  const w = served(m.wst) + (m.lst[STAT.svpt] - served(m.lst));
  const l = served(m.lst) + (m.wst[STAT.svpt] - served(m.wst));
  return w > 0 && l > 0 ? { w, l } : null;
}

const gamesOf = (m: Played) => parseScore(m.score).sets.filter((x) => !x.super).reduce((a, x) => ({ w: a.w + x.w, l: a.l + x.l }), { w: 0, l: 0 });

/**
 * What players already active when the data begins had done at the Slams before it: [titles, finals].
 * With these, a Slam count for them is whole (Federer's first Slam was Wimbledon 2003, Agassi's 2003
 * Australian Open his 8th). Anyone active then who isn't listed gets no Slam firsts and counts say "since".
 */
const slamsBefore: Record<string, [titles: number, finals: number]> = {
  "atp:F324": [0, 0], // Federer
  "atp:R485": [0, 0], // Roddick
  "atp:A092": [7, 13], // Agassi
  "atp:H432": [2, 2], // Hewitt
  "atp:S741": [1, 2], // Safin
  "atp:K293": [3, 3], // Kuerten
  "atp:M605": [1, 2], // Moya
  "atp:F316": [0, 1], // Ferrero
  "atp:C378": [1, 1], // Costa
  "atp:J129": [1, 1], // Johansson
  "atp:I034": [1, 4], // Ivanisevic
  "atp:K267": [2, 3], // Kafelnikov
  "atp:P338": [0, 1], // Philippoussis
  "atp:N301": [0, 1], // Nalbandian
  "atp:C487": [0, 1], // Clement
  "atp:M442": [0, 2], // Martin
  "atp:C344": [0, 2], // Corretja
  "atp:N250": [0, 1], // Norman
  "atp:R286": [0, 1], // Rios
  "atp:C274": [1, 4], // Chang
  "atp:R237": [0, 1], // Rusedski
  "atp:K214": [1, 1], // Krajicek
  "atp:E113": [0, 1], // Enqvist
  "wta:200033": [4, 5], // Serena Williams
  "wta:200748": [4, 8], // Venus Williams
  "wta:200077": [3, 3], // Capriati
  "wta:200128": [3, 5], // Davenport
  "wta:200001": [5, 12], // Hingis
  "wta:200652": [9, 13], // Seles
  "wta:200003": [0, 1], // Henin
  "wta:200079": [0, 1], // Clijsters
  "wta:200065": [0, 1], // Mauresmo
  "wta:200096": [2, 4], // Pierce
  "wta:200049": [1, 3], // Martinez
};

/* ---------- Telling it ---------- */

export function tellStory(input: StoryInput): Story {
  const { focus: F, players, careers, from, last } = input;
  const A = F.w;
  const B = F.l;
  const stake = stakeOf(F);
  const facts: Fact[] = [];
  const refs: Record<string, Ref> = {};
  const trail: { ref: string; why: string; weight: number }[] = [];
  const say = (key: string, ...ways: string[]) => ways[hash(`${F.id}|${key}`) % ways.length];

  // Names go in as tokens and are settled at the end, once it's known who the story mentions
  const who = (key: string) => `\u0002${key}\u0003`;
  const side = (p: string): "a" | "b" => (p === A ? "a" : "b");
  const label = (m: Played) => `${m.event} ${m.season} · ${m.stage ?? cap(roundNoun(m))}`;
  const link = (m: Played, text = label(m)): Part => {
    refs[m.id] = { id: m.id, label: label(m), w: m.w, l: m.l, score: m.score, surface: m.surface, event: m.event };
    return { ref: m.id, text };
  };
  const add = (thread: ThreadId, key: string, weight: number, parts: Part[], about?: string) =>
    facts.push({ key, thread, weight, parts, ...(about && { side: side(about) }) });
  const follow = (m: Played, why: string, weight: number) => {
    if (m.id === F.id) return;
    link(m);
    trail.push({ ref: m.id, why, weight });
  };

  const careerOf = (p: string) => (careers[p] ?? []).filter(played).sort(chron);
  const allOf = (p: string) => [...(careers[p] ?? [])].sort(chron);
  const career = { [A]: careerOf(A), [B]: careerOf(B) };
  const at = (p: string) => career[p].findIndex((m) => m.id === F.id);
  // Whether the data holds a player's whole tour-level career: they first appear as a teenager, or
  // young after its first season (a 25-year-old first seen in 2005 is coming back, not starting out).
  // Otherwise "first" and "only" claims aren't safe.
  const whole = (p: string) => {
    const first = career[p][0];
    if (!first) return false;
    const age = first.w === p ? first.wa : first.la;
    if (age === null) return first.season > from + 1;
    return age < 19 || (first.season > from && age < 23);
  };
  // Slam titles and finals from before the data, when they're known: zero for a whole career
  const slamHistory = (p: string): [number, number] | null => (whole(p) ? [0, 0] : (slamsBefore[p] ?? null));
  // Whether a head-to-head is whole: it is if either player's career is
  const h2hWhole = whole(A) || whole(B);
  const since = ` since ${from}`;
  // How much of the record comes after this match, in months
  const ahead = months(F.date, last);
  const rankOf = (m: Played, p: string) => (m.w === p ? m.wr : m.lr);
  const seedOf = (m: Played, p: string) => (m.w === p ? m.ws : m.ls);

  // Every year the event was held, from the data
  const editions = [...new Set(input.event.map((m) => m.season))].sort((x, y) => x - y);

  /* ---------- Superlatives: how this match stands among the event's and its peers' ---------- */

  type Pool = { label: string; rows: Played[] };
  const sameRound = (m: Played) => m.round === F.round || (level[m.round] === level[F.round] && m.round !== "RR" && F.round !== "RR");
  const pools: Pool[] = [
    { label: `${F.event} ${roundMatch(F)}`, rows: input.event.filter((m) => sameRound(m) && played(m)) },
    { label: `match ${atEvent(F.event)}`, rows: input.event.filter(played) },
    { label: `${tierLabel(F.tier, F.tour)} ${roundMatch(F)}`, rows: input.peers.filter(played) },
  ].filter((p) => p.rows.some((m) => m.id === F.id));

  /**
   * Where the match ranks on some measure (bigger is more remarkable) in each pool, framed the best
   * way: top of the biggest pool it tops, otherwise its best top-three finish. Null if it's not notable.
   */
  function best(measure: (m: Played) => number | null, minPool = 15) {
    const mine = measure(F);
    if (mine === null) return null;
    let pick: { pool: Pool; rank: number; n: number; other: Played | null } | null = null;
    for (const pool of pools) {
      const rows = pool.rows.filter((m) => measure(m) !== null);
      if (rows.length < minPool) continue;
      const above = rows.filter((m) => measure(m)! > mine);
      const rank = above.length + 1;
      // The match it beats, or the one it trails
      const others = rows.filter((m) => m.id !== F.id).sort((x, y) => measure(y)! - measure(x)! || chron(x, y));
      const other = rank === 1 ? (others[0] ?? null) : (above.sort((x, y) => measure(y)! - measure(x)!)[0] ?? null);
      const score = rank === 1 ? 10 + Math.log10(rows.length) : rank <= 3 ? 4 - rank + Math.log10(rows.length) / 2 : 0;
      const current = pick ? (pick.rank === 1 ? 10 + Math.log10(pick.n) : 4 - pick.rank + Math.log10(pick.n) / 2) : -1;
      if (score > 0 && score > current) pick = { pool, rank, n: rows.length, other };
    }
    return pick;
  }
  const bestWeight = (b: NonNullable<ReturnType<typeof best>>, top: number) => (b.rank === 1 ? top : top * (b.rank === 2 ? 0.6 : 0.45)) * (0.75 + Math.min(0.35, Math.log10(b.n) / 10));

  /* ---------- The match itself ---------- */

  const { sets, done, winners } = setsOf(F);
  const pts = pointsOf(F);

  // Rankings: an upset, a meeting of the top two
  if (F.wr && F.lr) {
    if (F.wr > F.lr && F.wr >= 2 * F.lr && F.lr <= 30 && !(F.wr === 2 && F.lr === 1)) {
      const gap = Math.log2(F.wr / F.lr);
      const w = (12 + 7 * gap) * (0.5 + stake) + (F.lr === 1 ? 12 : 0);
      add(
        "match",
        "upset",
        w,
        [
          F.lr === 1
            ? say("upset1", `Ranked No. ${F.wr}, ${who(A)} beat the world No. 1`, `${who(A)}, ranked No. ${F.wr}, took down the world No. 1`)
            : say("upset", `No. ${F.wr} beat No. ${F.lr}`, `${who(A)}, ranked No. ${F.wr}, beat the No. ${F.lr}`, `A No. ${F.wr} over a No. ${F.lr}`),
        ],
        A,
      );
      const low = best((m) => (m.wr && m.lr && m.wr > m.lr ? m.wr : null));
      if (low && low.rank === 1 && F.wr >= 20)
        add("match", "upset-best", bestWeight(low, 60 * (0.5 + stake)), [
          `The lowest-ranked winner of any ${low.pool.label}${since}`,
          ...(low.other ? [" (next: ", link(low.other, `No. ${low.other.wr} in ${low.other.season}`), ")"] : []),
        ]);
    }
    const top = [F.wr, F.lr].sort((x, y) => x - y);
    if (top[0] === 1 && top[1] === 2) {
      const n = pools[0]?.rows.filter((m) => [m.wr, m.lr].sort((x, y) => (x ?? 99) - (y ?? 99)).join() === "1,2" && m.date < F.date).length ?? 0;
      add("match", "top-two", 18 + 22 * stake, [
        say("top-two", "The world's top two, head to head", "No. 1 against No. 2"),
        ...(pools[0] && n === 0 && F.round === "F" ? [`: the first ${pools[0].label} between them${since}`] : []),
      ]);
    }
  }

  // How the players got into the draw
  const entryWords: Record<string, string> = { Q: "a qualifier", WC: "a wildcard", LL: "a lucky loser", PR: "on a protected ranking", ALT: "an alternate" };
  for (const p of [A, B]) {
    const entry = p === A ? F.we : F.le;
    const words = entry && entryWords[entry];
    if (!words || level[F.round] < 4) continue;
    const next = nextRound(F.round);
    const reached = p === A ? (next === "W" ? "won the title" : `reached the ${roundNoun({ round: next, tier: F.tier })}`) : `reached the ${roundNoun(F)}`;
    // Whether anyone who came in the same way had got as far before
    const asFar = (rows: Played[]) =>
      rows.filter((m) => m.date < F.date && (p === A ? (m.round === F.round && m.we === entry) : level[m.round] >= level[F.round] && (m.we === entry || m.le === entry))).length;
    const firstHere = F.season > from + 2 && asFar(input.event) === 0;
    const firstAny = firstHere && asFar(input.peers) === 0;
    add(
      "match",
      `entry-${p}`,
      (20 + 40 * roundStakes[F.round]) * (0.6 + stakes[F.tier] * 0.6) + (firstAny ? 15 : 0),
      [
        `${who(p)} came in as ${words} and ${reached}`,
        firstAny ? `, the first to do that at any ${tierLabel(F.tier, F.tour)}${since}` : firstHere ? `, the first to do that ${atEvent(F.event)}${since}` : "",
      ],
      p,
    );
  }

  // Comebacks
  if (done && winners[0] === "l") {
    const twoDown = F.bestOf === 5 && winners[1] === "l";
    const bagel = sets[0].w === 0;
    if (twoDown || stake >= 0.45 || bagel) {
      const comeback = (m: Played) => {
        const x = setsOf(m);
        if (!x.done || x.winners[0] !== "l") return null;
        return twoDown ? (x.winners[1] === "l" ? 1 : null) : 1;
      };
      const rare = pools[0] ? pools[0].rows.filter((m) => comeback(m)).length : 0;
      const of = pools[0]?.rows.length ?? 0;
      const base = twoDown ? 30 + 35 * stake : bagel ? 22 + 20 * stake : 8 + 22 * stake;
      add(
        "match",
        "comeback",
        base + (of >= 15 && rare <= 3 ? 15 : 0),
        [
          twoDown
            ? say("comeback2", `${who(A)} came back from two sets down`, `Two sets down, ${who(A)} won it`)
            : bagel
              ? `${who(A)} lost the first set 0–${sets[0].l} and still won`
              : say("comeback1", `${who(A)} lost the first set and won`, `${who(A)} came from a set down`),
          ...(of >= 15 && rare <= 3 ? [`: ${rare === 1 ? `the only ${pools[0].label}` : `one of ${word(rare)} ${plural(pools[0].label)}`} won that way${since}`] : []),
        ],
        A,
      );
    }
  }

  // Length
  if (F.minutes && F.minutes > 30) {
    const long = best((m) => m.minutes);
    if (long && F.minutes >= 150) {
      add("match", "long", bestWeight(long, 55 + 30 * stake), [
        `${hm(F.minutes)}: the ${nth(long.rank)}longest ${long.pool.label}${since}`,
        ...(long.other ? [long.rank === 1 ? ". Next longest: " : ". Longest: ", link(long.other, `${long.other.season}, ${hm(long.other.minutes!)}`)] : []),
      ]);
    } else if (F.round === "F" || F.round === "SF") {
      const short = best((m) => (m.minutes && setsOf(m).done ? -m.minutes : null));
      if (short && short.rank === 1)
        add("match", "short", bestWeight(short, 35 + 20 * stake), [`Over in ${hm(F.minutes)}: the shortest ${short.pool.label}${since}`]);
    }
  }

  // The deciding set
  const decider = sets[sets.length - 1];
  if (done && sets.length === F.bestOf && decider && !decider.super && decider.w + decider.l > 14) {
    const games = decider.w + decider.l;
    const longest = best((m) => {
      const x = setsOf(m);
      const d = x.sets[x.sets.length - 1];
      return x.done && x.sets.length === m.bestOf && d && !d.super ? d.w + d.l : null;
    });
    add("match", "decider", 14 + Math.min(40, (games - 14) * 3) + (longest?.rank === 1 ? 15 : 0) * (0.5 + stake), [
      `The ${F.bestOf === 5 ? "fifth" : "third"} set alone went to ${decider.w}–${decider.l}`,
      ...(longest?.rank === 1 ? [`, the longest decider in any ${longest.pool.label}${since}`] : []),
    ]);
  }

  // One-sided
  if (done && (F.round === "F" || F.round === "SF")) {
    const g = gamesOf(F);
    const lopsided = best((m) => (setsOf(m).done ? -gamesOf(m).l * (5 / m.bestOf) : null));
    if (lopsided && lopsided.rank === 1 && g.l <= (F.bestOf === 5 ? 9 : 5))
      add("match", "rout", bestWeight(lopsided, 35 + 25 * stake), [`${who(B)} won ${s(g.l, "game")}: the most one-sided ${lopsided.pool.label}${since}`], A);
  }

  // Points: winning more and losing
  if (pts && pts.l > pts.w && done) {
    add("match", "points", 18 + 30 * stake + Math.min(10, pts.l - pts.w), [
      say("points", `${who(B)} won more points, ${pts.l} to ${pts.w}, and lost`, `${who(B)} lost despite winning more points (${pts.l}–${pts.w})`),
    ]);
  } else if (pts && done && pts.w / (pts.w + pts.l) > 0.62 && stake >= 0.5) {
    add("match", "points", 10 + 15 * stake, [`${who(A)} won ${Math.round((100 * pts.w) / (pts.w + pts.l))}% of the points`], A);
  }

  // Break points
  if (F.wst && F.lst) {
    const saved = F.wst[STAT.bpSaved];
    const faced = F.wst[STAT.bpFaced];
    if (faced >= 8 && saved / faced >= 0.75)
      add("match", "bp-saved", 10 + saved * 1.4 + 15 * stake, [`${who(A)} saved ${saved} of ${faced} break points`], A);
    else if (faced === 0 && F.wst[STAT.games] >= 10) add("match", "bp-none", 12 + 25 * stake, [`${who(A)} never faced a break point`], A);
    const lFaced = F.lst[STAT.bpFaced];
    if (faced > lFaced + 4 && done) add("match", "bp-more", 10 + 12 * stake, [`${who(A)} faced ${faced} break points to ${who(B)}'s ${lFaced}, and won`], A);
    // Aces
    const aces = Math.max(F.wst[STAT.ace], F.lst[STAT.ace]);
    const hitter = F.wst[STAT.ace] >= F.lst[STAT.ace] ? A : B;
    const most = best((m) => (m.wst && m.lst ? Math.max(m.wst[STAT.ace], m.lst[STAT.ace]) : null), 30);
    if (most && aces >= 20)
      add("match", "aces", bestWeight(most, 45), [
        `${who(hitter)} served ${aces} aces, the ${nth(most.rank)}most in any ${most.pool.label}${since}`,
        ...(hitter === B ? [", and lost"] : []),
      ]);
    else if (aces >= 25) add("match", "aces", 10 + aces / 3, [`${who(hitter)} served ${aces} aces${hitter === B ? " and still lost" : ""}`], hitter);
  }

  // Age
  const [aAge, bAge] = [F.wa, F.la];
  if (aAge && bAge) {
    const gap = Math.abs(aAge - bAge);
    if (gap >= 9) add("match", "age-gap", 6 + gap, [`${Math.floor(gap)} years between them: ${who(A)} ${Math.floor(aAge)}, ${who(B)} ${Math.floor(bAge)}`]);
    if (F.round === "F" || stake >= 0.6) {
      const young = best((m) => (m.wa && sameRound(m) ? -m.wa : null), 20);
      const old = best((m) => (m.wa && sameRound(m) ? m.wa : null), 20);
      // "the youngest US Open champion", "the oldest winner of a Slam semifinal"
      const title = (b: NonNullable<typeof young>) =>
        F.round === "F" ? `${b.pool.label.replace(/ final$/, "")} champion` : `winner of a ${b.pool.label}`;
      if (young?.rank === 1) add("match", "young", bestWeight(young, 30 + 30 * stake), [`At ${Math.floor(aAge)}, ${who(A)} was the youngest ${title(young)}${since}`], A);
      else if (old?.rank === 1) add("match", "old", bestWeight(old, 30 + 30 * stake), [`At ${Math.floor(aAge)}, ${who(A)} was the oldest ${title(old)}${since}`], A);
    }
  }

  // Lefties and heights, for a match with little else to say
  const pa = players[A];
  const pb = players[B];
  if (pa?.hand === "L" && pb?.hand === "L") add("match", "lefties", 5, ["Two left-handers"]);
  if (pa?.height && pb?.height && Math.abs(pa.height - pb.height) >= 20) {
    const [tall, short] = pa.height > pb.height ? [A, B] : [B, A];
    add("match", "height", 6, [`${who(tall)} stood ${Math.abs(pa.height - pb.height)} cm taller than ${who(short)}`]);
  }

  // How it ended
  if (parseScore(F.score).outcome === "retired" && stake >= 0.5) {
    const n = pools[0]?.rows.filter((m) => parseScore(m.score).outcome === "retired").length ?? 0;
    add("match", "retired", 10 + 20 * stake, [`${who(B)} retired`, ...(n <= 3 && pools[0] && pools[0].rows.length >= 15 ? [`, ${n === 1 ? `the only ${pools[0].label}` : `one of ${word(n)} ${plural(pools[0].label)}`} to end that way${since}`] : [])], B);
  }

  // Tiebreaks
  const tiebreaks = sets.filter((x) => (x.w === 7 && x.l === 6) || (x.w === 6 && x.l === 7)).length;
  if (tiebreaks >= 3) add("match", "tiebreaks", 8 + 4 * tiebreaks + 10 * stake, [`${cap(word(tiebreaks))} tiebreaks`]);

  /* ---------- Head to head ---------- */

  const meetings = career[A].filter((m) => opp(m, A) === B);
  const k = meetings.findIndex((m) => m.id === F.id);
  const before = meetings.slice(0, k);
  const after = meetings.slice(k + 1);
  const winsOf = (xs: Played[], p: string) => xs.filter((m) => m.w === p).length;
  const [ab, bb] = [winsOf(before, A), winsOf(before, B)];
  const [aa, ba] = [ab + 1, bb];
  const total = meetings.length;
  const lead = (x: number, y: number) => (x === y ? null : x > y ? A : B);
  const standing = (x: number, y: number) => (x === y ? `level at ${record(x, y)}` : `${who(x > y ? A : B)} ${x > y ? "led" : "led"} ${record(Math.max(x, y), Math.min(x, y))}`);

  // Counts and firsts in a head-to-head that began before the data say so, or aren't claimed
  const hs = h2hWhole ? "" : since;
  if (total === 1 && !h2hWhole) {
    add("h2h", "only", 3, [`Their only meeting${since}`]);
  } else if (total === 1) {
    add("h2h", "only", ahead > 12 ? 10 : 4, [ahead > 12 ? say("only", "Their only meeting", "The only time they met") : "Their first meeting"]);
  } else {
    if (k === 0 && !h2hWhole) {
      // Their first meeting in the data, not necessarily their first
    } else if (k === 0)
      add("h2h", "first", 14 + Math.min(36, total * 1.5), [
        say("first", "Their first meeting", "Where it began"),
        `. ${cap(word(total - 1))} more would follow`,
        ...(after.length ? [": the next, ", link(after[0])] : []),
      ]);
    else if (k === total - 1 && ahead >= 12)
      add("h2h", "last", 10 + Math.min(30, total * 1.2), [h2hWhole ? `Their last meeting, the ${ordinal(total)}. They haven't met since` : "Their last meeting. They never met again"]);
    else add("h2h", "nth", 4 + Math.min(10, total / 3), [`Before it, ${standing(ab, bb)}${hs && ` in meetings${since}`}`]);

    // Leads changing hands
    const was = lead(ab, bb);
    const now = lead(aa, ba);
    if (k > 0 && was !== now && h2hWhole) {
      const everLed = before.some((_, i) => {
        const x = winsOf(before.slice(0, i + 1), A);
        return x > i + 1 - x;
      });
      if (!now) add("h2h", "level", 14 + Math.min(20, k), [`Levelled the head-to-head at ${record(aa, ba)}`], A);
      else add("h2h", "ahead", (everLed ? 18 : 30) + Math.min(20, k), [everLed ? `Put ${who(A)} back in front, ${record(aa, ba)}` : `Put ${who(A)} ahead for the first time, ${record(aa, ba)}`], A);
    }

    // Runs
    let bRun = 0;
    for (let i = before.length - 1; i >= 0 && before[i].w === B; i--) bRun++;
    let aRun = 1;
    for (let i = before.length - 1; i >= 0 && before[i].w === A; i--) aRun++;
    // A run that goes back to the first meeting in the data may go back further
    const fromStart = (n: number) => !h2hWhole && n >= before.length;
    if (bRun >= 3 && !fromStart(bRun)) add("h2h", "run-ended", 16 + bRun * 4, [`Ended ${who(B)}'s run of ${bRun} straight wins over ${who(A)}`], A);
    if (aRun >= 4 && !fromStart(aRun - 1)) add("h2h", "run", 6 + aRun * 2.5, [`${who(A)}'s ${ordinal(aRun)} straight win over ${who(B)}`], A);
    if (ab === 0 && k >= 3 && h2hWhole) add("h2h", "first-win", 26 + k * 3, [`${who(A)}'s first win over ${who(B)}, at the ${ordinal(k + 1)} attempt`], A);

    // Surfaces
    if (F.surface !== "unknown" && h2hWhole) {
      const onIt = before.filter((m) => m.surface === F.surface);
      const [ao, bo] = [winsOf(onIt, A), winsOf(onIt, B)];
      if (k > 0 && !onIt.length) add("h2h", "surface-first", 12 + Math.min(10, k), [`Their first meeting on ${surfaceWords[F.surface]}, at the ${ordinal(k + 1)} time of asking`]);
      else if (ao === 0 && bo >= 3) add("h2h", "surface-win", 24 + bo * 3, [`${who(A)}'s first win over ${who(B)} on ${surfaceWords[F.surface]}, after ${record(0, bo)}`], A);
      else if (bo === 0 && ao >= 3) add("h2h", "surface-own", 8 + ao * 2, [`${who(A)} now ${record(ao + 1, 0)} against ${who(B)} on ${surfaceWords[F.surface]}`], A);
    }

    // At this event, and in finals
    const here = meetings.filter((m) => m.event === F.event);
    const hk = here.findIndex((m) => m.id === F.id);
    if (here.length >= 3 && F.tier !== "team")
    {
      const [ha, hb] = [winsOf(here, A), winsOf(here, B)];
      add("h2h", "here", 6 + here.length * 2.5 + 8 * stakes[F.tier], [
        `Their ${ordinal(hk + 1)} of ${here.length} meetings ${atEvent(F.event)}${hs}, where ${ha === hb ? `they split ${record(ha, hb)}` : `${who(ha > hb ? A : B)} won ${record(Math.max(ha, hb), Math.min(ha, hb))}`}`,
      ]);
    }
    const finals = meetings.filter((m) => m.round === "F");
    if (F.round === "F" && finals.length >= 3) {
      const fk = finals.findIndex((m) => m.id === F.id);
      add("h2h", "finals", 8 + Math.min(22, finals.length), [fk === finals.length - 1 && ahead >= 12 ? `Their ${ordinal(fk + 1)} final${hs}, and their last` : `Their ${ordinal(fk + 1)} final of ${finals.length}${hs}`]);
    }

    // A rematch of an earlier final, or of last year's
    const rematch = before.filter((m) => m.event === F.event && m.round === F.round && level[F.round] >= 6).pop();
    if (rematch && F.tier !== "team") {
      const lastYear = rematch.season === editions[editions.indexOf(F.season) - 1];
      add("h2h", "rematch", 16 + (lastYear ? 10 : 0) + 14 * stake + (rematch.w !== A ? 6 : 0), [
        lastYear ? `A rematch of last year's ${roundNoun(F)}, ` : `A rematch of the `,
        link(rematch, lastYear ? `won by ${who(rematch.w)}` : `${rematch.season} ${roundNoun(F)}`),
        lastYear ? "" : `, won by ${who(rematch.w)}`,
        rematch.w !== A ? `. This time it went to ${who(A)}` : "",
      ]);
      follow(rematch, `The ${rematch.season} ${roundNoun(F)}`, 22);
    }

    // A long gap
    if (k > 0) {
      const gap = months(before[k - 1].date, F.date);
      if (gap >= 24) add("h2h", "gap", 10 + gap / 4, [`Their first meeting in ${s(Math.floor(gap / 12), "year")}, since `, link(before[k - 1])]);
    }

    // After it
    if (after.length) {
      follow(after[0], "Their next meeting", 30);
      if (k > 0) follow(before[k - 1], "Their meeting before", 18);
      const next = after[0];
      let run = 0;
      for (const m of after) {
        if (m.w !== after[0].w) break;
        run++;
      }
      const all = winsOf(after, A) === after.length;
      if (bb >= 2 && all && after.length >= 2)
        add("after", "never-again", 26 + after.length * 2, [`${who(B)} never beat ${who(A)} again: ${who(A)} won all ${word(after.length)} meetings after this`]);
      else if (run >= 3) add("after", "next-run", 14 + run * 2.5, [`${who(next.w)} won the next ${word(run)} meetings, starting at `, link(next)]);
      else add("after", "next", 10, [`They met next at `, link(next), `: ${who(next.w)} won`]);
      const [fa, fb] = [winsOf(meetings, A), winsOf(meetings, B)];
      add("h2h", "overall", 3, [fa === fb ? `All square at ${record(fa, fb)} over ${total} meetings` : `${who(fa > fb ? A : B)} leads ${record(Math.max(fa, fb), Math.min(fa, fb))} ${hs ? `in meetings${since}` : "overall"}`]);
    }
  }

  /* ---------- Each at this event ---------- */

  const eventRows = (p: string) => allOf(p).filter((m) => m.event === F.event && m.tier !== "team");
  type Edition = { season: number; last: Played; won: boolean; result: string; level: number };
  const editionsOf = (p: string): Edition[] => {
    const rows = eventRows(p);
    return [...new Set(rows.map((m) => m.season))].map((season) => {
      const these = rows.filter((m) => m.season === season);
      const lastMatch = these[these.length - 1];
      const champion = lastMatch.round === "F" && lastMatch.w === p;
      const code = champion ? "W" : (isSlam(lastMatch) && slamCodes[lastMatch.round]) || resultCode[lastMatch.round];
      return { season, last: lastMatch, won: champion, result: code, level: champion ? 8 : level[lastMatch.round] };
    });
  };

  if (F.tier !== "team") {
    for (const p of [A, B]) {
      const eds = editionsOf(p);
      const now = eds.findIndex((e) => e.season === F.season);
      if (now < 0) continue;
      const prior = eds.slice(0, now);
      const later = eds.slice(now + 1);
      const titlesBefore = prior.filter((e) => e.won).length;
      const next = nextRound(F.round);
      const reachedRound: Round | "W" = p === A ? next : F.round;
      const reached = reachedRound === "W" ? 8 : level[reachedRound];
      const stage = reachedRound === "W" ? "title" : roundNoun({ round: reachedRound, tier: F.tier });
      const bestBefore = Math.max(0, ...prior.map((e) => e.level));
      // Every appearance here is in the data only for a whole career; for a Slam, the titles are known
      // whenever the player's Slam titles are (none before the data means none here either)
      const isWhole = whole(p);
      const titlesKnown = isWhole || (isSlam(F) && slamHistory(p)?.[0] === 0);

      // Titles
      if (p === A && F.round === "F") {
        const n = titlesBefore + 1;
        const streakTitles = (() => {
          let c = 1;
          for (let i = prior.length - 1; i >= 0 && prior[i].won && prior[i].season === editions[editions.indexOf(prior[i + 1]?.season ?? F.season) - 1]; i--) c++;
          return c;
        })();
        if (streakTitles >= 3) add("event", "title-row", 30 + streakTitles * 6, [`${who(A)}'s ${ordinal(streakTitles)} ${F.event} title in a row`], A);
        else if (n > 1) add("event", "title-n", 14 + n * 4 + 10 * stakes[F.tier], [`${who(A)}'s ${ordinal(n)} ${F.event} title${titlesKnown ? "" : since}`], A);
        else if (prior.length >= 3 && isWhole)
          add("event", "title-first", 22 + prior.length * 2.5, [`${who(A)}'s first ${F.event} title, at the ${ordinal(prior.length + 1)} attempt`], A);
        else if (titlesKnown && !isWhole) add("event", "title-first", 18 + 10 * stakes[F.tier], [`${who(A)}'s first ${F.event} title`], A);
      }

      // Further than ever before
      if (isWhole && prior.length >= 3 && reached > bestBefore && !(p === A && F.round === "F") && reached >= 5) {
        add("event", `best-${p}`, 14 + prior.length * 2 + 15 * stakes[F.tier], [`${who(p)}'s first ${stage} ${atEvent(F.event)}, at the ${ordinal(prior.length + 1)} attempt`], p);
      }

      // The earliest exit yet
      if (p === B && prior.length >= 5 && level[F.round] <= 5 && prior.every((e) => e.level > level[F.round]))
        add("event", "earliest", 20 + prior.length * 1.5 + 12 * stakes[F.tier], [
          `${who(B)}'s earliest loss ${atEvent(F.event)}${isWhole ? "" : since}, after ${s(prior.length, "visit")}`,
        ], B);

      // Defending champion
      const prevEdition = editions[editions.indexOf(F.season) - 1];
      const defending = prior.length && prior[prior.length - 1].season === prevEdition && prior[prior.length - 1].won;
      if (defending) {
        if (p === B) add("event", "defending-out", 18 + 25 * stake * stakes[F.tier] + 10 * stakes[F.tier], [`${who(B)} came in as defending champion`], B);
        else if (F.round === "F") add("event", "defended", 14 + 14 * stakes[F.tier], [`${who(A)} defended the title`], A);
      }

      // Winning runs here
      const rowsHere = eventRows(p).filter(played);
      const idx = rowsHere.findIndex((m) => m.id === F.id);
      let run = 0;
      for (let i = idx - 1; i >= 0 && rowsHere[i].w === p; i--) run++;
      // A run that goes back to the first match in the data may have started earlier
      // so it's counted from the data's start, and says so
      const edge = !isWhole && run === idx ? since : "";
      if (p === B && run >= 8) add("event", "run-ended", 22 + run * 1.2 + 10 * stakes[F.tier], [`Ended ${who(B)}'s ${run}-match winning streak ${atEvent(F.event)}${edge}`], A);
      if (p === A && run + 1 >= 12) add("event", "run", 8 + run * 0.6, [`${who(A)}'s ${ordinal(run + 1)} straight win ${atEvent(F.event)}${edge}`], A);

      // What came of it here
      const futureEditions = editions.filter((e) => e > F.season).length;
      if (futureEditions >= 2 && ahead >= 18) {
        if (!later.length && career[p].length > at(p) + 5)
          add("after", `never-back-${p}`, 10 + 10 * stakes[F.tier], [`${who(p)} never played ${theEvent(F.event)} again`], p);
        else if (later.length >= 2 && reached >= 6 && reached < 8 && later.every((e) => e.level < reached) && level[F.round] >= 5)
          add("after", `never-again-${p}`, 14 + later.length * 2 + 12 * stakes[F.tier], [`${who(p)} never reached another ${F.event} ${stage}, in ${s(later.length, "more try", "more tries")}`], p);
        else if (p === A && F.round === "F" && later.length >= 3 && !later.some((e) => e.won))
          add("after", "never-won-again", 14 + later.length * 2, [`${who(A)} never won ${theEvent(F.event)} again, in ${s(later.length, "more try", "more tries")}`], A);
      }
      if (later.length && later[0].season === editions[editions.indexOf(F.season) + 1]) {
        const nextYear = later[0];
        if (p === A && F.round === "F" && nextYear.level <= 3)
          add("after", "next-year", 18 + 10 * stakes[F.tier], [`A year on, ${who(A)} came back as champion and lost in the ${roundNoun(nextYear.last)}, to ${who(opp(nextYear.last, A))}: `, link(nextYear.last)], A);
        if (p === B && level[F.round] >= 6 && nextYear.won) {
          add("after", "next-year-won", 22 + 12 * stakes[F.tier], [`A year later, ${who(B)} won it: `, link(nextYear.last)], B);
          follow(nextYear.last, `${F.event} a year later`, 20);
        }
      }
    }
  }

  /* ---------- Each player's season ---------- */

  const seasonOf = (p: string) => career[p].filter((m) => m.season === F.season);
  for (const p of [A, B]) {
    const year = seasonOf(p);
    const i = year.findIndex((m) => m.id === F.id);
    const before = year.slice(0, i);
    const after = year.slice(i + 1);
    const [w, l] = [winsOf(before, p), before.length - winsOf(before, p)];
    const won = p === A;
    // Streak coming in, across seasons
    const c = career[p];
    const ci = at(p);
    let streak = 0;
    for (let j = ci - 1; j >= 0 && c[j].w === p; j--) streak++;

    if (l === 0 && w >= 10) {
      if (won) add("season", `unbeaten-${p}`, 16 + w * 0.8, [`${who(p)} came in unbeaten in ${F.season}: ${record(w, 0)}`], p);
      else add("season", `first-loss-${p}`, 26 + w * 1.2, [`${who(p)}'s first loss of ${F.season}, after ${w} wins`], A);
    } else if (!won && streak >= 10) {
      // A streak that reaches back to the data's first match is counted from there
      const started = c[ci - streak];
      if (whole(p) || streak < ci) {
        add("season", `streak-ended-${p}`, 22 + streak * 1.1, [`Ended ${who(p)}'s ${streak}-match winning streak, which began at `, link(started)], A);
        follow(started, `Where ${who(p)}'s streak began`, 12);
      } else add("season", `streak-ended-${p}`, 20 + streak, [`Ended ${who(p)}'s ${streak}-match winning streak${since}`], A);
    } else if (won && streak + 1 >= 12) {
      add("season", `streak-${p}`, 8 + streak * 0.7, [`${who(p)}'s ${ordinal(streak + 1)} win in a row${whole(p) || streak < ci ? "" : since}`], p);
    }

    // Titles
    const titles = (xs: Played[]) => xs.filter((m) => m.round === "F" && m.w === p);
    const tBefore = titles(before).length;
    const tAll = titles(year).length;
    // The season as a whole, once the data has moved on past it
    const over = Number(last.slice(0, 4)) > F.season;
    if (won && F.round === "F" && (tAll >= 3 || tBefore >= 2))
      add("season", `titles-${p}`, 8 + tAll * 2.5, [`${who(p)}'s ${ordinal(tBefore + 1)} title of ${F.season}${over ? `, of ${tAll}` : ""}`], p);
    const [yw, yl] = [winsOf(year, p), year.length - winsOf(year, p)];
    if (over && year.length >= 25) {
      const seasons = [...new Set(c.map((m) => m.season))].map((y) => {
        const xs = c.filter((m) => m.season === y);
        return { y, n: xs.length, rate: winsOf(xs, p) / xs.length };
      });
      const rated = seasons.filter((x) => x.n >= 25).sort((x, y) => y.rate - x.rate);
      if (rated.length >= 4 && rated[0].y === F.season)
        add("season", `best-year-${p}`, 14 + yw / 6, [`${F.season} was ${who(p)}'s best season by win rate: ${record(yw, yl)}`], p);
      else add("season", `year-${p}`, 3, [`${who(p)} finished ${F.season} ${record(yw, yl)}`], p);
    }

    // What came after, that season
    if (over && after.length >= 6) {
      const aw = winsOf(after, p);
      const rate = aw / after.length;
      const was = before.length >= 6 ? w / before.length : null;
      if (rate >= 0.88 && after.length >= 10) add("after", `surge-${p}`, 12 + aw / 2, [`${who(p)} won ${aw} of ${after.length} matches for the rest of ${F.season}`], p);
      else if (rate <= 0.4 && (was === null || was >= 0.6)) add("after", `slump-${p}`, 14 + (was ? 10 * (was - rate) : 0), [`${who(p)} won just ${aw} of ${after.length} matches for the rest of ${F.season}`], p);
      if (won && F.round === "F" && !titles(after).length && after.length >= 10) add("after", `no-title-${p}`, 8, [`${who(p)} didn't win another title in ${F.season}`], p);
    }

    // Rankings over the season
    const r0 = year.length ? rankOf(year[0], p) : null;
    const rNow = rankOf(F, p);
    const rEnd = over && year.length ? rankOf(year[year.length - 1], p) : null;
    if (r0 && rNow && r0 >= 3 * rNow && rNow <= 20 && r0 >= 15) add("season", `rise-${p}`, 12 + Math.log2(r0 / rNow) * 4, [`${who(p)} started ${F.season} ranked No. ${r0}`], p);
    if (rEnd && rNow && rEnd === 1 && rNow > 1) add("after", `to-one-${p}`, 22, [`${who(p)} was No. 1 by the end of ${F.season}`], p);
  }

  /* ---------- The draw ---------- */

  const drawRows = input.draw.filter(played).sort(chron);
  let drawVisual: DrawVisual | null = null;
  if (F.tier !== "team" && drawRows.length > 2) {
    const final = drawRows.find((m) => m.round === "F");
    const champion = final?.w ?? null;
    const pathOf = (p: string) => input.draw.filter((m) => (m.w === p || m.l === p) && chron(m, F) < 0).sort(chron);
    const minutesOn = (xs: Played[]) => (xs.every((m) => m.minutes !== null || !played(m)) ? xs.reduce((a, m) => a + (m.minutes ?? 0), 0) : null);
    const setsLost = (xs: Played[], p: string) =>
      xs.filter(played).reduce((a, m) => a + setsOf(m).winners.filter((x) => (m.w === p ? x === "l" : x === "w")).length, 0);
    const [pathA, pathB] = [pathOf(A), pathOf(B)];
    if (pathA.length >= 3 && pathB.length >= 3) {
      const [ma, mb] = [minutesOn(pathA), minutesOn(pathB)];
      if (ma !== null && mb !== null && Math.abs(ma - mb) >= 90) {
        const more = ma > mb ? A : B;
        add("draw", "fresher", 10 + Math.abs(ma - mb) / 20 + 10 * stake, [
          `${who(more)} had spent ${hm(Math.abs(ma - mb))} longer on court getting here (${hm(Math.max(ma, mb))} to ${hm(Math.min(ma, mb))})${more === A ? ", and still won" : ""}`,
        ]);
      }
      for (const p of [A, B]) {
        const lost = setsLost(pathOf(p), p);
        if (lost === 0 && pathOf(p).length >= 4) add("draw", `clean-${p}`, 8 + 8 * stake, [`${who(p)} hadn't dropped a set on the way`], p);
        const seeds = pathOf(p).filter((m) => m.w === p && seedOf(m, opp(m, p)) && seedOf(m, opp(m, p))! <= 16);
        if (seeds.length >= 3) add("draw", `seeds-${p}`, 6 + seeds.length * 3, [`${who(p)} had already beaten ${ws(seeds.length, "seed")}: `, ...seeds.flatMap((m, i) => [i ? ", " : "", link(m, `${seedOf(m, opp(m, p))}. ${who(opp(m, p))}`)])], p);
      }
    }
    // After this match
    const nextOfA = input.draw.filter((m) => (m.w === A || m.l === A) && chron(m, F) > 0).sort(chron);
    if (F.round !== "F" && final) {
      if (champion === A) {
        const lostSets = setsLost(input.draw.filter((m) => m.w === A || m.l === A), A);
        add("draw", "went-on", 14 + 18 * stakes[F.tier] + (lostSets === 0 ? 12 : 0), [`${who(A)} went on to win the title`, lostSets === 0 ? " without dropping a set" : "", ": ", link(final)], A);
        follow(final, "The final", 24);
      } else {
        const out = nextOfA.find((m) => played(m) ? m.l === A : m.l === A);
        if (out) {
          const byChamp = out.w === champion;
          add("draw", "next-round", 8 + 10 * stakes[F.tier], [`${who(A)} lost the next ${out.round === "F" ? "match, the final," : "round"} to ${who(out.w)}${byChamp && out.round !== "F" ? ", the eventual champion" : ""}: `, link(out)], A);
          follow(out, `${who(A)}'s next match`, 16);
        }
        if (champion && champion !== A && out?.w !== champion) follow(final, `The final, won by ${who(champion)}`, 14);
      }
    }
    // Upsets across the draw: what became of the top seeds
    const seedsIn = new Map<string, number>();
    for (const m of input.draw) {
      if (m.ws && m.ws <= 4) seedsIn.set(m.w, m.ws);
      if (m.ls && m.ls <= 4) seedsIn.set(m.l, m.ls);
    }
    if (seedsIn.size === 4 && level[F.round] >= 5 && F.round !== "RR") {
      const deepest = [...seedsIn.keys()].map((p) => Math.max(...input.draw.filter((m) => m.w === p || m.l === p).map((m) => (m.round === "F" && m.w === p ? 8 : m.w === p ? level[m.round] + 1 : level[m.round]))));
      const inSF = deepest.filter((x) => x >= 6).length;
      if (inSF === 0) add("draw", "seeds-out", 22 + 10 * stakes[F.tier], ["None of the top four seeds reached the semifinals"]);
      else if (inSF === 1 && level[F.round] >= 6) add("draw", "seeds-out", 12 + 8 * stakes[F.tier], ["Only one of the top four seeds reached the semifinals"]);
    }
    const pathSteps = (p: string) =>
      input.draw
        .filter((m) => (m.w === p || m.l === p) && (p === B ? chron(m, F) <= 0 : true))
        .sort(chron)
        .map((m) => ({ id: m.id, round: m.round, opp: opp(m, p), oppSeed: seedOf(m, opp(m, p)), won: m.w === p, score: played(m) ? m.score : "W/O", focus: m.id === F.id }));
    drawVisual = { kind: "draw", paths: [{ side: "a", steps: pathSteps(A) }, { side: "b", steps: pathSteps(B) }], champion };
    for (const m of input.draw) if (m.w === A || m.l === A || m.w === B || m.l === B) link(m);
  }

  /* ---------- Careers: firsts, lasts and onlys ---------- */

  for (const p of [A, B]) {
    const c = career[p];
    const i = at(p);
    const isWhole = whole(p);
    const won = p === A;
    // Where each went next, and how each got here
    if (c[i + 1] && c[i + 1].tourneyId !== F.tourneyId) follow(c[i + 1], `${who(p)}'s next match`, 8);
    const into = input.draw.filter((m) => (m.w === p || m.l === p) && chron(m, F) < 0 && played(m)).sort(chron).pop();
    if (into && level[F.round] >= 6) follow(into, `${who(p)}'s ${roundNoun(into)}`, 10);
    // A last match
    if (i === c.length - 1 && ahead >= 18 && c.length >= 30)
      add("after", `last-${p}`, 26 + 30 * stake + Math.min(15, c.length / 40), [`${who(p)}'s last tour-level match. ${who(p)} never played another`], p);
    // A first
    if (i === 0 && isWhole) add("match", `debut-${p}`, 10 + (won ? 6 : 0), [`${who(p)}'s first tour-level match`], p);
    // Slam finals: a first, a count, a last
    if (F.round === "F" && isSlam(F)) {
      const slamFinals = c.filter((m) => isSlam(m) && m.round === "F");
      const slamWins = slamFinals.filter((m) => m.w === p);
      // Counted from the player's real first Slam when what came before the data is known
      const history = slamHistory(p);
      const known = history !== null;
      const [titlesBefore, finalsBefore] = history ?? [0, 0];
      const j = slamFinals.findIndex((m) => m.id === F.id) + finalsBefore;
      const allFinals = slamFinals.length + finalsBefore;
      const allTitles = slamWins.length + titlesBefore;
      const tail = known ? "" : since;
      if (won) {
        const n = slamWins.findIndex((m) => m.id === F.id) + 1 + titlesBefore;
        if (n === 1 && known) add("match", "first-slam", 34, [`${who(p)}'s first Slam title`], p);
        else if (n > 1) add("match", "slam-n", 12 + n * 1.6, [`${who(p)}'s ${ordinal(n)} Slam title${tail}`], p);
        if (allTitles === 1 && known && ahead >= 24) add("after", "only-slam", 30, [`${who(p)}'s only Slam title`], p);
      } else if (j === 0 && known) add("match", "first-slam-final-lost", 16, [`${who(p)}'s first Slam final`], p);
      if (j === allFinals - 1 && ahead >= 24 && (j > 0 || known))
        add("after", `last-slam-final-${p}`, 22 + allFinals, [
          allFinals === 1 && known ? `${who(p)}'s only Slam final` : `${who(p)}'s last Slam final, the ${ordinal(allFinals)}${tail}`,
        ], p);
    } else if (F.round === "F" && won && isWhole) {
      const titles = c.filter((m) => m.round === "F" && m.w === p);
      if (titles[0]?.id === F.id) add("match", "first-title", 22 + 14 * stakes[F.tier], [`${who(p)}'s first tour-level title`], p);
    }
    // Wins over the world No. 1, and first wins over the top 10
    if (won && F.lr === 1) {
      const n = c.slice(0, i + 1).filter((m) => m.w === p && m.lr === 1).length;
      if (n === 1 && isWhole) add("match", "first-no1", 30, [`${who(p)}'s first win over a world No. 1`], p);
      else if (n > 1) add("match", "no1-n", 10 + n, [`${who(p)}'s ${ordinal(n)} win over a world No. 1${isWhole ? "" : since}`], p);
    } else if (won && F.lr && F.lr <= 10 && isWhole) {
      const n = c.slice(0, i + 1).filter((m) => m.w === p && m.lr && m.lr <= 10).length;
      if (n === 1 && i >= 10) add("match", "first-top10", 22, [`${who(p)}'s first win over a top-10 player, in match no. ${i + 1}`], p);
    }
    // Runs of deep Slam results: "36 straight Slam quarterfinals"
    if (isSlam(F)) {
      const slamEds = [...new Set(c.filter(isSlam).map((m) => m.tourneyId))].map((t) => {
        const xs = allOf(p).filter((m) => m.tourneyId === t);
        const lastMatch = xs[xs.length - 1];
        return { t, date: lastMatch.date, level: lastMatch.round === "F" && lastMatch.w === p ? 8 : lastMatch.w === p ? level[lastMatch.round] + 1 : level[lastMatch.round] };
      }).sort((x, y) => x.date.localeCompare(y.date));
      const here = slamEds.findIndex((e) => e.t === F.tourneyId);
      for (const [mark, noun] of [[6, "semifinal"], [5, "quarterfinal"]] as const) {
        let run = 0;
        for (let j = here - 1; j >= 0 && slamEds[j].level >= mark; j--) run++;
        if (run < 6) continue;
        const edge = run === here && !whole(p) ? since : "";
        if (!won && level[F.round] < mark) {
          add("event", `slam-run-ended-${p}`, 26 + run * 1.2, [`Ended ${who(p)}'s run of ${run} straight Slam ${noun}s${edge}`], A);
          break;
        }
        if (won && level[F.round] === mark - 1) {
          add("event", `slam-run-${p}`, 12 + run * 0.8, [`${who(p)}'s ${ordinal(run + 1)} straight Slam ${noun}${edge}`], p);
          break;
        }
      }
    }
    // A first 6–0 set lost in a long time
    if (!won && sets.some((x) => x.w === 6 && x.l === 0)) {
      const earlier = c.slice(0, i).filter((m) => m.l === p && setsOf(m).sets.some((x) => x.w === 6 && x.l === 0) || (m.w === p && setsOf(m).sets.some((x) => x.w === 0 && x.l === 6)));
      if (i >= 150 && earlier.length <= 3) {
        const lastBagel = earlier[earlier.length - 1];
        const gapMatches = lastBagel ? i - c.indexOf(lastBagel) : i;
        add("match", `bagel-${p}`, 18 + Math.min(25, gapMatches / 25), [
          `${who(p)} lost a set 6–0 for the first time in ${gapMatches} matches`,
          ...(lastBagel ? [", since ", link(lastBagel)] : [isWhole ? "" : since]),
        ], p);
      }
    }
    // Round numbers of wins, for careers the data holds whole
    if (won && isWhole) {
      const n = c.slice(0, i + 1).filter((m) => m.w === p).length;
      if (n >= 100 && n % 100 === 0) add("match", "wins-n", 14 + n / 50, [`${who(p)}'s ${ordinal(n)} tour-level win`], p);
    }
    // Peak ranking
    const peak = Math.min(...c.map((m) => rankOf(m, p) ?? 9999));
    const firstAtPeak = c.find((m) => rankOf(m, p) === peak);
    if (peak <= 5 && firstAtPeak && firstAtPeak.date > F.date && months(F.date, firstAtPeak.date) <= 3 && rankOf(F, p) && rankOf(F, p)! > peak)
      add("after", `peak-${p}`, 14 + (6 - peak) * 3, [`Within three months, ${who(p)} was ranked No. ${peak}, a career high`], p);
  }

  /* ---------- Common ground: both players against the same opponent that season ---------- */

  {
    const year = (p: string) => seasonOf(p).filter((m) => m.id !== F.id);
    const ya = year(A);
    const yb = year(B);
    const common = [...new Set(ya.map((m) => opp(m, A)))].filter((o) => o !== B && yb.some((m) => opp(m, B) === o));
    const scored = common
      .map((o) => {
        const ra = ya.filter((m) => opp(m, A) === o);
        const rb = yb.filter((m) => opp(m, B) === o);
        return { o, ra, rb, aW: winsOf(ra, A), bW: winsOf(rb, B) };
      })
      // The interesting ones: one of them beat this opponent and the other didn't
      .filter((x) => (x.aW === x.ra.length && x.bW === 0) || (x.bW === x.rb.length && x.aW === 0))
      .sort((x, y) => y.ra.length + y.rb.length - (x.ra.length + x.rb.length));
    const x = scored[0];
    if (x) {
      const aBeat = x.aW > 0;
      const [winner, loser] = aBeat ? [A, B] : [B, A];
      const wRows = aBeat ? x.ra : x.rb;
      const lRows = aBeat ? x.rb : x.ra;
      add("season", "common", 8 + (wRows.length + lRows.length) * 1.5, [
        `In ${F.season}, ${who(winner)} beat ${who(x.o)} `,
        wRows.length === 1 ? link(wRows[0], "once") : times(wRows.length),
        `; ${who(loser)} lost to ${who(x.o)} `,
        lRows.length === 1 ? link(lRows[0], "once") : times(lRows.length),
      ]);
    }
  }

  /* ---------- Visuals ---------- */

  const h2hVisual: H2HVisual | null =
    total > 1
      ? {
          kind: "h2h",
          meetings: meetings.map((m) => {
            link(m);
            return { id: m.id, year: m.season, label: label(m), surface: m.surface, winner: side(m.w), focus: m.id === F.id, big: m.round === "F" || (isSlam(m) && level[m.round] >= 5) };
          }),
        }
      : null;

  let eventVisual: EventVisual | null = null;
  if (F.tier !== "team") {
    const edA = editionsOf(A);
    const edB = editionsOf(B);
    const seen = [...edA, ...edB].map((e) => e.season);
    const lo = Math.min(...seen);
    const hi = Math.max(...seen);
    const seasons = editions.filter((y) => y >= lo && y <= hi);
    const row = (p: string, eds: Edition[]) => {
      const rows = eventRows(p).filter(played);
      for (const e of eds) link(e.last);
      return {
        side: side(p),
        cells: seasons.map((y) => {
          const e = eds.find((x) => x.season === y);
          return e ? { result: e.result, id: e.last.id, won: e.won } : null;
        }),
        record: [winsOf(rows, p), rows.length - winsOf(rows, p)] as [number, number],
        titles: eds.filter((e) => e.won).length,
      };
    };
    eventVisual = { kind: "event", seasons, rows: [row(A, edA), row(B, edB)] };
  }

  const seasonVisual: SeasonVisual = {
    kind: "season",
    rows: [A, B].map((p) => {
      const year = allOf(p).filter((m) => m.season === F.season);
      const byEvent = [...new Set(year.map((m) => m.tourneyId))].map((t) => {
        const xs = year.filter((m) => m.tourneyId === t);
        const lastMatch = xs[xs.length - 1];
        const champion = lastMatch.round === "F" && lastMatch.w === p;
        return {
          event: xs[0].event,
          tier: xs[0].tier,
          surface: xs[0].surface,
          result: champion ? "W" : (isSlam(lastMatch) && slamCodes[lastMatch.round]) || resultCode[lastMatch.round],
          matches: xs.filter(played).map((m) => ({ id: m.id, won: m.w === p, focus: m.id === F.id, opp: opp(m, p) })),
        };
      });
      const all = seasonOf(p);
      return { side: side(p), record: [winsOf(all, p), all.length - winsOf(all, p)] as [number, number], events: byEvent.filter((e) => e.matches.length) };
    }),
  };

  let statsVisual: StatsVisual | null = null;
  if (F.wst && F.lst) {
    const [x, y] = [F.wst, F.lst];
    const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");
    const rows: StatsVisual["rows"] = [
      { label: "Aces", a: String(x[STAT.ace]), b: String(y[STAT.ace]), lead: x[STAT.ace] === y[STAT.ace] ? null : x[STAT.ace] > y[STAT.ace] ? "a" : "b" },
      { label: "Double faults", a: String(x[STAT.df]), b: String(y[STAT.df]), lead: x[STAT.df] === y[STAT.df] ? null : x[STAT.df] < y[STAT.df] ? "a" : "b" },
      { label: "First serves in", a: pct(x[STAT.in1], x[STAT.svpt]), b: pct(y[STAT.in1], y[STAT.svpt]), lead: null },
      {
        label: "First-serve points won",
        a: pct(x[STAT.won1], x[STAT.in1]),
        b: pct(y[STAT.won1], y[STAT.in1]),
        lead: x[STAT.won1] / (x[STAT.in1] || 1) > y[STAT.won1] / (y[STAT.in1] || 1) ? "a" : "b",
      },
      {
        label: "Second-serve points won",
        a: pct(x[STAT.won2], x[STAT.svpt] - x[STAT.in1]),
        b: pct(y[STAT.won2], y[STAT.svpt] - y[STAT.in1]),
        lead: x[STAT.won2] / (x[STAT.svpt] - x[STAT.in1] || 1) > y[STAT.won2] / (y[STAT.svpt] - y[STAT.in1] || 1) ? "a" : "b",
      },
      {
        label: "Break points saved",
        a: `${x[STAT.bpSaved]}/${x[STAT.bpFaced]}`,
        b: `${y[STAT.bpSaved]}/${y[STAT.bpFaced]}`,
        lead: x[STAT.bpFaced] - x[STAT.bpSaved] === y[STAT.bpFaced] - y[STAT.bpSaved] ? null : x[STAT.bpFaced] - x[STAT.bpSaved] < y[STAT.bpFaced] - y[STAT.bpSaved] ? "a" : "b",
      },
    ];
    if (pts) rows.push({ label: "Points won", a: String(pts.w), b: String(pts.l), lead: pts.w === pts.l ? null : pts.w > pts.l ? "a" : "b" });
    statsVisual = { kind: "stats", rows };
  }

  /* ---------- Choosing what to tell ---------- */

  // Each thread keeps its heaviest few; a thread with nothing to say still shows its picture
  const keep: Record<ThreadId, number> = { match: 4, h2h: 4, event: 4, season: 4, draw: 3, after: 4 };
  const seasonWord = `${F.season}`;
  const threadInfo: Record<ThreadId, { title: string; kicker: string; visual: Visual | null }> = {
    match: { title: "The match", kicker: [F.minutes ? hm(F.minutes) : null, `${sets.length} sets`].filter(Boolean).join(" · "), visual: statsVisual },
    h2h: {
      title: "Head to head",
      kicker: total > 1 ? `Meeting ${k + 1} of ${total}${hs} · ${record(aa, ba)} after it` : `Their only meeting${hs}`,
      visual: h2hVisual,
    },
    event: { title: cap(atEvent(F.event)), kicker: "Year by year", visual: eventVisual },
    season: { title: `The ${seasonWord} season`, kicker: "Match by match", visual: seasonVisual },
    draw: { title: "The draw", kicker: drawVisual?.champion ? `Won by ${who(drawVisual.champion)}` : "", visual: drawVisual },
    after: { title: "What came next", kicker: "", visual: null },
  };

  // Lines that say the same thing as a stronger one go
  const has = (key: string) => facts.some((f) => f.key === key);
  const dropped = new Set<string>();
  if (has("only-slam")) dropped.add("first-slam");
  for (const p of [A, B]) {
    if (has(`peak-${p}`)) dropped.add(`to-one-${p}`);
    if (has(`last-slam-final-${p}`)) dropped.add(`never-again-${p}`);
    if (has(`slam-run-ended-${p}`) || has("earliest")) dropped.add(`year-${p}`);
  }
  if (has("first-win")) dropped.add("run-ended");
  const sorted = [...facts].filter((f) => !dropped.has(f.key)).sort((x, y) => y.weight - x.weight || x.key.localeCompare(y.key));
  // The story in three lines: the heaviest, then the heaviest from two other threads
  const lede: Fact[] = [];
  for (const f of sorted) {
    if (lede.length === 3) break;
    if (lede.length && (f.weight < 18 || lede.some((x) => x.thread === f.thread))) continue;
    lede.push(f);
  }
  const threads: Thread[] = (Object.keys(threadInfo) as ThreadId[])
    .map((id) => {
      const chosen = sorted.filter((f) => f.thread === id && !lede.includes(f)).slice(0, keep[id]);
      const weight = (chosen[0]?.weight ?? 0) + 0.3 * (chosen[1]?.weight ?? 0) + (threadInfo[id].visual ? 4 : 0);
      return { id, ...threadInfo[id], facts: chosen, weight };
    })
    .filter((t) => t.facts.length || t.visual)
    .sort((x, y) => y.weight - x.weight);

  // The trail: the most telling matches the story points to
  const seenTrail = new Set<string>();
  const trailOut = trail
    .sort((x, y) => y.weight - x.weight)
    .filter((t) => !seenTrail.has(t.ref) && seenTrail.add(t.ref))
    .slice(0, 6)
    .map(({ ref, why }) => ({ ref, why }));

  /* ---------- Settling names ---------- */

  const mentioned = new Set<string>([A, B]);
  const token = /\u0002([^\u0003]+)\u0003/g;
  const scan = (t: string) => {
    for (const m of t.matchAll(token)) mentioned.add(m[1]);
  };
  for (const f of facts) for (const p of f.parts) scan(typeof p === "string" ? p : p.text);
  for (const t of threads) scan(t.kicker);
  for (const t of trailOut) scan(t.why);
  for (const r of Object.values(refs)) [r.w, r.l].forEach((x) => mentioned.add(x));
  if (drawVisual) for (const path of drawVisual.paths) for (const st of path.steps) mentioned.add(st.opp);
  for (const row of seasonVisual.rows) for (const e of row.events) for (const m of e.matches) mentioned.add(m.opp);
  const known = [...mentioned].map((key) => players[key] ?? { key, name: key, short: key, ioc: null });
  const names = Object.fromEntries(displayNames(known));
  const fill = (t: string) => t.replace(token, (_, key: string) => names[key] ?? key);
  const fillFact = (f: Fact): Fact => ({ ...f, parts: f.parts.map((p) => (typeof p === "string" ? fill(p) : { ...p, text: fill(p.text) })) });

  const sideOf = (p: string, seed: number | null, entry: string | null, rank: number | null, age: number | null): StorySide => ({
    key: p,
    name: players[p]?.name ?? p,
    ioc: players[p]?.ioc ?? null,
    seed,
    entry,
    rank,
    age,
    hand: players[p]?.hand ?? null,
    height: players[p]?.height ?? null,
  });

  return {
    id: F.id,
    tour: F.tour,
    event: F.event,
    season: F.season,
    date: F.date,
    round: F.round,
    stage: F.stage,
    tier: F.tier,
    surface: F.surface,
    score: F.score,
    bestOf: F.bestOf,
    minutes: F.minutes,
    a: sideOf(A, F.ws, F.we, F.wr, F.wa),
    b: sideOf(B, F.ls, F.le, F.lr, F.la),
    names,
    lede: lede.map(fillFact),
    threads: threads.map((t) => ({ ...t, title: fill(t.title), kicker: fill(t.kicker), facts: t.facts.map(fillFact) })),
    refs,
    trail: trailOut.map((t) => ({ ...t, why: fill(t.why) })),
  };
}

/** Whether a Slam's name starts an event's, for the few places the story treats Slams apart */
export const isSlamEvent = (event: string) => slams.some((x) => event.startsWith(x));
