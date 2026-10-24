// The record books: leaderboards from every match in the data, one tour at a time. Like the story
// (story.ts) and the saga's books (books.ts), every board comes from fixed rules over the data, so the
// same data always gives the same boards. Each board ranks one kind of feat (a streak, a rivalry, a run
// at one event, a season, a single match) and every row opens a match in Explore.

import { bigEvents, displayNames, parseScore, type Outcome, type Player, type Round, type Surface, type Tier, type Tour } from "./library";

/* ---------- What the engine reads ---------- */

/** A match that was played (walkovers never were), as the boards read it. Players are keys ("atp:D643"). */
export type RecordMatch = {
  id: string;
  tourneyId: string;
  event: string; // without the year
  tier: Tier;
  season: number;
  start: string; // the tournament's first day, "YYYY-MM-DD"
  date: string; // estimated from the start and the round; only the month is shown
  round: Round;
  num: number | null; // the match's number in the draw
  surface: Surface;
  w: string;
  l: string;
  score: string;
  bestOf: 3 | 5;
  outcome: Outcome;
  minutes: number | null;
  wr: number | null; // rankings
  lr: number | null;
  wa: number | null; // ages
  we: string | null; // entries: Q, WC, LL, PR, ...
  le: string | null;
  wst: number[] | null; // serve stats, see STAT
  lst: number[] | null;
};

export type RecordsInput = { tour: Tour; matches: RecordMatch[]; players: Record<string, Player>; last: string };

/* ---------- What it gives ---------- */

export type ChapterId = "rivalries" | "events" | "streaks" | "seasons" | "matches" | "specialists";

export const chapters: { id: ChapterId; title: string; icon: string; blurb: string }[] = [
  { id: "rivalries", title: "Rivalries", icon: "🤝", blurb: "Head-to-heads: the one-sided, the closest, the most played and the turned around." },
  { id: "events", title: "Tournaments", icon: "🏆", blurb: "Titles and unbeaten runs at one event, Slams in a row, and the unlikeliest champions." },
  { id: "streaks", title: "Streaks", icon: "🔥", blurb: "Wins in a row: anywhere, on one surface, in finals, over the top 10, and in sets." },
  { id: "seasons", title: "Seasons", icon: "📅", blurb: "The best single years: by wins, titles, Slams and wins over the top 10." },
  { id: "matches", title: "Matches", icon: "🎾", blurb: "The longest matches, the most aces, the unlikeliest wins and the comebacks." },
  { id: "specialists", title: "Specialists", icon: "🎯", blurb: "Bagels, tiebreaks, deciding sets, serving, returning, and the youngest and oldest champions." },
];

/** One line of a board: who, the number, a line about it, and the match it opens in Explore */
export type BoardRow = {
  rank: number; // shared by rows with the same number
  // One player; a pair, the leader first; or a match, the winner first
  kind: "player" | "pair" | "match";
  players: string[];
  stat: string; // "43", "20–0", "94%"
  note: string;
  go: { id: string; text: string } | null;
};

export type BoardView = { id: string; label: string; rows: BoardRow[] };

export type Board = {
  id: string;
  chapter: ChapterId;
  title: string;
  rule: string; // what counts, in a line
  unit: string; // what the number is: "wins in a row", "titles"
  views: BoardView[]; // one, or several to pick between (clay, grass, hard)
};

export type RecordBooks = {
  tour: Tour;
  from: number; // the first season in the data
  last: string; // the latest match date
  boards: Board[];
  names: Record<string, string>; // what to call everyone the boards name: a surname, or a full name where two clash
  full: Record<string, string>; // their full names, for finding them
};

// How many rows a board keeps: enough to scroll through, and to find a player by name
export const BOARD_ROWS = 20;

// Exhibitions and events played to other rules don't count towards any record
const exhibitions = new Set(["Laver Cup", "Next Gen Finals"]);
// Events whose final is a title: not the team events, where a final is one rubber of a tie
const titleTiers = new Set<Tier>(["slam", "1000", "500", "250", "finals", "olympics"]);
// Where each serve stat sits in a side's array
const STAT = { ace: 0, df: 1, svpt: 2, in1: 3, won1: 4, won2: 5, games: 6, bpSaved: 7, bpFaced: 8 } as const;

/* ---------- Small helpers ---------- */

const ladder: Round[] = ["RR", "R128", "R64", "R32", "R16", "QF", "SF", "BR", "3P", "F"];
const chron = (x: RecordMatch, y: RecordMatch) =>
  x.start.localeCompare(y.start) || ladder.indexOf(x.round) - ladder.indexOf(y.round) || (x.num ?? 0) - (y.num ?? 0) || x.id.localeCompare(y.id);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (date: string) => `${monthNames[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
const span = (a: string, b: string) => (a.slice(0, 7) === b.slice(0, 7) ? month(a) : `${month(a)} – ${month(b)}`);
const years = (a: number, b: number) => (a === b ? String(a) : `${a}–${b}`);
const s = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;
const record = (w: number, l: number) => `${w}–${l}`;
const pct = (w: number, n: number) => `${Math.round((w / n) * 1000) / 10}%`;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
const opp = (m: RecordMatch, p: string) => (m.w === p ? m.l : m.w);
const won = (m: RecordMatch, p: string) => m.w === p;
const isTitle = (m: RecordMatch) => m.round === "F" && titleTiers.has(m.tier);
const hm = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
const at = (m: RecordMatch) => `${m.event} ${m.season}`;
/** A score from the loser's side: "4-6 7-6(5) 9-7" becomes "6-4 6-7(5) 7-9" */
const flipped = (score: string) => score.replace(/(\[?)(\d+)-(\d+)/g, "$1$3-$2");
/** Age in years as "19 years, 4 months" */
const age = (a: number) => {
  const y = Math.floor(a);
  const m = Math.floor((a - y) * 12);
  return m ? `${y} years, ${m} ${m === 1 ? "month" : "months"}` : `${y} years`;
};
const roundWords: Record<Round, string> = {
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
const slamRoundWords: Partial<Record<Round, string>> = { R128: "first round", R64: "second round", R32: "third round", R16: "fourth round" };
/** "Wimbledon 2008, final" */
const where = (m: RecordMatch) => `${at(m)}, ${(m.tier === "slam" && slamRoundWords[m.round]) || roundWords[m.round]}`;
/** The round a win takes a player to */
const nextRound: Record<Round, Round | "W"> = { R128: "R64", R64: "R32", R32: "R16", R16: "QF", QF: "SF", RR: "SF", SF: "F", F: "W", BR: "W", "3P": "W" };
// How far a Slam run went
const depth: Partial<Record<Round | "W", number>> = { W: 9, F: 8, SF: 7, QF: 6, R16: 5, R32: 4, R64: 3, R128: 2 };

/** Sets as the player saw them: won or lost, in order. A set left unfinished by a retirement counts for no one. */
function setsFor(m: RecordMatch, p: string) {
  const { sets, outcome } = parseScore(m.score);
  const done = outcome === "completed";
  const mine = won(m, p);
  return sets.flatMap((x, i) => (!done && i === sets.length - 1 ? [] : [{ ...x, won: x.w > x.l === mine }]));
}

/** Games each side won, a tiebreak counting as one game (and a match tiebreak too) */
function gamesOf(m: RecordMatch) {
  return parseScore(m.score).sets.reduce((a, x) => (x.super ? { w: a.w + (x.w > x.l ? 1 : 0), l: a.l + (x.l > x.w ? 1 : 0) } : { w: a.w + x.w, l: a.l + x.l }), { w: 0, l: 0 });
}

/** Serve stats the data can't have right are left out: more points than a match that long holds, say */
function statsOk(st: number[] | null, m: RecordMatch): st is number[] {
  if (!st || st.length < 9 || st.some((x) => typeof x !== "number" || x < 0)) return false;
  const g = gamesOf(m);
  const games = g.w + g.l;
  return st[STAT.svpt] > 0 && st[STAT.svpt] <= 10 * games && st[STAT.ace] <= st[STAT.svpt] && st[STAT.games] > 0 && st[STAT.games] <= games && st[STAT.bpSaved] <= st[STAT.bpFaced];
}

/** Rank rows by a number, best first; rows with the same number share a rank. Keeps the top `keep`. */
function ranked<T>(items: T[], value: (x: T) => number, row: (x: T) => Omit<BoardRow, "rank">, tiebreak?: (a: T, b: T) => number, keep = BOARD_ROWS): BoardRow[] {
  const sorted = [...items].sort((a, b) => value(b) - value(a) || (tiebreak ? tiebreak(a, b) : 0)).slice(0, keep);
  let rank = 0;
  return sorted.map((x, i) => {
    if (i === 0 || value(x) !== value(sorted[i - 1])) rank = i + 1;
    return { rank, ...row(x) };
  });
}

/** The runs of wins in a player's matches, in order, of at least `min`. Each says what ended it, if anything did. */
type Run = { who: string; wins: RecordMatch[]; ended: RecordMatch | null; list: RecordMatch[] };
function runsOf(who: string, list: RecordMatch[], min: number) {
  const runs: Run[] = [];
  let wins: RecordMatch[] = [];
  for (const m of list) {
    if (won(m, who)) wins.push(m);
    else {
      if (wins.length >= min) runs.push({ who, wins, ended: m, list });
      wins = [];
    }
  }
  if (wins.length >= min) runs.push({ who, wins, ended: null, list });
  return runs;
}

const push = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

/** The first season most of the tour's matches have something, for saying where a board's numbers begin */
function firstMostly(matches: RecordMatch[], has: (m: RecordMatch) => boolean) {
  const bySeason = new Map<number, [number, number]>();
  for (const m of matches) {
    const [yes, all] = bySeason.get(m.season) ?? [0, 0];
    bySeason.set(m.season, [yes + (has(m) ? 1 : 0), all + 1]);
  }
  return [...bySeason].sort((a, b) => a[0] - b[0]).find(([, [yes, all]]) => yes / all >= 0.5)?.[0] ?? null;
}

/* ---------- The boards ---------- */

export function buildRecords({ tour, matches: all, players, last }: RecordsInput): RecordBooks {
  const matches = all.filter((m) => !exhibitions.has(m.event)).sort(chron);
  const from = Math.min(...matches.map((m) => m.season));
  const lastSeason = Number(last.slice(0, 4));
  const tourWord = tour === "atp" ? "men's" : "women's";
  const named = new Set<string>();

  // Players are named in a line by key, and get their names once every board is built (see `fill`)
  const nameOf = (key: string) => {
    named.add(key);
    return `{${key}}`;
  };
  const go = (m: RecordMatch | null | undefined, text: string) => (m ? { id: m.id, text } : null);
  const row = (kind: BoardRow["kind"], keys: string[], stat: string, note: string, to: BoardRow["go"]) => {
    for (const k of keys) named.add(k);
    return { kind, players: keys, stat, note, go: to };
  };
  // A streak that nothing ended is still going if the player has played lately
  const recent = (m: RecordMatch) => days(m.date, last) < 120;
  const endLine = (run: Run) => {
    if (run.ended) return go(run.ended, `Ended by ${nameOf(opp(run.ended, run.who))} · ${at(run.ended)}`);
    const lastWin = run.wins[run.wins.length - 1];
    return go(lastWin, recent(run.list[run.list.length - 1]) ? `Still going · latest: ${at(lastWin)}` : `Never beaten again · last: ${at(lastWin)}`);
  };
  // Events that changed names or were held twice in a year count as one: Toronto and Montreal, Adelaide 1 and 2
  const eventKey = (m: RecordMatch) => bigEvents.find((b) => b.events.length > 1 && b.events.includes(m.event))?.label ?? m.event.replace(/ \d$/, "");

  const boards: Board[] = [];
  const add = (b: Omit<Board, "views"> & { rows?: BoardRow[]; views?: BoardView[] }) => {
    const views = (b.views ?? [{ id: "all", label: "All", rows: b.rows ?? [] }]).filter((v) => v.rows.length);
    if (views.length) boards.push({ id: b.id, chapter: b.chapter, title: b.title, rule: b.rule, unit: b.unit, views });
  };

  // Every player's matches, in order
  const careers = new Map<string, RecordMatch[]>();
  for (const m of matches) {
    push(careers, m.w, m);
    push(careers, m.l, m);
  }

  /* ----- Rivalries ----- */

  type Pair = { a: string; b: string; meetings: RecordMatch[]; aw: number; bw: number };
  const pairs = new Map<string, Pair>();
  for (const m of matches) {
    const [a, b] = [m.w, m.l].sort();
    const key = `${a}|${b}`;
    const pair = pairs.get(key) ?? { a, b, meetings: [], aw: 0, bw: 0 };
    pair.meetings.push(m);
    if (m.w === a) pair.aw++;
    else pair.bw++;
    pairs.set(key, pair);
  }
  const pairList = [...pairs.values()].filter((p) => p.meetings.length >= 3);
  const leader = (p: Pair) => (p.aw >= p.bw ? { top: p.a, other: p.b, tw: p.aw, ow: p.bw } : { top: p.b, other: p.a, tw: p.bw, ow: p.aw });
  const lastOf = (p: Pair) => p.meetings[p.meetings.length - 1];
  const spanOf = (p: Pair) => years(p.meetings[0].season, lastOf(p).season);
  const latest = (p: Pair) => go(lastOf(p), `Latest meeting · ${at(lastOf(p))}`);
  const newestFirst = (x: Pair, y: Pair) => lastOf(y).date.localeCompare(lastOf(x).date);

  add({
    id: "never-beaten",
    chapter: "rivalries",
    title: "One-way rivalries",
    rule: "Pairs who met six times or more, where the same player won every time.",
    unit: "won–lost",
    rows: ranked(
      pairList.filter((p) => p.meetings.length >= 6 && Math.min(p.aw, p.bw) === 0),
      (p) => p.meetings.length,
      (p) => {
        const { top, other, tw, ow } = leader(p);
        const slams = p.meetings.filter((m) => m.tier === "slam").length;
        return row("pair", [top, other], record(tw, ow), `${spanOf(p)}${slams ? ` · ${slams} at Slams` : ""}`, latest(p));
      },
      newestFirst,
    ),
  });

  add({
    id: "most-played",
    chapter: "rivalries",
    title: "Most played rivalries",
    rule: "The pairs who met most often.",
    unit: "meetings",
    rows: ranked(
      pairList,
      (p) => p.meetings.length,
      (p) => {
        const { top, other, tw, ow } = leader(p);
        return row("pair", [top, other], String(p.meetings.length), `${tw === ow ? `Level at ${record(tw, ow)}` : `${nameOf(top)} leads ${record(tw, ow)}`} · ${spanOf(p)}`, latest(p));
      },
      newestFirst,
    ),
  });

  add({
    id: "lopsided",
    chapter: "rivalries",
    title: "Most one-sided rivalries",
    rule: "Pairs who met 15 times or more, by the share of meetings the leader won. Both won at least once.",
    unit: "won–lost",
    rows: ranked(
      pairList.filter((p) => p.meetings.length >= 15 && Math.min(p.aw, p.bw) > 0),
      (p) => leader(p).tw / p.meetings.length,
      (p) => {
        const { top, other, tw, ow } = leader(p);
        return row("pair", [top, other], record(tw, ow), `${pct(tw, p.meetings.length)} · ${spanOf(p)}`, latest(p));
      },
      (x, y) => y.meetings.length - x.meetings.length,
    ),
  });

  add({
    id: "closest",
    chapter: "rivalries",
    title: "Closest big rivalries",
    rule: "Pairs who met 15 times or more, by how close their head-to-head is.",
    unit: "won–lost",
    rows: ranked(
      pairList.filter((p) => p.meetings.length >= 15),
      (p) => -Math.abs(p.aw - p.bw) / p.meetings.length,
      (p) => {
        const { top, other, tw, ow } = leader(p);
        return row("pair", [top, other], record(tw, ow), `${s(p.meetings.length, "meeting")} · ${spanOf(p)}`, latest(p));
      },
      (x, y) => y.meetings.length - x.meetings.length,
    ),
  });

  // The furthest anyone fell behind in a head-to-head and still came back to lead it
  type Turn = { pair: Pair; who: string; down: [number, number]; at: RecordMatch; ahead: RecordMatch };
  const turns: Turn[] = [];
  for (const p of pairList) {
    if (p.meetings.length < 8) continue;
    let best: Turn | null = null;
    for (const who of [p.a, p.b]) {
      let [mine, theirs] = [0, 0];
      let worst: Pick<Turn, "down" | "at"> | null = null;
      for (const m of p.meetings) {
        if (won(m, who)) mine++;
        else theirs++;
        if (theirs > mine && (!worst || theirs - mine > worst.down[1] - worst.down[0])) worst = { down: [mine, theirs], at: m };
        if (worst && mine > theirs) {
          if (!best || worst.down[1] - worst.down[0] > best.down[1] - best.down[0]) best = { pair: p, who, ...worst, ahead: m };
          break;
        }
      }
    }
    if (best && best.down[1] - best.down[0] >= 3) turns.push(best);
  }
  add({
    id: "turnarounds",
    chapter: "rivalries",
    title: "Rivalries turned around",
    rule: "The furthest anyone fell behind in a head-to-head before going on to lead it.",
    unit: "at the worst",
    rows: ranked(
      turns,
      (t) => t.down[1] - t.down[0],
      (t) => {
        const [w, l] = t.who === t.pair.a ? [t.pair.aw, t.pair.bw] : [t.pair.bw, t.pair.aw];
        const now = w > l ? `leads ${record(w, l)} now` : w === l ? `level at ${record(w, l)} now` : `behind again, ${record(w, l)}`;
        return row("pair", [t.who, opp(t.at, t.who)], record(t.down[0], t.down[1]), `Trailed ${record(t.down[0], t.down[1])} in ${t.at.season}, went ahead in ${t.ahead.season} · ${now}`, go(t.ahead, `Went ahead · ${where(t.ahead)}`));
      },
      (x, y) => y.pair.meetings.length - x.pair.meetings.length,
    ),
  });

  add({
    id: "final-pairs",
    chapter: "rivalries",
    title: "Most finals against each other",
    rule: "Pairs who met most often in tournament finals.",
    unit: "finals",
    rows: ranked(
      pairList.map((p) => ({ p, finals: p.meetings.filter(isTitle) })).filter((x) => x.finals.length >= 3),
      (x) => x.finals.length,
      ({ p, finals }) => {
        const aw = finals.filter((m) => m.w === p.a).length;
        const [top, other, tw, ow] = aw >= finals.length - aw ? [p.a, p.b, aw, finals.length - aw] : [p.b, p.a, finals.length - aw, aw];
        const slams = finals.filter((m) => m.tier === "slam").length;
        const f = finals[finals.length - 1];
        return row("pair", [top, other], String(finals.length), `${tw === ow ? `Level at ${record(tw, ow)}` : `${nameOf(top)} won ${record(tw, ow)}`}${slams ? ` · ${s(slams, "Slam final")}` : ""}`, go(f, `Latest final · ${at(f)}`));
      },
      (x, y) => y.finals[y.finals.length - 1].date.localeCompare(x.finals[x.finals.length - 1].date),
    ),
  });

  /* ----- Tournaments ----- */

  // Each player at each event: their matches there in order, and their titles
  type AtEvent = { who: string; event: string; list: RecordMatch[]; titles: RecordMatch[] };
  const atEvents = new Map<string, AtEvent>();
  for (const m of matches) {
    if (!titleTiers.has(m.tier)) continue;
    const event = eventKey(m);
    for (const p of [m.w, m.l]) {
      const key = `${p}|${event}`;
      const a = atEvents.get(key) ?? { who: p, event, list: [], titles: [] };
      a.list.push(m);
      if (isTitle(m) && m.w === p) a.titles.push(m);
      atEvents.set(key, a);
    }
  }
  const atList = [...atEvents.values()];
  const winsAt = (a: AtEvent) => a.list.filter((m) => won(m, a.who)).length;

  add({
    id: "event-titles",
    chapter: "events",
    title: "Most titles at one tournament",
    rule: "Titles won at the same event.",
    unit: "titles",
    rows: ranked(
      atList.filter((a) => a.titles.length >= 4),
      (a) => a.titles.length,
      (a) => {
        const f = a.titles[a.titles.length - 1];
        return row("player", [a.who], String(a.titles.length), `${a.event} · ${years(a.titles[0].season, f.season)} · ${record(winsAt(a), a.list.length - winsAt(a))} there`, go(f, `Latest title · ${at(f)}`));
      },
      (x, y) => x.titles[0].date.localeCompare(y.titles[0].date),
    ),
  });

  add({
    id: "event-streak",
    chapter: "events",
    title: "Unbeaten runs at one tournament",
    rule: "Matches won in a row at the same event, across the years.",
    unit: "wins in a row",
    rows: ranked(
      atList.flatMap((a) => runsOf(a.who, a.list, 10).map((r) => ({ ...r, event: a.event }))),
      (r) => r.wins.length,
      (r) => {
        const titles = r.wins.filter(isTitle).length;
        return row("player", [r.who], String(r.wins.length), `${r.event} · ${years(r.wins[0].season, r.wins[r.wins.length - 1].season)}${titles ? ` · ${s(titles, "title")}` : ""}`, endLine(r));
      },
      (x, y) => x.wins[0].date.localeCompare(y.wins[0].date),
    ),
  });

  add({
    id: "event-record",
    chapter: "events",
    title: "Best record at one tournament",
    rule: "Players with 25 matches or more at the same event, by the share they won.",
    unit: "won–lost",
    rows: ranked(
      atList.filter((a) => a.list.length >= 25),
      (a) => winsAt(a) / a.list.length,
      (a) => {
        const lost = a.list.filter((m) => !won(m, a.who)).at(-1);
        const latestThere = a.list[a.list.length - 1];
        return row(
          "player",
          [a.who],
          record(winsAt(a), a.list.length - winsAt(a)),
          `${a.event} · ${pct(winsAt(a), a.list.length)}${a.titles.length ? ` · ${s(a.titles.length, "title")}` : ""}`,
          lost ? go(lost, `Latest defeat · ${nameOf(lost.w)}, ${lost.season}`) : go(latestThere, `Never beaten there · latest: ${where(latestThere)}`),
        );
      },
      (x, y) => y.list.length - x.list.length,
    ),
  });

  // Every Slam each player played: how far they got (a win and then a withdrawal still reached the next
  // round), and the matches on the way
  type SlamRun = { who: string; list: RecordMatch[]; result: Round | "W" };
  const slamRuns: SlamRun[] = [];
  {
    const byRun = new Map<string, SlamRun>();
    for (const m of matches) {
      if (m.tier !== "slam") continue;
      for (const p of [m.w, m.l]) {
        const key = `${p}|${m.tourneyId}`;
        const r = byRun.get(key) ?? { who: p, list: [], result: m.round };
        r.list.push(m);
        r.result = won(m, p) ? nextRound[m.round] : m.round;
        byRun.set(key, r);
      }
    }
    slamRuns.push(...byRun.values());
  }
  const lastIn = (r: SlamRun) => r.list[r.list.length - 1];
  const entryOf = (r: SlamRun) => (r.list[0].w === r.who ? r.list[0].we : r.list[0].le);
  const rankIn = (r: SlamRun) => (lastIn(r).w === r.who ? lastIn(r).wr : lastIn(r).lr);
  const reached = (r: SlamRun) => ({ W: "Won it", F: "Final", SF: "Semifinal", QF: "Quarterfinal" } as Record<string, string>)[r.result] ?? "Last 16";
  /** How a Slam run ended: beaten, or out before the next match */
  const stopped = (r: SlamRun) => {
    const m = lastIn(r);
    if (r.result === "W") return go(m, `The final · beat ${nameOf(m.l)}`);
    return won(m, r.who) ? go(m, `Withdrew after this · ${where(m)}`) : go(m, `Stopped by ${nameOf(m.w)} · ${where(m)}`);
  };

  // Slams in a row reaching a round, of the Slams each player played
  const slamsOf = new Map<string, SlamRun[]>();
  for (const r of slamRuns) push(slamsOf, r.who, r);
  for (const list of slamsOf.values()) list.sort((x, y) => chron(x.list[0], y.list[0]));
  add({
    id: "slams-in-a-row",
    chapter: "events",
    title: "Slams in a row going deep",
    rule: "Slams in a row reaching the quarterfinals or better (or the semifinals, or the final), of the Slams each player played.",
    unit: "Slams in a row",
    views: [
      { id: "qf", label: "Quarterfinals", min: 6 },
      { id: "sf", label: "Semifinals", min: 7 },
      { id: "f", label: "Finals", min: 8 },
    ].map((v) => {
      const streaks: { who: string; runs: SlamRun[]; ended: SlamRun | null; list: SlamRun[] }[] = [];
      for (const [who, list] of slamsOf) {
        let cur: SlamRun[] = [];
        for (const r of list) {
          if ((depth[r.result] ?? 0) >= v.min) cur.push(r);
          else {
            if (cur.length >= 3) streaks.push({ who, runs: cur, ended: r, list });
            cur = [];
          }
        }
        if (cur.length >= 3) streaks.push({ who, runs: cur, ended: null, list });
      }
      return {
        id: v.id,
        label: v.label,
        rows: ranked(
          streaks,
          (x) => x.runs.length,
          (x) => {
            const [a, b] = [x.runs[0].list[0], x.runs[x.runs.length - 1].list[0]];
            const titles = x.runs.filter((r) => r.result === "W").length;
            const newest = lastIn(x.runs[x.runs.length - 1]);
            return row(
              "player",
              [x.who],
              String(x.runs.length),
              `${at(a)} to ${at(b)}${titles ? ` · ${s(titles, "title")}` : ""}`,
              x.ended ? stopped(x.ended) : go(newest, recent(lastIn(x.list[x.list.length - 1])) ? `Still going · latest: ${at(newest)}` : `Never fell short again · last: ${at(newest)}`),
            );
          },
          (p, q) => p.runs[0].list[0].date.localeCompare(q.runs[0].list[0].date),
          15,
        ),
      };
    }),
  });

  add({
    id: "slam-cheapest",
    chapter: "events",
    title: "Slam titles for the fewest games",
    rule: "Slam titles won without dropping a set, by the fewest games lost on the way.",
    unit: "games lost",
    rows: ranked(
      slamRuns
        .filter((r) => r.result === "W" && r.list.every((m) => setsFor(m, r.who).every((st) => st.won)))
        .map((r) => ({ r, lost: r.list.reduce((n, m) => n + gamesOf(m).l, 0) })),
      (x) => -x.lost,
      ({ r, lost }) => row("player", [r.who], String(lost), `${at(lastIn(r))} · ${s(r.list.length, "match", "matches")}, no sets dropped`, stopped(r)),
      (x, y) => lastIn(x.r).date.localeCompare(lastIn(y.r).date),
    ),
  });

  // The biggest titles' champions, and how far down the rankings they came from. No ranking at all with a
  // wildcard or a protected ranking means unranked; otherwise the data is just missing it.
  const unranked = (m: RecordMatch) => m.wr === null && (m.we === "WC" || m.we === "PR");
  const entryWords: Record<string, string> = { Q: "came through qualifying", WC: "on a wildcard", LL: "a lucky loser", PR: "on a protected ranking" };
  add({
    id: "long-shots",
    chapter: "events",
    title: "Champions from furthest down",
    rule: "The lowest-ranked winners of the biggest titles.",
    unit: "ranking",
    views: [
      { id: "slam", label: "Slams", tiers: ["slam"] },
      { id: "big", label: "1000s, finals, Olympics", tiers: ["1000", "finals", "olympics"] },
    ].map((v) => ({
      id: v.id,
      label: v.label,
      rows: ranked(
        matches.filter((m) => isTitle(m) && v.tiers.includes(m.tier) && (m.wr !== null || unranked(m))),
        (m) => m.wr ?? 100_000,
        (m) => row("player", [m.w], m.wr ? `No. ${m.wr}` : "Unranked", `${at(m)}${m.we && entryWords[m.we] ? ` · ${entryWords[m.we]}` : ""}`, go(m, `The final · beat ${nameOf(m.l)}`)),
        (x, y) => x.date.localeCompare(y.date),
        15,
      ),
    })),
  });

  add({
    id: "from-qualifying",
    chapter: "events",
    title: "Furthest from qualifying",
    rule: "The deepest Slam runs by players who had to qualify, or got in as lucky losers.",
    unit: "reached",
    rows: ranked(
      slamRuns.filter((r) => (entryOf(r) === "Q" || entryOf(r) === "LL") && (depth[r.result] ?? 0) >= 5),
      (r) => depth[r.result] ?? 0,
      (r) => row("player", [r.who], reached(r), `${at(lastIn(r))} · ${entryOf(r) === "LL" ? "a lucky loser" : "a qualifier"}${rankIn(r) ? `, ranked ${rankIn(r)}` : ""}`, stopped(r)),
      (x, y) => (rankIn(y) ?? 0) - (rankIn(x) ?? 0),
    ),
  });

  /* ----- Streaks ----- */

  const titlesIn = (r: Run) => r.wins.filter(isTitle).length;
  const streakRow = (r: Run) => {
    const titles = titlesIn(r);
    return row("player", [r.who], String(r.wins.length), `${span(r.wins[0].date, r.wins[r.wins.length - 1].date)}${titles ? ` · ${s(titles, "title")}` : ""}`, endLine(r));
  };
  const earliest = (x: Run, y: Run) => x.wins[0].date.localeCompare(y.wins[0].date);
  /** Every player's runs over some of their matches */
  const runsOver = (pick: (m: RecordMatch, who: string) => boolean, min: number) =>
    [...careers].flatMap(([who, list]) =>
      runsOf(
        who,
        list.filter((m) => pick(m, who)),
        min,
      ),
    );

  add({
    id: "win-streaks",
    chapter: "streaks",
    title: "Longest winning streaks",
    rule: "Matches won in a row, anywhere. Walkovers don't count either way.",
    unit: "wins in a row",
    rows: ranked(runsOver(() => true, 15), (r) => r.wins.length, streakRow, earliest),
  });

  add({
    id: "surface-streaks",
    chapter: "streaks",
    title: "Longest streaks on one surface",
    rule: "Matches won in a row on one surface, whatever happened on the others in between.",
    unit: "wins in a row",
    views: (["clay", "grass", "hard"] as const).map((surface) => ({
      id: surface,
      label: { clay: "Clay", grass: "Grass", hard: "Hard" }[surface],
      rows: ranked(
        runsOver((m) => m.surface === surface, 10),
        (r) => r.wins.length,
        streakRow,
        earliest,
      ),
    })),
  });

  add({
    id: "finals-streaks",
    chapter: "streaks",
    title: "Finals won in a row",
    rule: "Tournament finals won one after another, with no final lost in between.",
    unit: "finals in a row",
    rows: ranked(runsOver(isTitle, 5), (r) => r.wins.length, (r) => row("player", [r.who], String(r.wins.length), span(r.wins[0].date, r.wins[r.wins.length - 1].date), endLine(r)), earliest),
  });

  const top10 = (m: RecordMatch, p: string) => {
    const r = m.w === p ? m.lr : m.wr;
    return r !== null && r <= 10;
  };
  add({
    id: "top10-streaks",
    chapter: "streaks",
    title: "Wins in a row over the top 10",
    rule: "Matches won in a row against players ranked in the top 10 at the time.",
    unit: "wins in a row",
    rows: ranked(runsOver(top10, 8), (r) => r.wins.length, (r) => row("player", [r.who], String(r.wins.length), span(r.wins[0].date, r.wins[r.wins.length - 1].date), endLine(r)), earliest),
  });

  // Sets won in a row: every finished set, in order, through as many matches as it takes
  type SetRun = { who: string; n: number; first: RecordMatch; lastWon: RecordMatch; ended: RecordMatch | null; matches: number };
  const setRuns: SetRun[] = [];
  for (const [who, list] of careers) {
    let cur: SetRun | null = null;
    for (const m of list) {
      for (const st of setsFor(m, who)) {
        if (st.won) {
          if (!cur) cur = { who, n: 0, first: m, lastWon: m, ended: null, matches: 1 };
          else if (cur.lastWon !== m) cur.matches++;
          cur.n++;
          cur.lastWon = m;
        } else {
          if (cur && cur.n >= 20) setRuns.push({ ...cur, ended: m });
          cur = null;
        }
      }
    }
    if (cur && cur.n >= 20) setRuns.push(cur);
  }
  add({
    id: "set-streaks",
    chapter: "streaks",
    title: "Sets won in a row",
    rule: "Finished sets won one after another, across as many matches as it took.",
    unit: "sets in a row",
    rows: ranked(
      setRuns,
      (r) => r.n,
      (r) =>
        row(
          "player",
          [r.who],
          String(r.n),
          `${span(r.first.date, r.lastWon.date)} · ${s(r.matches, "match", "matches")}`,
          r.ended ? go(r.ended, `Ended by ${nameOf(opp(r.ended, r.who))} · ${at(r.ended)}`) : go(r.lastWon, `Still going · latest: ${at(r.lastWon)}`),
        ),
      (x, y) => x.first.date.localeCompare(y.first.date),
    ),
  });

  /* ----- Seasons ----- */

  type Season = { who: string; season: number; list: RecordMatch[]; w: number; l: number; titles: RecordMatch[]; top10: RecordMatch[]; slamW: number; slamL: number; slamTitles: number };
  const seasons = new Map<string, Season>();
  for (const m of matches) {
    for (const p of [m.w, m.l]) {
      const key = `${p}|${m.season}`;
      const x = seasons.get(key) ?? { who: p, season: m.season, list: [], w: 0, l: 0, titles: [], top10: [], slamW: 0, slamL: 0, slamTitles: 0 };
      x.list.push(m);
      if (won(m, p)) {
        x.w++;
        if (isTitle(m)) x.titles.push(m);
        if (top10(m, p)) x.top10.push(m);
      } else x.l++;
      if (m.tier === "slam") {
        if (won(m, p)) x.slamW++;
        else x.slamL++;
        if (m.round === "F" && won(m, p)) x.slamTitles++;
      }
      seasons.set(key, x);
    }
  }
  const seasonList = [...seasons.values()];
  // A season still being played says so
  const year = (x: Season) => (x.season === lastSeason && last < `${lastSeason}-11-25` ? `${x.season} so far` : String(x.season));
  const seasonGo = (x: Season) => {
    const m = x.titles.find((t) => t.tier === "slam") ?? x.titles[0];
    return m ? go(m, `${m.tier === "slam" ? "A Slam title" : "A title"} · ${where(m)}`) : go(x.list.filter((t) => won(t, x.who)).at(-1), `Latest win · ${x.season}`);
  };

  add({
    id: "season-pct",
    chapter: "seasons",
    title: "Best seasons",
    rule: "Seasons of 40 matches or more, by the share of matches won.",
    unit: "won–lost",
    rows: ranked(
      seasonList.filter((x) => x.w + x.l >= 40),
      (x) => x.w / (x.w + x.l),
      (x) => row("player", [x.who], record(x.w, x.l), `${year(x)} · ${pct(x.w, x.w + x.l)} · ${s(x.titles.length, "title")}`, seasonGo(x)),
      (a, b) => b.w - a.w,
    ),
  });

  add({
    id: "season-titles",
    chapter: "seasons",
    title: "Most titles in a season",
    rule: "Tournaments won in one season.",
    unit: "titles",
    rows: ranked(
      seasonList.filter((x) => x.titles.length >= 5),
      (x) => x.titles.length,
      (x) => row("player", [x.who], String(x.titles.length), `${year(x)} · ${record(x.w, x.l)}${x.slamTitles ? ` · ${s(x.slamTitles, "Slam")}` : ""}`, seasonGo(x)),
      (a, b) => a.l - b.l,
    ),
  });

  add({
    id: "season-slams",
    chapter: "seasons",
    title: "Best Slam seasons",
    rule: "Matches won at the four Slams in one season.",
    unit: "won–lost at Slams",
    rows: ranked(
      seasonList.filter((x) => x.slamW >= 18),
      (x) => x.slamW * 100 - x.slamL,
      (x) => row("player", [x.who], record(x.slamW, x.slamL), `${year(x)} · ${x.slamTitles ? s(x.slamTitles, "title") : "no titles"}`, seasonGo(x)),
      (a, b) => a.season - b.season,
    ),
  });

  add({
    id: "season-top10",
    chapter: "seasons",
    title: "Most wins over the top 10 in a season",
    rule: "Wins in one season over players ranked in the top 10 at the time.",
    unit: "top-10 wins",
    rows: ranked(
      seasonList.filter((x) => x.top10.length >= 8),
      (x) => x.top10.length,
      (x) => {
        const best = x.top10.find((m) => m.lr === 1) ?? x.top10[x.top10.length - 1];
        return row("player", [x.who], String(x.top10.length), `${year(x)} · ${record(x.w, x.l)} in all`, go(best, `${best.lr === 1 ? "Beat the No. 1" : "Latest"} · ${nameOf(best.l)}, ${where(best)}`));
      },
      (a, b) => a.season - b.season,
    ),
  });

  /* ----- Matches ----- */

  // Times the data can't have right are left out: over twelve hours, or more than eight minutes a game
  const timed = matches.filter((m) => {
    if (!m.minutes) return false;
    const g = gamesOf(m);
    return m.minutes <= 720 && m.minutes <= 8 * (g.w + g.l);
  });
  const timedFrom = firstMostly(matches, (m) => m.minutes !== null);
  const statsFrom = firstMostly(matches, (m) => m.wst !== null);
  const coverage = (y: number | null, what: string) => (y && y > from ? ` The data has ${what} for most ${tourWord} matches from ${y}.` : "");

  add({
    id: "longest",
    chapter: "matches",
    title: "Longest matches",
    rule: `By time on court.${coverage(timedFrom, "times")}`,
    unit: "hours",
    rows: ranked(
      timed,
      (m) => m.minutes!,
      (m) => row("match", [m.w, m.l], hm(m.minutes!), m.score, go(m, where(m))),
      (x, y) => x.date.localeCompare(y.date),
    ),
  });

  add({
    id: "most-games",
    chapter: "matches",
    title: "Most games in a match",
    rule: "Games played in one match, a tiebreak counting as one game.",
    unit: "games",
    rows: ranked(
      matches.map((m) => ({ m, g: gamesOf(m) })),
      ({ g }) => g.w + g.l,
      ({ m, g }) => row("match", [m.w, m.l], String(g.w + g.l), m.score, go(m, where(m))),
      (x, y) => x.m.date.localeCompare(y.m.date),
    ),
  });

  add({
    id: "aces",
    chapter: "matches",
    title: "Most aces in a match",
    rule: `Aces by one player in one match, won or lost.${coverage(statsFrom, "serve stats")}`,
    unit: "aces",
    rows: ranked(
      matches.flatMap((m) => [
        ...(statsOk(m.wst, m) ? [{ m, who: m.w, aces: m.wst[STAT.ace] }] : []),
        ...(statsOk(m.lst, m) ? [{ m, who: m.l, aces: m.lst[STAT.ace] }] : []),
      ]),
      (x) => x.aces,
      ({ m, who, aces }) => row("pair", [who, opp(m, who)], String(aces), won(m, who) ? `Won ${m.score}` : `Lost ${flipped(m.score)}`, go(m, where(m))),
      (x, y) => x.m.date.localeCompare(y.m.date),
    ),
  });

  add({
    id: "beat-no1",
    chapter: "matches",
    title: "Beat the No. 1 from furthest down",
    rule: "The lowest-ranked players to beat the world No. 1.",
    unit: "ranking",
    rows: ranked(
      matches.filter((m) => m.lr === 1 && m.wr !== null && m.wr > 1),
      (m) => m.wr!,
      (m) => row("match", [m.w, m.l], `No. ${m.wr}`, m.score, go(m, where(m))),
      (x, y) => x.date.localeCompare(y.date),
    ),
  });

  // Comebacks from two sets down, in best-of-five
  const twoDown = (m: RecordMatch) => {
    if (m.bestOf !== 5 || m.outcome !== "completed") return false;
    const sets = parseScore(m.score).sets;
    return sets.length === 5 && sets[0].l > sets[0].w && sets[1].l > sets[1].w;
  };
  const comebacks = new Map<string, RecordMatch[]>();
  const collapses = new Map<string, number>();
  for (const m of matches.filter(twoDown)) {
    push(comebacks, m.w, m);
    collapses.set(m.l, (collapses.get(m.l) ?? 0) + 1);
  }
  add({
    id: "two-sets-down",
    chapter: "matches",
    title: "Most wins from two sets down",
    rule: "Best-of-five matches won after losing the first two sets.",
    unit: "comebacks",
    rows: ranked(
      [...comebacks].filter(([, list]) => list.length >= 3),
      ([, list]) => list.length,
      ([who, list]) => {
        const m = list[list.length - 1];
        const lost = collapses.get(who) ?? 0;
        return row("player", [who], String(list.length), lost ? `And ${s(lost, "match", "matches")} lost from two sets up` : "Never lost from two sets up", go(m, `Latest · ${nameOf(m.l)}, ${where(m)}`));
      },
      ([, a], [, b]) => a[0].date.localeCompare(b[0].date),
    ),
  });

  add({
    id: "fewer-games",
    chapter: "matches",
    title: "Won the match, lost on games",
    rule: "Matches won by the player who won fewer games, by how many fewer.",
    unit: "games fewer",
    rows: ranked(
      matches
        .filter((m) => {
          if (m.outcome !== "completed") return false;
          // The winner has to have won the most sets, or the score is wrong
          const sets = parseScore(m.score).sets;
          const ws = sets.filter((x) => x.w > x.l).length;
          return ws >= 2 && ws > sets.length - ws;
        })
        .map((m) => ({ m, g: gamesOf(m) }))
        .filter(({ g }) => g.w < g.l),
      ({ g }) => g.l - g.w,
      ({ m, g }) => row("match", [m.w, m.l], String(g.l - g.w), `${record(g.w, g.l)} in games · ${m.score}`, go(m, where(m))),
      (x, y) => x.m.date.localeCompare(y.m.date),
    ),
  });

  const fromBagel = new Map<string, RecordMatch[]>();
  for (const m of matches) {
    const first = m.outcome === "completed" ? parseScore(m.score).sets[0] : null;
    if (first && !first.super && first.w === 0 && first.l === 6) push(fromBagel, m.w, m);
  }
  add({
    id: "from-a-bagel",
    chapter: "matches",
    title: "Won after a 0–6 first set",
    rule: "Matches won after losing the first set without winning a game.",
    unit: "times",
    rows: ranked(
      [...fromBagel].filter(([, list]) => list.length >= 2),
      ([, list]) => list.length,
      ([who, list]) => {
        const m = list[list.length - 1];
        return row("player", [who], String(list.length), `Latest: ${m.score} over ${nameOf(m.l)}`, go(m, where(m)));
      },
      ([, a], [, b]) => a[0].date.localeCompare(b[0].date),
    ),
  });

  /* ----- Specialists ----- */

  type Tally = { who: string; bagels: number; lastBagel: RecordMatch | null; doubles: RecordMatch[]; tbW: number; tbL: number; lastTb: RecordMatch | null; decW: number; decL: number; lastDec: RecordMatch | null };
  const tallies: Tally[] = [];
  for (const [who, list] of careers) {
    const t: Tally = { who, bagels: 0, lastBagel: null, doubles: [], tbW: 0, tbL: 0, lastTb: null, decW: 0, decL: 0, lastDec: null };
    for (const m of list) {
      const sets = setsFor(m, who);
      const bagels = sets.filter((x) => x.won && !x.super && Math.max(x.w, x.l) === 6 && Math.min(x.w, x.l) === 0).length;
      t.bagels += bagels;
      if (bagels) t.lastBagel = m;
      if (won(m, who) && m.outcome === "completed" && sets.length === 2 && bagels === 2) t.doubles.push(m);
      for (const x of sets) {
        if (x.super || Math.max(x.w, x.l) !== 7 || Math.min(x.w, x.l) !== 6) continue;
        if (x.won) t.tbW++;
        else t.tbL++;
        t.lastTb = m;
      }
      // A deciding set: the match went the distance
      if (m.outcome === "completed" && parseScore(m.score).sets.length === m.bestOf) {
        if (won(m, who)) t.decW++;
        else t.decL++;
        t.lastDec = m;
      }
    }
    tallies.push(t);
  }

  add({
    id: "bagels",
    chapter: "specialists",
    title: "Most bagels",
    rule: "Sets won 6–0.",
    unit: "6–0 sets",
    rows: ranked(
      tallies.filter((t) => t.bagels >= 20),
      (t) => t.bagels,
      (t) => {
        const double = t.doubles.at(-1);
        return double
          ? row("player", [t.who], String(t.bagels), `${s(t.doubles.length, "double bagel")}, 6–0 6–0`, go(double, `Latest 6–0 6–0 · ${nameOf(double.l)}, ${at(double)}`))
          : row("player", [t.who], String(t.bagels), "Never a 6–0 6–0", go(t.lastBagel, `Latest 6–0 set · ${at(t.lastBagel!)}`));
      },
      (a, b) => b.doubles.length - a.doubles.length,
    ),
  });

  add({
    id: "tiebreaks",
    chapter: "specialists",
    title: "Best in tiebreaks",
    rule: "Players who played 100 tiebreaks or more, by the share they won.",
    unit: "tiebreaks won",
    rows: ranked(
      tallies.filter((t) => t.tbW + t.tbL >= 100),
      (t) => t.tbW / (t.tbW + t.tbL),
      (t) => row("player", [t.who], pct(t.tbW, t.tbW + t.tbL), `${record(t.tbW, t.tbL)} in tiebreaks`, go(t.lastTb, `Latest tiebreak · ${at(t.lastTb!)}`)),
      (a, b) => b.tbW + b.tbL - (a.tbW + a.tbL),
    ),
  });

  add({
    id: "deciders",
    chapter: "specialists",
    title: "Best in deciding sets",
    rule: "Players who played 60 matches or more that went the distance, by the share they won.",
    unit: "deciders won",
    rows: ranked(
      tallies.filter((t) => t.decW + t.decL >= 60),
      (t) => t.decW / (t.decW + t.decL),
      (t) => row("player", [t.who], pct(t.decW, t.decW + t.decL), `${record(t.decW, t.decL)} in deciding sets`, go(t.lastDec, `Latest decider · ${at(t.lastDec!)}`)),
      (a, b) => b.decW + b.decL - (a.decW + a.decL),
    ),
  });

  // Serving and returning, from the matches with serve stats the data can be trusted on
  type Serve = { who: string; matches: number; held: number; served: number; broke: number; returned: number; aces: number; last: RecordMatch };
  const serves = new Map<string, Serve>();
  for (const m of matches) {
    if (!statsOk(m.wst, m) || !statsOk(m.lst, m)) continue;
    for (const [who, mine, theirs] of [
      [m.w, m.wst, m.lst],
      [m.l, m.lst, m.wst],
    ] as const) {
      const x = serves.get(who) ?? { who, matches: 0, held: 0, served: 0, broke: 0, returned: 0, aces: 0, last: m };
      x.matches++;
      x.served += mine[STAT.games];
      x.held += mine[STAT.games] - (mine[STAT.bpFaced] - mine[STAT.bpSaved]);
      x.returned += theirs[STAT.games];
      x.broke += theirs[STAT.bpFaced] - theirs[STAT.bpSaved];
      x.aces += mine[STAT.ace];
      x.last = m;
      serves.set(who, x);
    }
  }
  const servers = [...serves.values()].filter((x) => x.matches >= 150);
  const statsRule = `for players with 150 matches or more with serve stats.${coverage(statsFrom, "serve stats")}`;

  add({
    id: "hold",
    chapter: "specialists",
    title: "Hardest to break",
    rule: `Share of service games held, ${statsRule}`,
    unit: "service games held",
    rows: ranked(
      servers,
      (x) => x.held / x.served,
      (x) => row("player", [x.who], pct(x.held, x.served), `${s(x.aces, "ace")} in ${s(x.matches, "match", "matches")}`, go(x.last, `Latest · ${at(x.last)}`)),
      (a, b) => b.matches - a.matches,
    ),
  });

  add({
    id: "break",
    chapter: "specialists",
    title: "Best returners",
    rule: `Share of the other player's service games broken, ${statsRule}`,
    unit: "return games won",
    rows: ranked(
      servers,
      (x) => x.broke / x.returned,
      (x) => row("player", [x.who], pct(x.broke, x.returned), `${s(x.broke, "break")} in ${s(x.matches, "match", "matches")}`, go(x.last, `Latest · ${at(x.last)}`)),
      (a, b) => b.matches - a.matches,
    ),
  });

  const no1Wins = new Map<string, RecordMatch[]>();
  for (const m of matches) if (m.lr === 1) push(no1Wins, m.w, m);
  add({
    id: "no1-wins",
    chapter: "specialists",
    title: "Most wins over the No. 1",
    rule: "Wins over whoever was ranked No. 1 at the time.",
    unit: "wins",
    rows: ranked(
      [...no1Wins].filter(([, list]) => list.length >= 3),
      ([, list]) => list.length,
      ([who, list]) => {
        const beaten = [...new Set(list.map((m) => m.l))];
        const m = list[list.length - 1];
        const names = beaten.length > 4 ? [...beaten.slice(0, 3).map(nameOf), `${beaten.length - 3} others`] : beaten.map(nameOf);
        return row("player", [who], String(list.length), `Over ${names.slice(0, -1).join(", ")}${names.length > 1 ? " and " : ""}${names[names.length - 1]}`, go(m, `Latest · ${nameOf(m.l)}, ${where(m)}`));
      },
      ([, a], [, b]) => a[0].date.localeCompare(b[0].date),
    ),
  });

  const titlesWithAge = matches.filter((m) => isTitle(m) && m.wa !== null);
  add({
    id: "ages",
    chapter: "specialists",
    title: "Youngest and oldest champions",
    rule: "Age on the day of the final, for any title.",
    unit: "age",
    views: [
      { id: "young", label: "Youngest", sign: -1 },
      { id: "old", label: "Oldest", sign: 1 },
    ].map((v) => ({
      id: v.id,
      label: v.label,
      rows: ranked(
        titlesWithAge,
        (m) => v.sign * m.wa!,
        (m) => row("player", [m.w], age(m.wa!), `${at(m)} · beat ${nameOf(m.l)}`, go(m, `The final · ${at(m)}`)),
        (x, y) => x.date.localeCompare(y.date),
      ),
    })),
  });

  // Now every name is known: a surname, unless two players on the boards share it
  const names = displayNames([...named].flatMap((k) => (players[k] ? [players[k]] : [])));
  const fill = (text: string) => text.replace(/\{([a-z]+:[^}]+)\}/g, (_, k: string) => names.get(k) ?? players[k]?.name ?? "someone");
  for (const b of boards)
    for (const v of b.views)
      for (const r of v.rows) {
        r.note = fill(r.note);
        if (r.go) r.go.text = fill(r.go.text);
      }

  return {
    tour,
    from,
    last,
    boards,
    names: Object.fromEntries(names),
    full: Object.fromEntries([...names.keys()].map((k) => [k, players[k].name])),
  };
}
