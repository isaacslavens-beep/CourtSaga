// The diary's vocabulary: matches, a fan's entries, and the small rules the log, the ranking and the saga
// share. The landing page's demos run these over a sample log (app/demos/sample.ts); signed-in fans run
// them over their own diary, with matches from the database.

export type Tour = "atp" | "wta";
export type Surface = "hard" | "clay" | "grass" | "carpet" | "unknown";
// One display tier per tour: the WTA's 1000s and the ATP's Masters 1000s are both "1000"
export type Tier = "slam" | "1000" | "500" | "250" | "finals" | "olympics" | "team" | "other";
export type WatchMode = "Live" | "TV" | "Stream";
// As the match data has them, plus the Olympic bronze medal match (BR) and the Next Gen Finals' third-place match (3P)
export type Round = "R128" | "R64" | "R32" | "R16" | "QF" | "SF" | "F" | "RR" | "BR" | "3P";
// How a match ended. Walkovers and empty scores never happened as matches, so they never reach a diary.
export type Outcome = "completed" | "retired" | "defaulted" | "abandoned" | "walkover" | "unplayed";

export type Match = {
  id: string;
  event: string; // tournament and year, e.g. "Wimbledon 2023"
  date: string; // when it was played: "YYYY-MM", or from the match data a "YYYY-MM-DD" estimate. Only the month is shown.
  round: Round;
  stage?: string | null; // a team event's tie, e.g. "World Group QF · AUS vs USA"
  tour: Tour;
  tier?: Tier;
  surface: Surface;
  winner: string; // what the site calls each player: a surname, or a full name where two would clash
  loser: string;
  score: string; // winner first, e.g. "1-6 7-6(6) 6-1 3-6 6-4"
  bestOf: 3 | 5;
};

export type FanEntry = {
  watchedOn: WatchMode;
  watchedDate: string; // "YYYY-MM"
  rating: number; // 1 to 5
  cheering: string | null;
  pick: { winner: string } | null; // your call on who wins: whoever you backed
  tags: string[];
  note: string; // the fan's own words, anything they like
  classic: boolean;
};

/**
 * An entry as the diary keeps it: who you backed and picked are sides of the match rather than names,
 * so they hold whatever the site ends up calling each player.
 */
export type Side = "winner" | "loser";
export type StoredEntry = Omit<FanEntry, "cheering" | "pick"> & { cheering: Side | null; pick: { side: Side } | null };

const sideOf = (m: Match, name: string | null): Side | null => (name === m.winner ? "winner" : name === m.loser ? "loser" : null);

export function toFanEntry(e: StoredEntry, m: Match): FanEntry {
  return { ...e, cheering: e.cheering && m[e.cheering], pick: e.pick && { winner: m[e.pick.side] } };
}

export function toStoredEntry(fan: Partial<FanEntry>, m: Match): Partial<StoredEntry> {
  const { cheering, pick, ...rest } = fan;
  return {
    ...rest,
    ...(cheering !== undefined && { cheering: sideOf(m, cheering) }),
    ...(pick !== undefined && { pick: pick && sideOf(m, pick.winner) ? { side: sideOf(m, pick.winner)! } : null }),
  };
}

/** One meeting in a rivalry's full record. `logId` links it to the log; one without is a meeting the fan hasn't logged. */
export type RecordMeeting = {
  date: string; // "YYYY-MM" or "YYYY-MM-DD", as Match
  event: string; // tournament, without the year
  round: Round;
  stage?: string | null;
  tour?: Tour;
  surface: Surface;
  winner: string;
  logId?: string;
  score?: string; // winner first, as in the log
  matchId?: string; // the match in the data, for a meeting not in the log
};

/* ---------- Players from the match data ---------- */

export type Player = {
  key: string; // tour and the data's id, e.g. "atp:A0E2": ids are only unique within a tour
  name: string; // full name
  short: string; // surname
  ioc: string | null;
};

/** A match as the database sends it: the players in full, the event without its year. */
export type MatchRow = Omit<Match, "event" | "winner" | "loser"> & {
  event: string;
  season: number;
  tier: Tier;
  winner: Player;
  loser: Player;
};

// The players with a headshot or a colour of their own (see fun.tsx) are the only ones the site calls by
// surname whatever else is in the log, so no one else who shares it can borrow their photo or colour.
export const namedPlayers: Record<string, string> = {
  Alcaraz: "atp:A0E2",
  Sinner: "atp:S0AG",
  Djokovic: "atp:D643",
  Federer: "atp:F324",
  Nadal: "atp:N409",
  Shelton: "atp:S0S1",
  Zverev: "atp:Z355",
  Rybakina: "wta:214981",
  Sabalenka: "wta:214544",
};

const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * What to call each player among a set (a diary, say): their surname, unless someone else in the set
 * has it too, then their full name, and their country as well if even that is shared.
 */
export function displayNames(players: Player[]) {
  const unique = [...new Map(players.map((p) => [p.key, p])).values()];
  const keysBy = (name: (p: Player) => string) => {
    const keys = new Map<string, Set<string>>();
    for (const p of unique) keys.set(fold(name(p)), (keys.get(fold(name(p))) ?? new Set()).add(p.key));
    return (p: Player) => keys.get(fold(name(p)))!.size;
  };
  const sharingShort = keysBy((p) => p.short);
  const sharingFull = keysBy((p) => p.name);
  return new Map(
    unique.map((p) => {
      const reserved = namedPlayers[p.short];
      const clash = reserved ? reserved !== p.key : sharingShort(p) > 1;
      if (!clash) return [p.key, p.short];
      return [p.key, sharingFull(p) > 1 && p.ioc ? `${p.name} (${p.ioc})` : p.name];
    }),
  );
}

/** Matches from the database, named for showing together. */
export function toMatches(rows: MatchRow[]): Record<string, Match> {
  const names = displayNames(rows.flatMap((r) => [r.winner, r.loser]));
  return Object.fromEntries(
    rows.map(({ season, winner, loser, ...r }) => [
      r.id,
      { ...r, event: `${r.event} ${season}`, winner: names.get(winner.key)!, loser: names.get(loser.key)! },
    ]),
  );
}

/* ---------- Labels ---------- */

export const surfaceLabels: Record<Surface, string> = { clay: "Clay", hard: "Hard", grass: "Grass", carpet: "Carpet", unknown: "Surface unknown" };

const slamRounds: Partial<Record<Round, string>> = { R128: "First round", R64: "Second round", R32: "Third round", R16: "Fourth round" };
const roundNames: Record<Round, string> = {
  R128: "Round of 128",
  R64: "Round of 64",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinal",
  SF: "Semifinal",
  F: "Final",
  RR: "Round robin",
  BR: "Bronze medal match",
  "3P": "Third-place match",
};
const bothTours = ["Australian Open", "Roland Garros", "Wimbledon", "US Open", "Olympics"];

/**
 * A round as the site says it: "Fourth round" at a Slam, "Round of 16" elsewhere. Where both tours play
 * the same event, the women's matches say so ("Women's final"). A team event's rubber names its tie.
 */
export function roundName(m: { round: Round; event: string; tour?: Tour; stage?: string | null }) {
  if (m.stage) return m.stage;
  const slam = slams.some((s) => m.event.startsWith(s));
  const name = (slam && slamRounds[m.round]) || roundNames[m.round];
  return m.tour === "wta" && bothTours.some((t) => m.event.startsWith(t)) ? `Women's ${name.toLowerCase()}` : name;
}

/** "Wimbledon 2023 · Final" */
export function eventLabel(m: Match) {
  return `${m.event} · ${roundName(m)}`;
}

// Rankings are kept per tournament: the four Slams in calendar order, then everything else
export const slams = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"] as const;
export type Tournament = (typeof slams)[number] | "Other events";
export const tournaments: Tournament[] = [...slams, "Other events"];
export const tournamentOf = (m: Match): Tournament => slams.find((t) => m.event.startsWith(t)) ?? "Other events";

export function involves(m: Match, a: string, b?: string) {
  if (!b) return m.winner === a || m.loser === a;
  return (m.winner === a && m.loser === b) || (m.winner === b && m.loser === a);
}

/* ---------- Scores ---------- */

/** One set, winner's games first. `tb` is the tiebreak loser's points; `super` marks a match tiebreak, e.g. [10-7]. */
export type SetScore = { w: number; l: number; tb: number | null; super: boolean };

/**
 * Sets and how the match ended, from a score like "6-7(5) 7-5 [10-7]" or "6-4 2-1 RET". A set left
 * unfinished by a retirement, default or abandonment is still a set: it was seen, but nobody won it.
 */
export function parseScore(score: string): { sets: SetScore[]; outcome: Outcome } {
  const sets: SetScore[] = [];
  let outcome: Outcome = "completed";
  for (const token of score.trim().split(/\s+/).filter(Boolean)) {
    const set = token.match(/^(\[)?(\d+)-(\d+)\]?(?:\((\d+)(?:-(\d+))?\))?$/);
    if (set) sets.push({ w: Number(set[2]), l: Number(set[3]), tb: set[4] ? Number(set[5] ?? set[4]) : null, super: !!set[1] });
    else if (/^RET/i.test(token)) outcome = "retired";
    else if (/^DEF/i.test(token)) outcome = "defaulted";
    else if (/^WEA/i.test(token)) outcome = "abandoned";
    else if (/^W\/?O/i.test(token)) outcome = "walkover";
  }
  // "DEF" with no games is a walkover the data records as a default
  if (!sets.length) outcome = score.trim() ? "walkover" : "unplayed";
  return { sets, outcome };
}

/** Games per set from a score like "6-7(5) 7-5", winner first. */
export function parseSets(score: string) {
  return parseScore(score).sets;
}

export function setCount(score: string) {
  return parseScore(score).sets.length;
}

/** Played to the end: no retirement, default or abandonment. */
export const finished = (score: string) => parseScore(score).outcome === "completed";

/** Whether this set went to the winner of the match. An unfinished last set went to nobody. */
export function setWinner(sets: SetScore[], i: number, done: boolean): "w" | "l" | null {
  if (!done && i === sets.length - 1) return null;
  return sets[i].w > sets[i].l ? "w" : "l";
}

/** The score as a diary writes it: "6-4 2-1 ret." */
export function scoreText(score: string) {
  return score
    .replace(/\bRET\S*/i, "ret.")
    .replace(/\bDEF\b/i, "def.")
    .replace(/\bWEA\b/i, "abandoned")
    .trim();
}

/** How an unfinished match ended, for a line under its score, or null for one played to the end. */
export function endingOf(m: { score: string; loser: string }) {
  const { outcome } = parseScore(m.score);
  if (outcome === "retired") return `${m.loser} retired`;
  if (outcome === "defaulted") return `${m.loser} was defaulted`;
  if (outcome === "abandoned") return "Abandoned";
  return null;
}

/* ---------- The diary ---------- */

// Rivalries are picked by rule, not by hand: every pairing you've logged at least
// MIN_RIVALRY_MEETINGS times, most meetings first (ties: the one you watched most recently),
// top MAX_RIVALRIES. Within a pair, the player who appears more in your log comes first.
export const MIN_RIVALRY_MEETINGS = 2;
export const MAX_RIVALRIES = 3;

export type Rivalry = { id: string; players: [string, string] };

export function findRivalries(log: Record<string, FanEntry>, matches: Record<string, Match>): Rivalry[] {
  const appearances = new Map<string, number>();
  const mine = Object.values(matches).filter((m) => log[m.id]);
  for (const m of mine) for (const p of [m.winner, m.loser]) appearances.set(p, (appearances.get(p) ?? 0) + 1);
  const pairs = new Map<string, { players: [string, string]; n: number; last: string }>();
  for (const m of mine) {
    const players = [m.winner, m.loser].sort(
      (a, b) => (appearances.get(b) ?? 0) - (appearances.get(a) ?? 0) || a.localeCompare(b),
    ) as [string, string];
    const id = players.join("-");
    const cur = pairs.get(id) ?? { players, n: 0, last: "" };
    const watched = log[m.id].watchedDate;
    pairs.set(id, { players, n: cur.n + 1, last: watched > cur.last ? watched : cur.last });
  }
  return [...pairs.entries()]
    .filter(([, p]) => p.n >= MIN_RIVALRY_MEETINGS)
    .sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last))
    .slice(0, MAX_RIVALRIES)
    .map(([id, p]) => ({ id, players: p.players }));
}

export const rivalryOf = (m: Match, rivalries: Rivalry[]) => rivalries.find((r) => involves(m, ...r.players));

/** Put some matches (one tournament's, say) in a new order, in the ranking slots they already hold. */
export function reorderSlots(order: string[], ids: string[]) {
  const moving = new Set(ids);
  const queue = [...ids];
  return order.map((id) => (moving.has(id) ? queue.shift()! : id));
}

/** Where a newly logged match first goes in the ranking: above every match you rated lower. */
export function placeByRating(order: string[], ratingOf: (id: string) => number, id: string, rating: number) {
  const at = order.findIndex((other) => ratingOf(other) < rating);
  return at < 0 ? [...order, id] : [...order.slice(0, at), id, ...order.slice(at)];
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2023-07" -> "Jul 2023" */
export function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${months[Number(m) - 1]} ${y}`;
}

/**
 * Every logged match is a page in the diary, numbered in the order you watched them (matches
 * watched the same month go in the order they were played). Match id -> page number, from 1.
 */
export function diaryPages(log: Record<string, FanEntry>, matches: Record<string, Match>) {
  const order = Object.values(matches)
    .filter((m) => log[m.id])
    .sort((a, b) => log[a.id].watchedDate.localeCompare(log[b.id].watchedDate) || a.date.localeCompare(b.date) || roundOrder(a) - roundOrder(b) || a.id.localeCompare(b.id));
  return new Map(order.map((m, i) => [m.id, i + 1]));
}

const rounds: Round[] = ["RR", "R128", "R64", "R32", "R16", "QF", "SF", "BR", "3P", "F"];
/** Early rounds first, so a tournament's matches go in the order they were played. */
export const roundOrder = (m: { round: Round }) => rounds.indexOf(m.round);

/** How you watched it, as a diary would put it: "in person", "on TV", "streamed" */
export const watchedHow = (mode: WatchMode) => ({ Live: "in person", TV: "on TV", Stream: "streamed" })[mode];

/** Watched at least a few months after it was played. */
export function isRewatch(m: Match, fan: FanEntry) {
  const toMonths = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
  return toMonths(fan.watchedDate) - toMonths(m.date) >= 3;
}
