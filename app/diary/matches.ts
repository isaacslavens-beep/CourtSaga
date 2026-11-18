// Matches: every match a tour has played, to sort by any of its numbers and filter by anything. This file is
// what both ends share: the catalogue of statistics, filters and oddities, how a search is written into the
// address (so any search is a link), and how each number is shown. The engine that runs a search is
// match-index.ts; the page is matches-ui.tsx.

import type { Round, Tour } from "./library";

/* ---------- The statistics ---------- */

export type StatGroup = "result" | "length" | "points" | "serve" | "return" | "players" | "event";

export const statGroups: { id: StatGroup; label: string }[] = [
  { id: "result", label: "Drama and the scoreline" },
  { id: "length", label: "Length" },
  { id: "points", label: "Points" },
  { id: "serve", label: "Serve" },
  { id: "return", label: "Return" },
  { id: "players", label: "The players" },
  { id: "event", label: "When" },
];

// How a number reads: a count, a percentage, minutes as "4 h 48", a tiebreak as "24–22", a set as "70–68",
// a difference with its sign, a ranking as "No. 172"
export type Format = "int" | "pct" | "minutes" | "tiebreak" | "set" | "signed" | "rank" | "age" | "cm" | "seconds" | "ratio" | "times" | "year" | "drama";

// Which way is remarkable on a match's page: its most, its least, either, or neither
type Extreme = "most" | "least" | "both" | "none";

export type StatDef = {
  id: string;
  label: string; // "Aces"
  short: string; // a column head: "Aces"
  group: StatGroup;
  per: "player" | "match"; // one number for each player, or one for the match
  sum?: boolean; // the two players' numbers add up to a match total ("both players")
  format: Format;
  extreme: Extreme;
  hint: string; // what it is, in a line
  needs?: "stats" | "minutes" | "rank" | "age" | "height" | "seed"; // what the data has to record for it
};

export const stats: StatDef[] = [
  // Drama and the scoreline
  { id: "drama", label: "Drama score", short: "Drama", group: "result", per: "match", format: "drama", extreme: "both", hint: "0 to 100, from how close the points were, a deciding set, sets won from behind, a tight finish, tiebreaks and length. Only for matches played to the end." },
  { id: "gameMargin", label: "Game margin", short: "Games ±", group: "result", per: "match", format: "signed", extreme: "least", hint: "The winner's games minus the loser's. Below zero: won on fewer games." },
  { id: "pointMargin", label: "Point margin", short: "Points ±", group: "result", per: "match", format: "signed", extreme: "least", hint: "The winner's points minus the loser's. Below zero: won with fewer points.", needs: "stats" },
  { id: "games", label: "Games won", short: "Games", group: "result", per: "player", format: "int", extreme: "none", hint: "Games each player won, tiebreaks counting as one." },
  { id: "bagels", label: "Bagels", short: "6–0 sets", group: "result", per: "player", sum: true, format: "int", extreme: "most", hint: "Sets won 6–0." },
  { id: "rankRatio", label: "Upset size", short: "Upset", group: "result", per: "match", format: "times", extreme: "most", hint: "The winner's ranking divided by the loser's. Above 1, the lower-ranked player won: No. 178 beating No. 1 is ×178, No. 40 beating No. 20 is ×2.", needs: "rank" },

  // Length
  { id: "minutes", label: "Match length", short: "Length", group: "length", per: "match", format: "minutes", extreme: "both", hint: "From first point to last, as recorded.", needs: "minutes" },
  { id: "totalGames", label: "Games played", short: "Games", group: "length", per: "match", format: "int", extreme: "most", hint: "Every game in the match, a tiebreak counting as one." },
  { id: "sets", label: "Sets played", short: "Sets", group: "length", per: "match", format: "int", extreme: "none", hint: "Sets played, an unfinished one included." },
  { id: "tiebreaks", label: "Tiebreaks", short: "Tiebreaks", group: "length", per: "match", format: "int", extreme: "most", hint: "Sets settled in a tiebreak." },
  { id: "longestTb", label: "Longest tiebreak", short: "Tiebreak", group: "length", per: "match", format: "tiebreak", extreme: "most", hint: "The match's longest tiebreak, by points played. To filter, count the points: 24–22 is 46. A short one is read as first to 7 when the data doesn't say." },
  { id: "longestSet", label: "Longest set", short: "Set", group: "length", per: "match", format: "set", extreme: "most", hint: "The match's longest finished set, by games played: 70–68 is 138." },
  { id: "points", label: "Points played", short: "Points", group: "length", per: "match", format: "int", extreme: "most", hint: "Every point served in the match.", needs: "stats" },
  { id: "pace", label: "Seconds per point", short: "Pace", group: "length", per: "match", format: "seconds", extreme: "both", hint: "The match's length divided by its points: changeovers and breaks included.", needs: "minutes" },

  // Points
  { id: "pointsWon", label: "Points won", short: "Points", group: "points", per: "player", format: "int", extreme: "none", hint: "On serve and return.", needs: "stats" },
  { id: "pointShare", label: "Share of points won", short: "Points %", group: "points", per: "player", format: "pct", extreme: "both", hint: "Points won out of every point played.", needs: "stats" },
  { id: "dominance", label: "Dominance ratio", short: "DR", group: "points", per: "player", format: "ratio", extreme: "both", hint: "Return points won % divided by serve points lost %. Above 1: did better on return than the opponent.", needs: "stats" },

  // Serve
  { id: "aces", label: "Aces", short: "Aces", group: "serve", per: "player", sum: true, format: "int", extreme: "most", hint: "Serves the returner didn't touch.", needs: "stats" },
  { id: "df", label: "Double faults", short: "DFs", group: "serve", per: "player", sum: true, format: "int", extreme: "most", hint: "Both serves out.", needs: "stats" },
  { id: "aceRate", label: "Ace rate", short: "Ace %", group: "serve", per: "player", format: "pct", extreme: "most", hint: "Aces out of every point served.", needs: "stats" },
  { id: "firstIn", label: "First serves in", short: "1st in", group: "serve", per: "player", format: "pct", extreme: "both", hint: "First serves in, out of every point served.", needs: "stats" },
  { id: "firstWon", label: "First-serve points won", short: "1st won", group: "serve", per: "player", format: "pct", extreme: "both", hint: "Points won when the first serve went in.", needs: "stats" },
  { id: "secondWon", label: "Second-serve points won", short: "2nd won", group: "serve", per: "player", format: "pct", extreme: "both", hint: "Points won on a second serve, double faults included.", needs: "stats" },
  { id: "serveWon", label: "Service points won", short: "Serve %", group: "serve", per: "player", format: "pct", extreme: "both", hint: "Every point served, first serve or second.", needs: "stats" },
  { id: "held", label: "Service games held", short: "Held %", group: "serve", per: "player", format: "pct", extreme: "least", hint: "Service games won, out of all served.", needs: "stats" },
  { id: "bpFaced", label: "Break points faced", short: "BP faced", group: "serve", per: "player", sum: true, format: "int", extreme: "most", hint: "Points where losing would lose the service game.", needs: "stats" },
  { id: "bpSaved", label: "Break points saved", short: "BP saved", group: "serve", per: "player", sum: true, format: "int", extreme: "most", hint: "Break points faced and won.", needs: "stats" },
  { id: "bpSavedPct", label: "Break points saved %", short: "Saved %", group: "serve", per: "player", format: "pct", extreme: "none", hint: "Break points saved out of those faced.", needs: "stats" },
  { id: "broken", label: "Times broken", short: "Broken", group: "serve", per: "player", sum: true, format: "int", extreme: "most", hint: "Service games lost.", needs: "stats" },

  // Return
  { id: "returnWon", label: "Return points won", short: "Return %", group: "return", per: "player", format: "pct", extreme: "both", hint: "Points won on the opponent's serve.", needs: "stats" },
  { id: "breaks", label: "Breaks of serve", short: "Breaks", group: "return", per: "player", format: "int", extreme: "none", hint: "The opponent's service games won.", needs: "stats" },
  { id: "bpChances", label: "Break points earned", short: "BP chances", group: "return", per: "player", format: "int", extreme: "none", hint: "Chances to break the opponent's serve.", needs: "stats" },
  { id: "bpConverted", label: "Break points converted", short: "Conv. %", group: "return", per: "player", format: "pct", extreme: "none", hint: "Breaks out of break points earned.", needs: "stats" },

  // The players
  { id: "rank", label: "Ranking", short: "Rank", group: "players", per: "player", format: "rank", extreme: "most", hint: "Their ranking coming into the event. Higher numbers are lower ranks.", needs: "rank" },
  { id: "seed", label: "Seed", short: "Seed", group: "players", per: "player", format: "int", extreme: "none", hint: "Their seeding at the event. Unseeded players have none.", needs: "seed" },
  { id: "age", label: "Age", short: "Age", group: "players", per: "player", format: "age", extreme: "both", hint: "In years, on the day the event began.", needs: "age" },
  { id: "height", label: "Height", short: "Height", group: "players", per: "player", format: "cm", extreme: "both", hint: "In centimetres, where the data has it.", needs: "height" },
  { id: "ageGap", label: "Age gap", short: "Age ±", group: "players", per: "match", format: "signed", extreme: "both", hint: "The winner's age minus the loser's, in years. Below zero: the younger player won.", needs: "age" },
  { id: "heightGap", label: "Height gap", short: "Height ±", group: "players", per: "match", format: "signed", extreme: "both", hint: "The winner's height minus the loser's, in centimetres.", needs: "height" },

  // When
  { id: "season", label: "Season", short: "Season", group: "event", per: "match", format: "year", extreme: "none", hint: "The year the match counts towards." },
];

export const statById = new Map(stats.map((s) => [s.id, s]));

/* ---------- Sides: whose number ---------- */

// w winner, l loser, x either player, b both together (added up), m the match's own number, and with one
// player picked, p that player and o their opponent
export type Side = "w" | "l" | "x" | "b" | "m" | "p" | "o";

export const sideLabels: Record<Side, string> = { w: "Winner", l: "Loser", x: "Either player", b: "Both players", m: "", p: "Player", o: "Opponent" };

/** The sides a statistic can be read from: with a player picked, theirs and their opponent's come first */
export function sidesOf(stat: StatDef, player: boolean): Side[] {
  if (stat.per === "match") return ["m"];
  const sides: Side[] = player ? ["p", "o", "w", "l", "x"] : ["w", "l", "x"];
  if (stat.sum) sides.splice(player ? 2 : 0, 0, "b");
  return sides;
}

/** "Aces, both players", "Loser's ranking", "Drama score" */
export function statName(stat: StatDef, side: Side, player?: string) {
  if (side === "m") return stat.label;
  if (side === "b") return `${stat.label}, both players`;
  if (side === "x") return `${stat.label}, either player`;
  const who = side === "p" ? (player ?? "Player") : side === "o" ? `${player ? `${player}'s opponent` : "Opponent"}` : sideLabels[side];
  return `${who}'s ${stat.label.charAt(0).toLowerCase()}${stat.label.slice(1)}`;
}

/* ---------- Filters by kind ---------- */

export type FacetId = "tier" | "surface" | "court" | "round" | "format" | "ending" | "wentry" | "lentry" | "hands" | "nations";

export type FacetDef = { id: FacetId; label: string; values: { id: string; label: string }[]; hint?: string };

const entries = [
  { id: "Q", label: "Qualifier" },
  { id: "WC", label: "Wildcard" },
  { id: "LL", label: "Lucky loser" },
  { id: "PR", label: "Protected ranking" },
  { id: "SE", label: "Special exempt" },
  { id: "ALT", label: "Alternate" },
  { id: "direct", label: "Direct" },
];

export function facetsFor(tour: Tour): FacetDef[] {
  return [
    {
      id: "tier",
      label: "Tournament level",
      values: [
        { id: "slam", label: "Grand Slams" },
        { id: "1000", label: tour === "atp" ? "Masters 1000s" : "WTA 1000s" },
        { id: "finals", label: "Tour finals" },
        { id: "olympics", label: "Olympics" },
        { id: "500", label: "500s" },
        { id: "250", label: "250s" },
        { id: "team", label: "Team cups" },
        { id: "other", label: "Other" },
      ],
    },
    {
      id: "surface",
      label: "Surface",
      values: [
        { id: "hard", label: "Hard" },
        { id: "clay", label: "Clay" },
        { id: "grass", label: "Grass" },
        { id: "carpet", label: "Carpet" },
      ],
    },
    {
      id: "court",
      label: "Indoors or out",
      values: [
        { id: "indoor", label: "Indoors" },
        { id: "outdoor", label: "Outdoors" },
      ],
    },
    {
      id: "round",
      label: "Round",
      values: [
        { id: "F", label: "Final" },
        { id: "SF", label: "Semifinal" },
        { id: "QF", label: "Quarterfinal" },
        { id: "R16", label: "Last 16" },
        { id: "R32", label: "Last 32" },
        { id: "R64", label: "Last 64" },
        { id: "R128", label: "Last 128" },
        { id: "RR", label: "Round robin" },
        { id: "BR", label: "Bronze medal" },
      ],
    },
    {
      id: "format",
      label: "Format",
      values: [
        { id: "3", label: "Best of three" },
        { id: "5", label: "Best of five" },
      ],
    },
    {
      id: "ending",
      label: "How it ended",
      values: [
        { id: "completed", label: "Played to the end" },
        { id: "retired", label: "Retirement" },
        { id: "defaulted", label: "Default" },
        { id: "abandoned", label: "Abandoned" },
      ],
    },
    { id: "wentry", label: "How the winner got in", values: entries },
    { id: "lentry", label: "How the loser got in", values: entries },
    {
      id: "hands",
      label: "Left-handers",
      values: [
        { id: "won", label: "A left-hander won" },
        { id: "lost", label: "A left-hander lost" },
        { id: "both", label: "Both left-handed" },
        { id: "none", label: "No left-hander" },
      ],
      hint: "Where the data knows the hands.",
    },
    {
      id: "nations",
      label: "Nations",
      values: [
        { id: "same", label: "Same country" },
        { id: "different", label: "Different countries" },
      ],
    },
  ];
}

/* ---------- Oddities: matches that went against the numbers ---------- */

export type OddDef = { id: string; label: string; hint: string; needs?: "stats" };

export const oddities: OddDef[] = [
  { id: "fewer-points", label: "Won with fewer points", hint: "The winner won fewer points than the loser.", needs: "stats" },
  { id: "fewer-games", label: "Won with fewer games", hint: "The winner won fewer games than the loser." },
  { id: "two-down", label: "Back from two sets down", hint: "The winner lost the first two sets." },
  { id: "first-set", label: "Won after losing the first set", hint: "The winner lost the opening set." },
  { id: "bagel", label: "Won despite a 0–6 set", hint: "The winner lost a set 0–6 and still won." },
  { id: "more-broken", label: "Won despite being broken more", hint: "The winner lost more service games than the loser did.", needs: "stats" },
  { id: "no-breaks", label: "Won without breaking serve", hint: "The winner never broke: every set the winner took went to a tiebreak.", needs: "stats" },
  { id: "saved-all", label: "Saved every break point (10+)", hint: "A player faced at least 10 break points and saved all of them.", needs: "stats" },
  { id: "all-tb", label: "Every set a tiebreak", hint: "Two sets or more, all settled in a tiebreak." },
  { id: "decider-tb", label: "Final-set tiebreak", hint: "A deciding set settled in a tiebreak." },
  { id: "long-decider", label: "Final set past 7–5", hint: "A deciding set played on, advantage-style, beyond 7–5." },
  { id: "double-bagel", label: "Double bagel", hint: "The winner won at least two sets 6–0." },
];

export const oddById = new Map(oddities.map((o) => [o.id, o]));

/* ---------- A search, and how it's written in the address ---------- */

export type Range = { stat: string; side: Side; min: number | null; max: number | null };
export type Sort = { stat: string; side: Side; dir: "desc" | "asc" };

export type Search = {
  players: string[]; // player ids (without the tour), the first one the one "Player" means
  events: string[];
  nations: string[]; // IOC codes: a player from each
  result: "won" | "lost" | null; // the first player's
  ranges: Range[];
  facets: Partial<Record<FacetId, string[]>>;
  odd: string[];
  sort: Sort; // "date" sorts by when it was played
  page: number; // from 0
};

export const PAGE_SIZE = 50;
export const newestFirst: Sort = { stat: "date", side: "m", dir: "desc" };
export const emptySearch: Search = { players: [], events: [], nations: [], result: null, ranges: [], facets: {}, odd: [], sort: newestFirst, page: 0 };

const sides = new Set<Side>(["w", "l", "x", "b", "m", "p", "o"]);
const facetIds = new Set<FacetId>(["tier", "surface", "court", "round", "format", "ending", "wentry", "lentry", "hands", "nations"]);
const numberOrNull = (s: string | undefined) => (s === undefined || s.trim() === "" || !Number.isFinite(Number(s)) ? null : Number(s));

/** Whether a side makes sense for a statistic, given whether a player is picked */
function sideFits(stat: StatDef, side: Side, player: boolean) {
  return sidesOf(stat, player).includes(side);
}

/**
 * A search from the address: s=aces.b.d (sort), r=aces.l_20_ (a range, either end left open),
 * t=tier_slam_1000 (a filter's values), o=fewer-points, p=F324 (players), e=Wimbledon, c=SUI, res=won,
 * pg=2. Anything it can't read is left out.
 */
export function readSearch(params: URLSearchParams): Search {
  const players = params.getAll("p").map((p) => p.slice(0, 20)).filter(Boolean).slice(0, 2);
  const player = players.length > 0;
  const ranges: Range[] = [];
  for (const raw of params.getAll("r").slice(0, 8)) {
    const [head, lo, hi] = raw.split("_");
    const [statId, side] = (head ?? "").split(".") as [string, Side];
    const stat = statById.get(statId);
    if (!stat || !sides.has(side) || !sideFits(stat, side, player)) continue;
    const min = numberOrNull(lo);
    const max = numberOrNull(hi);
    // Neither bound yet (a filter just added): only the matches with the number recorded
    ranges.push({ stat: statId, side, min, max });
  }
  const facets: Search["facets"] = {};
  for (const raw of params.getAll("t")) {
    const [id, ...values] = raw.split("_");
    if (facetIds.has(id as FacetId) && values.length) facets[id as FacetId] = values.slice(0, 12);
  }
  let sort = newestFirst;
  const [sortStat, sortSide, dir] = (params.get("s") ?? "").split(".");
  const sorted = statById.get(sortStat);
  if (sortStat === "date" && (dir === "a" || dir === "d")) sort = { stat: "date", side: "m", dir: dir === "a" ? "asc" : "desc" };
  else if (sorted && sides.has(sortSide as Side) && sideFits(sorted, sortSide as Side, player)) sort = { stat: sortStat, side: sortSide as Side, dir: dir === "a" ? "asc" : "desc" };
  const result = params.get("res");
  return {
    players,
    events: params.getAll("e").map((e) => e.slice(0, 80)).slice(0, 4),
    nations: params.getAll("c").map((c) => c.slice(0, 3).toUpperCase()).slice(0, 2),
    result: player && (result === "won" || result === "lost") ? result : null,
    ranges,
    facets,
    odd: params.getAll("o").filter((o) => oddById.has(o)).slice(0, 6),
    sort,
    page: Math.max(0, Math.min(5000, (Number(params.get("pg")) || 1) - 1)),
  };
}

const trim = (n: number) => String(Math.round(n * 1000) / 1000);

/** The address for a search: the same parameters readSearch reads, defaults left out */
export function writeSearch(s: Search): URLSearchParams {
  const params = new URLSearchParams();
  for (const p of s.players) params.append("p", p);
  if (s.result) params.set("res", s.result);
  for (const e of s.events) params.append("e", e);
  for (const c of s.nations) params.append("c", c);
  if (s.sort.stat !== "date" || s.sort.dir !== "desc") params.set("s", `${s.sort.stat}.${s.sort.side}.${s.sort.dir === "asc" ? "a" : "d"}`);
  for (const r of s.ranges) params.append("r", `${r.stat}.${r.side}_${r.min === null ? "" : trim(r.min)}_${r.max === null ? "" : trim(r.max)}`);
  for (const [id, values] of Object.entries(s.facets)) if (values?.length) params.append("t", [id, ...values].join("_"));
  for (const o of s.odd) params.append("o", o);
  if (s.page > 0) params.set("pg", String(s.page + 1));
  return params;
}

/* ---------- Example searches, one click each ---------- */

export const examples: { id: string; label: string; query: string; tours?: Tour[] }[] = [
  { id: "drama-finals", label: "Most dramatic Slam finals", query: "s=drama.m.d&t=tier_slam&t=round_F" },
  { id: "marathons", label: "Marathons", query: "s=minutes.m.d" },
  { id: "fewer-points", label: "Won with fewer points", query: "o=fewer-points&s=pointMargin.m.a" },
  { id: "giant-killings", label: "Giant-killings", query: "s=rankRatio.m.d" },
  { id: "two-down", label: "Back from two sets down", query: "o=two-down&s=drama.m.d", tours: ["atp"] },
  { id: "tiebreaks", label: "Longest tiebreaks", query: "s=longestTb.m.d" },
  { id: "aces", label: "Most aces in a match", query: "s=aces.x.d" },
  { id: "no-1", label: "Beat the No. 1 from furthest down", query: "r=rank.l__1&s=rank.w.d" },
  { id: "fewer-games", label: "Won the match, lost on games", query: "o=fewer-games&s=gameMargin.m.a" },
  { id: "double-faults", label: "Double-fault meltdowns", query: "s=df.x.d" },
  { id: "most-games", label: "Most games in a match", query: "s=totalGames.m.d" },
  { id: "bagel", label: "Won despite a 0–6 set", query: "o=bagel&s=drama.m.d" },
  { id: "quickest", label: "Quickest best-of-fives", query: "t=format_5&t=ending_completed&s=minutes.m.a", tours: ["atp"] },
  { id: "teens", label: "Teenagers beating the top 10", query: "r=age.w__19.999&r=rank.l__10&s=age.w.a" },
  { id: "unbreakable", label: "Saved every break point", query: "o=saved-all&s=bpSaved.x.d" },
  { id: "serving", label: "Best serving in five sets", query: "t=format_5&r=points.m_250_&s=serveWon.w.d", tours: ["atp"] },
];

/* ---------- Showing numbers ---------- */

const minus = (s: string) => s.replace("-", "−");

/** A tiebreak's or a set's length back to its score: the total before the point, the loser's after (46.022 → "24–22") */
export function pairScore(v: number) {
  const total = Math.floor(v + 1e-6);
  const lost = Math.round((v - total) * 1000);
  return `${total - lost}–${lost}`;
}

export function formatValue(format: Format, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  switch (format) {
    case "pct":
      return `${v.toFixed(1)}%`;
    case "minutes": {
      const h = Math.floor(v / 60);
      return h ? `${h} h ${String(Math.round(v % 60)).padStart(2, "0")}` : `${Math.round(v)} min`;
    }
    case "tiebreak":
    case "set":
      return pairScore(v);
    case "signed":
      return v > 0 ? `+${Number(v.toFixed(1))}` : v < 0 ? minus(String(Number(v.toFixed(1)))) : "0";
    case "rank":
      return `No. ${Math.round(v)}`;
    case "age":
      return v.toFixed(1);
    case "cm":
      return `${Math.round(v)} cm`;
    case "seconds":
      return `${Math.round(v)} s`;
    case "ratio":
      return v.toFixed(2);
    case "times":
      return `×${v >= 10 ? Math.round(v) : v >= 1 ? v.toFixed(1) : v.toFixed(2)}`;
    case "year":
      return String(Math.round(v));
    case "drama":
      return String(Math.round(v));
    default:
      return Math.round(v).toLocaleString("en-GB");
  }
}

/** A number as typed into a filter: percentages and the like as they read, minutes as minutes */
export const inputStep = (format: Format) => (format === "pct" || format === "age" || format === "ratio" || format === "times" ? 0.1 : 1);

/* ---------- What the engine sends back ---------- */

export type Hist = { lo: number; hi: number; step: number; bins: number[]; n: number; q: [number, number, number, number, number] }; // q: 1st, 10th, 50th, 90th, 99th percentiles

export type ResultPlayer = { key: string; name: string; full: string; initials: string; ioc: string | null; rank: number | null; seed: number | null; entry: string | null };

export type ResultCell = { value: number | null; w?: number | null; l?: number | null };

export type ResultRow = {
  id: string;
  n: number; // place in the sorted list, from 1
  event: string;
  season: number;
  date: string; // YYYY-MM-DD
  round: Round;
  tier: string;
  surface: string;
  score: string;
  w: ResultPlayer;
  l: ResultPlayer;
  cells: ResultCell[]; // one for each column the search shows: the sort, then each range
};

export type MatchesResult = {
  tour: Tour;
  all: number; // every match the tour has
  total: number; // the ones the search found
  sortable: number; // of those, the ones with the sort's number recorded (the rest come last)
  page: number;
  rows: ResultRow[];
  sortHist: Hist | null;
  rangeHists: (Hist | null)[]; // for each range, over the matches every other filter lets through
  odd: Record<string, number>; // how many of the found matches have each oddity
  facets: Partial<Record<FacetId, Record<string, number>>>; // each filter's values, counted over the matches every other filter lets through
  people: Record<string, { name: string; ioc: string | null; matches: number }>; // the players the search names
  from: number;
  last: string;
};

export type Suggestion =
  | { kind: "player"; id: string; name: string; ioc: string | null; matches: number; years: [number, number]; tour: Tour }
  | { kind: "event"; name: string; matches: number }
  | { kind: "nation"; ioc: string; matches: number };

/* ---------- A match's own page: how extreme it was ---------- */

export type Neighbour = { id: string; label: string; value: number };

export type Standing = {
  stat: string;
  side: Side;
  dir: "desc" | "asc";
  value: number;
  better: number; // matches with a more extreme number
  ties: number; // matches with the same number, this one included
  n: number; // matches with the number recorded
  above: Neighbour | null; // the next match more extreme
  below: Neighbour | null; // the next match less extreme
};

export type DramaPart = { id: string; label: string; got: number; max: number; why: string };

export type Extremes = {
  tour: Tour;
  drama: { score: number; parts: DramaPart[]; better: number; ties: number; n: number; estimated: boolean } | null;
  standings: Standing[];
  names: { w: string; l: string };
};

/* ---------- Countries, as the data codes them ---------- */

export const nationNames: Record<string, string> = {
  USA: "United States", FRA: "France", RUS: "Russia", GER: "Germany", ESP: "Spain", ITA: "Italy", AUS: "Australia", CZE: "Czechia",
  GBR: "Great Britain", ARG: "Argentina", CHN: "China", JPN: "Japan", ROU: "Romania", CRO: "Croatia", BRA: "Brazil", UKR: "Ukraine",
  NED: "Netherlands", SWE: "Sweden", KOR: "South Korea", IND: "India", SUI: "Switzerland", CAN: "Canada", AUT: "Austria", MEX: "Mexico",
  SVK: "Slovakia", RSA: "South Africa", BEL: "Belgium", HUN: "Hungary", POL: "Poland", NZL: "New Zealand", SRB: "Serbia", COL: "Colombia",
  ECU: "Ecuador", SLO: "Slovenia", SVN: "Slovenia", HKG: "Hong Kong", MAR: "Morocco", THA: "Thailand", BUL: "Bulgaria", TPE: "Chinese Taipei",
  PAR: "Paraguay", PRY: "Paraguay", BOL: "Bolivia", INA: "Indonesia", PER: "Peru", BLR: "Belarus", KAZ: "Kazakhstan", DOM: "Dominican Republic",
  DEN: "Denmark", NOR: "Norway", GRE: "Greece", EST: "Estonia", FIN: "Finland", IRL: "Ireland", EGY: "Egypt", VEN: "Venezuela",
  GEO: "Georgia", LAT: "Latvia", LVA: "Latvia", CHI: "Chile", ISR: "Israel", URU: "Uruguay", URY: "Uruguay", POR: "Portugal", PRT: "Portugal",
  UZB: "Uzbekistan", MDA: "Moldova", PHI: "Philippines", LTU: "Lithuania", LUX: "Luxembourg", CYP: "Cyprus", IRI: "Iran", TUR: "Turkey",
  SGP: "Singapore", BIH: "Bosnia and Herzegovina", PUR: "Puerto Rico", LBN: "Lebanon", MAS: "Malaysia", GUA: "Guatemala", TUN: "Tunisia",
  PAK: "Pakistan", ZIM: "Zimbabwe", BAR: "Barbados", ESA: "El Salvador", BAH: "Bahamas", CRC: "Costa Rica", ALG: "Algeria", SRI: "Sri Lanka",
  JAM: "Jamaica", SYR: "Syria", KGZ: "Kyrgyzstan", CUB: "Cuba", PAN: "Panama", MNE: "Montenegro", TKM: "Turkmenistan", TTO: "Trinidad and Tobago",
  AHO: "Netherlands Antilles", KUW: "Kuwait", BER: "Bermuda", MON: "Monaco", VIE: "Vietnam", ARM: "Armenia", MLT: "Malta", NAM: "Namibia",
  NGR: "Nigeria", MAD: "Madagascar", ISL: "Iceland", KEN: "Kenya", OMA: "Oman", BEN: "Benin", HON: "Honduras", MKD: "North Macedonia",
  BOT: "Botswana", TJK: "Tajikistan", QAT: "Qatar", HAI: "Haiti", AZE: "Azerbaijan", AND: "Andorra", CIV: "Ivory Coast", BRN: "Bahrain",
  TOG: "Togo", JOR: "Jordan", KSA: "Saudi Arabia", GHA: "Ghana", MGL: "Mongolia", LIE: "Liechtenstein", GUM: "Guam", VAN: "Vanuatu",
  MRI: "Mauritius", UAE: "United Arab Emirates", SAM: "Samoa", IRQ: "Iraq", NMI: "Northern Mariana Islands", SOL: "Solomon Islands",
  MHL: "Marshall Islands", COK: "Cook Islands", ANT: "Antigua and Barbuda", PNG: "Papua New Guinea", LIB: "Lebanon", BDI: "Burundi",
};
