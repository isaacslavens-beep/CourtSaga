// Turns the record and the fan's log into books. Every title, line and number here comes from
// fixed rules over the data, so the same log always binds the same book. No generated prose:
// the only free text in a book is the fan's own notes. Lines are kept short on purpose.

import {
  eventLabel,
  findRivalries,
  finished,
  isRewatch,
  monthLabel,
  parseSets,
  roundName,
  scoreText,
  setCount,
  tournamentOf,
  type FanEntry,
  type Match,
  type RecordMeeting,
  type Surface,
} from "./library";

/* ---------- The shape every book shares ---------- */

/** Everything a book is bound from: the log, the fan's ranking, and each rivalry's full record of meetings */
export type Diary = {
  matches: Record<string, Match>;
  entries: Record<string, FanEntry>;
  order: string[];
  records: Record<string, RecordMeeting[]>;
};

export type Entry =
  | { kind: "logged"; id: string; m: Match; fan: FanEntry; marks: string[]; detail: string | null }
  // A rivalry meeting not in your log, with the record's details of it
  | { kind: "other"; key: string; head: string; line: string; marks: string[]; meet: RecordMeeting; loser: string };

export type BookChapter = {
  key: string;
  year: string; // the chapter's year, or for Finals its tournament
  title: string;
  previously: string | null; // where the last chapter left things, e.g. "Alcaraz led 6–4"
  side: string;
  notes: string[]; // small facts that hold this chapter, e.g. "Grass belongs to Sinner: 2–0"
  epigraph: { note: string; date: string; id: string } | null;
  entries: Entry[];
  compact: boolean;
  // `score`: a rivalry's head-to-head at the end of the chapter, first player first
  footer: { label: string; value: string; share: number | null; score?: [number, number] };
};

// One mark per match in the at-a-glance chart
export type StripItem = {
  key: string;
  group: string; // rivalries: the year it sits under; collections: the row it counts towards
  color: string; // a player's name, "right"/"exact"/"wrong" for calls, "other", or "" for no side
  value: number; // your rating (1–5), or 3 for a meeting you didn't log
  side: 1 | -1; // rivalries: above the line for the first player, below for the second
  watched: boolean;
  title: string;
  logId?: string;
};

export type StripLegend = { color: string; label: string; faded?: boolean }[];

export type BookData = {
  id: string;
  kind: "rivalry" | "collection";
  title: string;
  faces: string[];
  subtitle: string;
  strip: StripItem[];
  stripLegend: StripLegend;
  stripMode: "rivalry" | "rows";
  stripCaption: string;
  facts: [string, string][];
  chapters: BookChapter[];
  epilogue: {
    big: { label: string; n: number; face: boolean }[];
    facts: [string, string][];
    favourite: { label: string; note: string } | null;
  };
};

export type ShelfBook = { id: string; kind: "rivalry" | "collection"; title: string; players: string[]; blurb: string };

// The saga unlocks once you've logged this many matches; a collection appears once it has this many
export const SAGA_MIN_MATCHES = 5;
export const COLLECTION_MIN = 3;

const collections: (Omit<ShelfBook, "kind" | "players"> & { test: (x: Item) => boolean })[] = [
  { id: "seasons", title: "Seasons", blurb: "matches", test: () => true },
  { id: "finals", title: "Finals", blurb: "finals", test: (x) => isFinal(x.m.round) },
  { id: "five", title: "Five-Setters", blurb: "matches", test: (x) => isFive(x.m) },
  { id: "comebacks", title: "Comebacks", blurb: "matches", test: (x) => lostFirst(x.m) },
  { id: "calls", title: "Called It", blurb: "calls", test: (x) => !!x.fan.pick },
];

// A rivalry big enough to have its own name goes by it. Keyed by the pair in alphabetical order.
const nicknames: Record<string, string> = { "Alcaraz-Sinner": "Sincaraz" };
const nicknameOf = (players: string[]) => nicknames[[...players].sort().join("-")];

/** A rivalry's name: its nickname if it has one, otherwise "Alcaraz & Djokovic". */
export const rivalryTitle = (players: string[]) => nicknameOf(players) ?? players.join(" & ");

/** The shelf, decided by rule from the log: rivalries first, then every collection with enough in it. */
export function buildShelf(diary: Diary): ShelfBook[] {
  const all: Item[] = loggedItems(diary);
  if (all.length < SAGA_MIN_MATCHES) return [];
  return [
    ...findRivalries(diary.entries, diary.matches).map((r) => ({
      id: r.id,
      kind: "rivalry" as const,
      title: rivalryTitle(r.players),
      players: r.players,
      blurb: "meetings",
    })),
    ...collections
      .filter((c) => c.id === "seasons" || all.filter(c.test).length >= COLLECTION_MIN)
      .map((c) => ({ id: c.id, title: c.title, blurb: c.blurb, kind: "collection" as const, players: [] })),
  ];
}

/** Every meeting in a rivalry: the full record when the results data has it, otherwise the ones you logged. */
function recordFor(id: string, [A, B]: [string, string], { matches, entries, records }: Diary): RecordMeeting[] {
  return (
    records[id] ??
    Object.values(matches)
      .filter((m) => entries[m.id] && ((m.winner === A && m.loser === B) || (m.winner === B && m.loser === A)))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ date: m.date, event: m.event.replace(/ \d{4}$/, ""), round: m.round, stage: m.stage, tour: m.tour, surface: m.surface, winner: m.winner, logId: m.id }))
  );
}

/* ---------- Saying it a few ways ---------- */

/**
 * A title or tag with two or three ways of saying it. The first wording is its identity, so the
 * same rule twice in a row still counts as a repeat. Which wording shows is fixed by a hash of
 * where it appears (`seed`), so a book never reshuffles: the same log always reads the same.
 */
type Line = { key: string; text: string };

const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};
const say = (seed: string, ...ways: string[]): Line => ({ key: ways[0], text: ways[hash(`${seed}|${ways[0]}`) % ways.length] });

const numberWords = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => numberWords[n] ?? String(n);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

/* ---------- Helpers ---------- */

/** Only the matches you've actually logged */
const loggedItems = ({ matches, entries }: Diary): Item[] =>
  Object.values(matches)
    .filter((m) => entries[m.id])
    .map((m) => ({ m, fan: entries[m.id] }));

type Item = { m: Match; fan: FanEntry };
const s = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const shortEvent = (m: Match) => m.event.replace(/ \d{4}$/, "");
const byWatched = (a: Item, b: Item) => a.fan.watchedDate.localeCompare(b.fan.watchedDate) || a.m.date.localeCompare(b.m.date);
const called = (x: Item) => !!x.fan.pick && x.fan.pick.winner === x.m.winner;
// A call can only be exactly right about a match played to the end
const exact = (x: Item) => called(x) && finished(x.m.score) && x.fan.pick!.sets === setCount(x.m.score);
// Only matches played to the end count as five-setters and comebacks: a retirement is neither
const isFive = (m: Match) => m.bestOf === 5 && setCount(m.score) === 5 && finished(m.score);
const isFinal = (round: string) => round === "F";
const lostFirst = (m: Match) => {
  const [s0] = parseSets(m.score);
  return finished(m.score) && !!s0 && s0.w < s0.l;
};
const twoDown = (m: Match) => {
  const [, s1] = parseSets(m.score);
  return lostFirst(m) && !!s1 && s1.w < s1.l;
};
const lastSet = (m: Match) => m.score.split(" ").pop()!;
const fifthTiebreak = (m: Match) => lastSet(m).includes("(");
const fifthLong = (m: Match) => {
  const last = parseSets(m.score).pop()!;
  return last.w + last.l > 13; // beyond a 7-6, e.g. 9-7 or 13-12
};

/** The highest-rated note in a group, for a chapter's epigraph. */
function epigraphOf(items: Item[]) {
  const notes = items.filter((x) => x.fan.note);
  if (!notes.length) return null;
  const best = notes.reduce((b, x) => (x.fan.rating >= b.fan.rating ? x : b));
  return { note: best.fan.note, date: best.fan.watchedDate, id: best.m.id };
}

/** Group items by the year they were watched, oldest first. */
function byWatchYear(items: Item[]) {
  const sorted = [...items].sort(byWatched);
  return [...new Set(sorted.map((x) => x.fan.watchedDate.slice(0, 4)))].map((year) => ({
    year,
    items: sorted.filter((x) => x.fan.watchedDate.startsWith(year)),
  }));
}

/** First option that doesn't repeat the previous chapter's title (compared by rule, not wording). */
const pickTitle = (options: Line[], prev: string) => options.find((t) => t.key !== prev) ?? options[options.length - 1];

function loggedEntry(x: Item, detail: string | null = null, marks: string[] = []): Entry {
  return {
    kind: "logged",
    id: x.m.id,
    m: x.m,
    fan: x.fan,
    marks: [...marks, ...(isRewatch(x.m, x.fan) ? [`Rewatched ${monthLabel(x.fan.watchedDate)}`] : [])],
    detail,
  };
}

/**
 * Milestones across the whole log, in diary order (see `diaryPages`): where it begins, the 10th, 25th, 50th
 * and every 100th match, your first 5-ball rating and your first match in person.
 */
function milestones(diary: Diary) {
  const marks = new Map<string, string[]>();
  const add = (id: string, line: Line) => marks.set(id, [...(marks.get(id) ?? []), line.text]);
  const log = loggedItems(diary).sort(byWatched);
  log.forEach((x, i) => {
    const n = i + 1;
    if (n === 1) add(x.m.id, say(x.m.id, "The first page", "Where your diary begins"));
    else if ([10, 25, 50].includes(n) || n % 100 === 0) add(x.m.id, say(x.m.id, `Your ${ordinal(n)} match`, `${n} and counting`));
  });
  const firstFive = log.find((x) => x.fan.rating === 5);
  if (firstFive) add(firstFive.m.id, say(firstFive.m.id, "Your first 5 balls", "First perfect 5"));
  const firstLive = log.find((x) => x.fan.watchedOn === "Live");
  if (firstLive) add(firstLive.m.id, say(firstLive.m.id, "Your first time in person", "First one live"));
  return marks;
}

function favouriteOf(items: Item[], order: string[]) {
  const id = order.find((oid) => items.some((x) => x.m.id === oid));
  const fav = items.find((x) => x.m.id === id);
  return fav ? { label: eventLabel(fav.m), note: fav.fan.note } : null;
}

/**
 * Collection charts: one row per category, one block per match, so each row's length is its count.
 * Rows come in `rows` order (empty ones dropped); blocks cluster by colour. Only the top `keep`
 * players with 2+ matches get their own colour; everyone else folds into "other".
 */
function rowsOf(items: Item[], rowOf: (x: Item) => string, colorBy: (x: Item) => string, rows: string[], label: (color: string) => string, keep = 3) {
  const counts = new Map<string, number>();
  for (const x of items) counts.set(colorBy(x), (counts.get(colorBy(x)) ?? 0) + 1);
  const special = (c: string) => c === "" || c === "right" || c === "exact" || c === "wrong";
  const kept = [...counts.entries()].filter(([c, n]) => !special(c) && n >= 2).sort((a, b) => b[1] - a[1]).slice(0, keep).map(([c]) => c);
  const colour = (x: Item) => (special(colorBy(x)) || kept.includes(colorBy(x)) ? colorBy(x) : "other");
  const rank = (c: string) => (kept.includes(c) ? kept.indexOf(c) : c === "other" ? 90 : 95);
  const strip: StripItem[] = rows.flatMap((row) =>
    items
      .filter((x) => rowOf(x) === row)
      .sort((a, b) => rank(colour(a)) - rank(colour(b)) || byWatched(a, b))
      .map((x) => ({
        key: x.m.id,
        group: row,
        color: colour(x),
        value: x.fan.rating,
        side: 1 as const,
        watched: true,
        title: `${eventLabel(x.m)}: ${x.m.winner} won · you rated it ${x.fan.rating}`,
        logId: x.m.id,
      })),
  );
  const present = [...new Set(strip.map((x) => x.color))].sort((a, b) => rank(a) - rank(b));
  return { strip, stripMode: "rows" as const, stripLegend: present.map((c) => ({ color: c, label: c === "other" ? "Someone else" : label(c) })) };
}

/** The most sets the eventual winner was ever behind by. */
const deficit = (m: Match) => {
  let [w, l, worst] = [0, 0, 0];
  for (const set of parseSets(m.score)) {
    if (set.w > set.l) w++;
    else l++;
    worst = Math.max(worst, l - w);
  }
  return worst;
};

/** "Sinner: 2 wins, 3 losses" for whoever you backed most, or null. */
function mostBacked(items: Item[]) {
  const counts = new Map<string, number>();
  for (const x of items) if (x.fan.cheering) counts.set(x.fan.cheering, (counts.get(x.fan.cheering) ?? 0) + 1);
  if (!counts.size) return null;
  const player = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const backed = items.filter((x) => x.fan.cheering === player);
  const won = backed.filter((x) => x.m.winner === player).length;
  return { player, n: backed.length, won, record: backed.length === 1 ? (won ? "won" : "lost") : `${s(won, "win")}, ${s(backed.length - won, "loss", "losses")}` };
}

/* ---------- Rivalry books: the whole rivalry, with your meetings marked in ---------- */

// A run of this many straight wins is worth a line when it ends
const STREAK_MIN = 4;
const surfaceNames: Record<Surface, string> = { clay: "clay", grass: "grass", hard: "hard courts", carpet: "carpet", unknown: "" };

function bindRivalry(id: string, diary: Diary): BookData {
  const { entries, order } = diary;
  const [A, B] = (findRivalries(entries, diary.matches).find((r) => r.id === id)?.players ?? id.split("-")) as [string, string];
  type Streak = { by: string; of: string; n: number };
  type Beat = { meet: RecordMeeting; m?: Match; fan?: FanEntry; marks: string[]; ended: Streak | null; i: number; a: number; b: number };
  const lead = (a: number, b: number) => (a === b ? null : a > b ? A : B);
  const other = (p: string) => (p === A ? B : A);
  const score = (a: number, b: number) => `${Math.max(a, b)}–${Math.min(a, b)}`;
  const standing = (a: number, b: number) => (a === b ? `All square, ${a}–${b}` : `${lead(a, b)} leads ${score(a, b)}`);

  let a = 0;
  let b = 0;
  let run = { who: "", n: 0 };
  const beats: Beat[] = recordFor(id, [A, B], diary).map((meet, i) => {
    const before = lead(a, b);
    if (meet.winner === A) a++;
    else b++;
    const after = lead(a, b);
    const seed = `${id}:${i}`;
    const marks: string[] = [];
    if (i > 0 && after !== before) marks.push((after ? say(seed, `Put ${after} ahead`, `Moved ${after} in front`) : say(seed, `Levelled it at ${a}–${b}`, `Made it ${a}–${b}`)).text);
    // The meeting that ends a long run of wins
    const ended = run.who && run.who !== meet.winner && run.n >= STREAK_MIN ? { by: meet.winner, of: run.who, n: run.n } : null;
    if (ended) marks.push(say(seed, `Ended ${ended.of}'s run at ${ended.n}`, `Stopped ${ended.of} at ${ended.n} straight`).text);
    run = run.who === meet.winner ? { who: run.who, n: run.n + 1 } : { who: meet.winner, n: 1 };
    if ((i + 1) % 10 === 0) marks.push(say(seed, `Their ${ordinal(i + 1)} meeting`, `Meeting no. ${i + 1}`).text);
    return { meet, m: meet.logId ? diary.matches[meet.logId] : undefined, fan: meet.logId ? entries[meet.logId] : undefined, marks, ended, i, a, b };
  });
  const yours = beats.filter((x): x is Beat & Item => !!x.fan && !!x.m);

  let prevTitle = "";
  let beenLevel = false;
  let lastBacker: string | null = null;
  const chapters: BookChapter[] = [...new Set(beats.map((x) => x.meet.date.slice(0, 4)))].map((year, ci) => {
    const cb = beats.filter((x) => x.meet.date.startsWith(year));
    const n = cb.length;
    const first = cb[0];
    const last = cb[n - 1];
    const [ba, bb] = [first.a - (first.meet.winner === A ? 1 : 0), first.b - (first.meet.winner === B ? 1 : 0)];
    const winners = cb.map((x) => x.meet.winner);
    const [lb, la] = [lead(ba, bb), lead(last.a, last.b)];
    const [ya, yb] = [winners.filter((w) => w === A).length, winners.filter((w) => w === B).length];
    const ended = cb.find((x) => x.ended)?.ended;
    const at = (...ways: string[]) => say(`${id}:${year}`, ...ways);

    const options: Line[] = [];
    if (ci === 0) options.push(n === 1 ? at("The first meeting", "Where it began", "How they met") : at("How it started", "The early meetings", "Where it began"));
    if (la && la !== lb) options.push(lb ? at(`${la} moves ahead`, `${la} turns it around`, `${la} takes over`) : at(`${la} takes the lead`, `${la} goes in front`, `${la} edges ahead`));
    if (!la && lb) options.push(beenLevel ? at("All square again", "Level once more", "Back to even") : at("All square", "Nothing between them", "Dead even"));
    if (n > 1 && cb.every((x) => isFinal(x.meet.round))) options.push(at(`${cap(word(n))} finals in one year`, "Every meeting a final", `${cap(word(n))} meetings, ${word(n)} finals`));
    if (ended) options.push(at(`${ended.by} ends ${ended.of}'s run at ${ended.n}`, `${ended.by} stops ${ended.of} at ${ended.n} straight`, `${ended.of}'s run ends at ${ended.n}`));
    if (n > 1 && ya * yb === 0) options.push(at(`${winners[0]} wins all ${n}`, `A clean sweep for ${winners[0]}`, `${n} out of ${n} for ${winners[0]}`));
    if (la && la === lb) {
      const [gb, ga] = [Math.abs(ba - bb), Math.abs(last.a - last.b)];
      const behind = other(la);
      options.push(
        ga > gb
          ? at(`${la} pulls away`, `${la} stretches the lead`, `${la} builds a cushion`)
          : ga < gb
            ? at(`${behind} closes the gap`, `${behind} chips away`, `${behind} fights back`)
            : at(`${la} holds on`, `${la} keeps the lead`, `${la} stays in front`),
      );
    }
    const topOfYear = ya > yb ? A : B;
    options.push(
      ya === yb
        ? at(`Even in ${year}`, `Honours even in ${year}`, `${year} split evenly`)
        : at(`${score(ya, yb)} to ${topOfYear}`, `${topOfYear}'s year, ${score(ya, yb)}`, `${topOfYear} takes ${year}, ${score(ya, yb)}`),
    );
    const title = pickTitle(options, prevTitle);
    prevTitle = title.key;
    if (cb.some((x) => x.a === x.b)) beenLevel = true;

    // A surface where one of them has won every meeting so far, in a year they played on it
    const notes = [...new Set(cb.map((x) => x.meet.surface))].flatMap((surface) => {
      const onIt = beats.slice(0, last.i + 1).filter((x) => x.meet.surface === surface);
      const owner = onIt[0].meet.winner;
      if (surface === "unknown" || onIt.length < 2 || onIt.some((x) => x.meet.winner !== owner)) return [];
      const where = surfaceNames[surface];
      const ways = [`${owner} unbeaten on ${where}: ${onIt.length}–0`, `${onIt.length}–0 to ${owner} on ${where}`];
      if (surface !== "hard") ways.push(`${cap(where)} belongs to ${owner}: ${onIt.length}–0`);
      return [say(`${id}:${year}:${surface}`, ...ways).text];
    });

    // Where you came in this season
    const mine = cb.filter((x): x is Beat & Item => !!x.fan && !!x.m);
    let side: string;
    if (!mine.length) side = n === 1 ? "Not in your log." : `None of these ${n} in your log.`;
    else {
      const seen = mine.length < n ? `You watched ${mine.length} of ${n}. ` : "";
      const backers = [...new Set(mine.map((x) => x.fan.cheering).filter((p): p is string => !!p))];
      let backing = "No side taken.";
      if (backers.length > 1) backing = `Backed ${backers.join(", then ")}.`;
      else if (backers.length) {
        const X = backers[0];
        const backed = mine.filter((x) => x.fan.cheering === X);
        const won = backed.filter((x) => x.meet.winner === X).length;
        const verb = !lastBacker ? `Backing ${X}` : lastBacker === X ? `Still backing ${X}` : `Switched to ${X}`;
        backing = backed.length === 1 ? `${verb}, who ${won ? "won" : "lost"}.` : `${verb}: ${s(won, "win")}, ${s(backed.length - won, "loss", "losses")}.`;
        lastBacker = X;
      }
      side = seen + backing;
    }

    return {
      key: year,
      year,
      title: title.text,
      previously: ci === 0 ? null : ba === bb ? `Level at ${ba}–${bb}` : `${lb} led ${score(ba, bb)}`,
      side,
      notes,
      epigraph: epigraphOf(mine),
      entries: cb.map((x): Entry =>
        x.fan && x.m
          ? loggedEntry({ m: x.m, fan: x.fan }, null, x.marks)
          : { kind: "other", key: String(x.i), head: `${x.meet.event} · ${roundName(x.meet)}`, line: `${x.meet.winner} won`, marks: x.marks, meet: x.meet, loser: x.meet.winner === A ? B : A },
      ),
      compact: false,
      footer: { label: `End of ${year}:`, value: standing(last.a, last.b), share: last.a / (last.a + last.b), score: [last.a, last.b] },
    };
  });

  const view = { a: yours.filter((x) => x.meet.winner === A).length, b: yours.filter((x) => x.meet.winner === B).length };
  const swings = beats.filter((x) => x.i > 0 && lead(x.a, x.b) !== lead(x.a - (x.meet.winner === A ? 1 : 0), x.b - (x.meet.winner === B ? 1 : 0)));
  const finals = beats.filter((x) => isFinal(x.meet.round));
  const backed = yours.filter((x) => x.fan.cheering);
  const calls = yours.filter((x) => x.fan.pick);

  // A lucky charm: one of them clearly does better in the meetings you watch than in the ones you don't
  const missed = beats.filter((x) => !x.fan);
  const share = (xs: Beat[], p: string) => xs.filter((x) => x.meet.winner === p).length / xs.length;
  const record = (xs: Beat[], p: string) => `${xs.filter((x) => x.meet.winner === p).length}–${xs.filter((x) => x.meet.winner !== p).length}`;
  const charm = yours.length >= 3 && missed.length >= 3 ? [A, B].find((p) => share(yours, p) > 0.5 && share(yours, p) - share(missed, p) >= 0.25) : undefined;

  return {
    id,
    kind: "rivalry",
    title: rivalryTitle([A, B]),
    faces: [A, B],
    subtitle: `${nicknameOf([A, B]) ? `${A} and ${B}. ` : ""}All ${beats.length} meetings, ${beats[0].meet.date.slice(0, 4)}–${beats[beats.length - 1].meet.date.slice(0, 4)}. You watched ${yours.length}.`,
    strip: beats.map((x) => ({
      key: String(x.i),
      group: x.meet.date.slice(0, 4),
      color: x.meet.winner,
      value: x.fan ? x.fan.rating : 3,
      side: x.meet.winner === A ? 1 : -1,
      watched: !!x.fan,
      title: `${x.meet.event} ${x.meet.date.slice(0, 4)}: ${x.meet.winner} won${x.fan ? ` · you rated it ${x.fan.rating}` : " · not in your log"}`,
      logId: x.meet.logId,
    })),
    stripMode: "rivalry",
    stripCaption: `The head-to-head after every meeting: above the middle line ${A} leads, below it ${B} does. Filled dots are the meetings you watched.`,
    stripLegend: [
      { color: A, label: `${A} won` },
      { color: B, label: `${B} won` },
      { color: "", label: "Not in your log", faded: true },
    ],
    facts: [
      ["Overall", standing(a, b)],
      charm
        ? [say(id, "You're a lucky charm", "Lucky when you watch").text, `${charm}: ${record(yours, charm)} when you watch, ${record(missed, charm)} when you don't`]
        : ["In the ones you watched", view.a === view.b ? `${view.a}–${view.b}` : `${view.a > view.b ? A : B} ${score(view.a, view.b)}`],
      ["Lead changes you saw", swings.length ? `${swings.filter((x) => x.fan).length} of ${swings.length}` : "None yet"],
    ],
    chapters,
    epilogue: {
      big: [
        { label: A, n: a, face: true },
        { label: B, n: b, face: true },
      ],
      facts: [
        ["Finals", finals.length ? `${finals.filter((x) => x.meet.winner === A).length}–${finals.filter((x) => x.meet.winner === B).length} (you saw ${finals.filter((x) => x.fan).length})` : "None yet"],
        ["Your player won", backed.length ? `${backed.filter((x) => x.fan.cheering === x.meet.winner).length} of ${backed.length}` : "No side taken"],
        ["Your calls", calls.length ? `${calls.filter(called).length} of ${calls.length} right` : "None made"],
      ],
      favourite: favouriteOf(yours, order),
    },
  };
}

/* ---------- Collections: your log, organised another way ---------- */

function bindSeasons(items: Item[], order: string[]): BookData {
  const years = byWatchYear(items);
  const maxN = Math.max(...years.map((y) => y.items.length));
  let prevTitle = "";
  let prevTop: string | null = null;
  let liveBefore = false;
  let rewatchBefore = false;
  let cumulative = 0;
  const chapters = years.map(({ year, items: ys }, ci): BookChapter => {
    const n = ys.length;
    const top = mostBacked(ys);
    const live = ys.filter((x) => x.fan.watchedOn === "Live").length;
    const rewatches = ys.filter((x) => isRewatch(x.m, x.fan)).length;

    const at = (...ways: string[]) => say(`seasons:${year}`, ...ways);
    const options: Line[] = [];
    if (ci === 0) options.push(at("Where it started", "The first pages", "How it began"));
    if (top && prevTop && top.player !== prevTop) options.push(at(`The switch to ${top.player}`, `Enter ${top.player}`, `${top.player} takes over`));
    if (live && !liveBefore) options.push(at("First time in person", "There in person", "Live, for the first time"));
    if (rewatches && !rewatchBefore) options.push(at("Back to the classics", "Rewatching the greats", "Old matches, new eyes"));
    if (n === maxN && n > 2) options.push(at("Your busiest season", "Your biggest year", "The busiest year"));
    if (top && top.n / n >= 0.5) options.push(at(`Mostly ${top.player}`, `The year of ${top.player}`, `${top.player}'s year`));
    options.push(at(`${s(n, "match", "matches")} in ${year}`, `${year} in ${s(n, "match", "matches")}`));
    const title = pickTitle(options, prevTitle);
    prevTitle = title.key;
    if (top) prevTop = top.player;
    if (live) liveBefore = true;
    if (rewatches) rewatchBefore = true;

    const calls = ys.filter((x) => x.fan.pick);
    const previously = ci === 0 ? null : `${s(cumulative, "match", "matches")} in your log`;
    cumulative += n;
    return {
      key: year,
      year,
      title: title.text,
      previously,
      notes: [],
      side: [
        s(n, "match", "matches") + (live ? `, ${live} in person` : ""),
        top ? `Backed ${top.player} most: ${top.record}` : "No side taken",
        calls.length ? `Calls: ${calls.filter(called).length} of ${calls.length} right` : "",
      ]
        .filter(Boolean)
        .join(". ")
        .concat("."),
      epigraph: epigraphOf(ys),
      entries: ys.map((x) => loggedEntry(x)),
      compact: n > 4,
      footer: { label: `Your log by the end of ${year}:`, value: s(cumulative, "match", "matches"), share: cumulative / items.length },
    };
  });

  const top = mostBacked(items);
  const counts = new Map<string, number>();
  for (const x of items) if (x.fan.cheering) counts.set(x.fan.cheering, (counts.get(x.fan.cheering) ?? 0) + 1);
  const backed = items.filter((x) => x.fan.cheering);
  const calls = items.filter((x) => x.fan.pick);
  return {
    id: "seasons",
    kind: "collection",
    title: "Seasons",
    faces: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p),
    subtitle: `Your whole log: ${items.length} matches, ${years[0].year}–${years[years.length - 1].year}.`,
    ...(() => {
      const r = rowsOf(items, (x) => x.fan.watchedDate.slice(0, 4), (x) => x.fan.cheering ?? "", years.map((y) => y.year), (c) => (c ? `Backed ${c}` : "No side"));
      return { ...r, stripCaption: "Each year's matches, by who you backed." };
    })(),
    facts: [
      ["Matches logged", String(items.length)],
      ["Backed most", top ? `${top.player} (${top.n})` : "No one yet"],
      ["In person", String(items.filter((x) => x.fan.watchedOn === "Live").length)],
    ],
    chapters,
    epilogue: {
      big: (["Live", "TV", "Stream"] as const).map((mode) => ({ label: mode, n: items.filter((x) => x.fan.watchedOn === mode).length, face: false })),
      facts: [
        ["Your player won", `${backed.filter((x) => x.fan.cheering === x.m.winner).length} of ${backed.length}`],
        ["Your calls", `${calls.filter(called).length} of ${calls.length} right`],
        ["Your average", `${avg(items.map((x) => x.fan.rating)).toFixed(1)} balls`],
      ],
      favourite: favouriteOf(items, order),
    },
  };
}

// Finals chapters run through the year's Slams in the order they're played, then everything else
const finalsOrder = ["Australian Open", "Roland Garros", "Wimbledon", "US Open", "Other events"];

function bindFinals(all: Item[], order: string[]): BookData {
  const items = all.filter((x) => isFinal(x.m.round));
  const others = all.filter((x) => !isFinal(x.m.round));
  const groups = finalsOrder
    .map((t) => ({ t, items: items.filter((x) => tournamentOf(x.m) === t).sort(byWatched) }))
    .filter((g) => g.items.length);
  const titlesOf = (xs: Item[]) => {
    const wins = new Map<string, number>();
    for (const x of xs) wins.set(x.m.winner, (wins.get(x.m.winner) ?? 0) + 1);
    return [...wins.entries()].sort((a, b) => b[1] - a[1]);
  };

  let prevTitle = "";
  let cumulative = 0;
  const chapters = groups.map(({ t, items: ts }): BookChapter => {
    const n = ts.length;
    const at = (...ways: string[]) => say(`finals:${t}`, ...ways);
    const place = t === "Other events" ? null : t;
    const titles = titlesOf(ts);
    const [[topP, topN], second] = titles;
    const backed = ts.filter((x) => x.fan.cheering);
    const backedWon = backed.filter((x) => x.fan.cheering === x.m.winner).length;
    const fives = ts.filter((x) => isFive(x.m)).length;

    // Who won first, then whose side you were on, then how far the finals went
    const options: Line[] = [];
    if (n > 1 && titles.length === 1) options.push(at(place ? `${place} belongs to ${topP}` : `${topP} wins them all`, `All ${topP}`, `${topP}, every time`));
    if (n > 2 && titles.length === n) options.push(at(`${cap(word(n))} finals, ${word(n)} champions`, "A different champion every time", `${cap(word(n))} different winners`));
    if (topN >= 2 && titles.length > 1 && second[1] < topN) options.push(at(`${cap(word(topN))} titles for ${topP}`, `${topP}, ${word(topN)}-time champion`));
    if (backed.length > 1 && backedWon === backed.length) options.push(at("Your player won every one", "Backed the winner every time", "Always on the right side"));
    if (backed.length > 1 && backedWon === 0) options.push(at("Your player lost every one", "Never on the winning side", "Always the runner-up"));
    if (fives) options.push(fives === 1 ? at("A five-set final", "Down to a fifth set", "One went the distance") : at(`${cap(word(fives))} five-set finals`, `${cap(word(fives))} went the distance`));
    options.push(place ? at(s(n, `${place} final`), `${place}: ${s(n, "final")}`) : at(`${s(n, "final")} beyond the Slams`, `${s(n, "final")} elsewhere`));
    const title = pickTitle(options, prevTitle);
    prevTitle = title.key;
    cumulative += n;
    const top = mostBacked(ts);
    return {
      key: t,
      year: t,
      title: title.text,
      previously: null, // tournaments, not a timeline
      notes: [],
      side: `${s(n, "final")}, ${s(titles.length, "champion")}. ${top ? `Backed ${top.player}: ${top.record}.` : "No side taken."}`,
      epigraph: epigraphOf(ts),
      entries: ts.map((x) => {
        const sets = setCount(x.m.score);
        const straight = parseSets(x.m.score).every((set) => set.w > set.l);
        const how = !finished(x.m.score) ? "Unfinished" : straight ? "Straight sets" : `${cap(word(sets))} sets`;
        return loggedEntry(x, `${how}, ${scoreText(x.m.score)}`);
      }),
      compact: n > 4,
      footer: { label: "Finals so far:", value: String(cumulative), share: cumulative / items.length },
    };
  });

  const winners = titlesOf(items);
  const backed = items.filter((x) => x.fan.cheering);
  return {
    id: "finals",
    kind: "collection",
    title: "Finals",
    faces: winners.slice(0, 3).map(([p]) => p),
    subtitle: `Every final you watched: ${items.length} so far.`,
    ...rowsOf(items, (x) => tournamentOf(x.m), (x) => x.m.winner, groups.map((g) => g.t), (c) => `${c} won`),
    stripCaption: "Each tournament's finals, and who won.",
    facts: [
      ["Finals watched", String(items.length)],
      ["Champions you saw", String(winners.length)],
      ["Your player won", backed.length ? `${backed.filter((x) => x.fan.cheering === x.m.winner).length} of ${backed.length}` : "No side taken"],
    ],
    chapters,
    epilogue: {
      big: [{ label: "finals", n: items.length, face: false }],
      facts: [
        ["Won the most", `${winners[0][0]} (${winners[0][1]})`],
        ["Five-set finals", String(items.filter((x) => isFive(x.m)).length)],
        ["Your average", `${avg(items.map((x) => x.fan.rating)).toFixed(1)} (${avg(others.map((x) => x.fan.rating)).toFixed(1)} for the rest)`],
      ],
      favourite: favouriteOf(items, order),
    },
  };
}

function bindFive(all: Item[], order: string[]): BookData {
  const items = all.filter((x) => isFive(x.m));
  const others = all.filter((x) => !isFive(x.m));
  const years = byWatchYear(items);
  let prevTitle = "";
  let cumulative = 0;
  const chapters = years.map(({ year, items: ys }, ci): BookChapter => {
    const at = (...ways: string[]) => say(`five:${year}`, ...ways);
    const options: Line[] = [];
    if (ci === 0) options.push(at("The first one", "The first epic", "Where the five-setters begin"));
    if (ys.some((x) => twoDown(x.m))) options.push(at("From two sets down", "Back from two sets down", "Two sets down, still won"));
    if (ys.some((x) => fifthTiebreak(x.m))) options.push(at("A fifth-set tiebreak", "Decided by a tiebreak", "Down to a tiebreak"));
    if (ys.some((x) => fifthLong(x.m))) options.push(at("Past 6–6 in the fifth", "A fifth set that wouldn't end", "Long into the fifth"));
    options.push(at(`${s(ys.length, "five-setter")} in ${year}`, `${year}: ${s(ys.length, "five-setter")}`));
    const title = pickTitle(options, prevTitle);
    prevTitle = title.key;
    const previously = ci === 0 ? null : `${s(cumulative, "five-setter")} in your log`;
    cumulative += ys.length;
    const top = mostBacked(ys);
    return {
      key: year,
      year,
      title: title.text,
      previously,
      notes: [],
      side: `${s(ys.length, "five-setter")}. ${top ? `Backed ${top.player}: ${top.record}.` : "No side taken."}`,
      epigraph: epigraphOf(ys),
      entries: ys.map((x) => loggedEntry(x, `Fifth set ${lastSet(x.m)}`, twoDown(x.m) ? [say(x.m.id, "From two sets down", "Back from two sets down").text] : [])),
      compact: false,
      footer: { label: "Five-setters so far:", value: String(cumulative), share: cumulative / items.length },
    };
  });
  const longest = [...items].sort((a, b) => {
    const [la, lb] = [parseSets(a.m.score).pop()!, parseSets(b.m.score).pop()!];
    return lb.w + lb.l - (la.w + la.l);
  })[0];
  const backed = items.filter((x) => x.fan.cheering);
  return {
    id: "five",
    kind: "collection",
    title: "Five-Setters",
    faces: [...new Set(items.map((x) => x.m.winner))].slice(0, 3),
    subtitle: `Every match you watched that went the distance: ${items.length} so far.`,
    ...(() => {
      const t = new Map<string, number>();
      for (const x of items) t.set(tournamentOf(x.m), (t.get(tournamentOf(x.m)) ?? 0) + 1);
      const rows = [...t.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
      return { ...rowsOf(items, (x) => tournamentOf(x.m), (x) => x.m.winner, rows, (c) => `${c} won`), stripCaption: "Where they happened, and who won." };
    })(),
    facts: [
      ["Five-setters watched", String(items.length)],
      ["Your average", `${avg(items.map((x) => x.fan.rating)).toFixed(1)} (${avg(others.map((x) => x.fan.rating)).toFixed(1)} for the rest)`],
      ["From two sets down", String(items.filter((x) => twoDown(x.m)).length)],
    ],
    chapters,
    epilogue: {
      big: [{ label: "five-setters", n: items.length, face: false }],
      facts: [
        ["Longest fifth set", `${shortEvent(longest.m)} ${longest.m.date.slice(0, 4)}, ${lastSet(longest.m)}`],
        ["Fifth-set tiebreaks", String(items.filter((x) => fifthTiebreak(x.m)).length)],
        ["Your player won", backed.length ? `${backed.filter((x) => x.fan.cheering === x.m.winner).length} of ${backed.length}` : "No side taken"],
      ],
      favourite: favouriteOf(items, order),
    },
  };
}

function bindComebacks(all: Item[], order: string[]): BookData {
  const items = all.filter((x) => lostFirst(x.m));
  const others = all.filter((x) => !lostFirst(x.m));
  const forYou = (x: Item) => x.fan.cheering === x.m.winner;
  const against = (x: Item) => x.fan.cheering === x.m.loser;
  const years = byWatchYear(items);
  let prevTitle = "";
  let cumulative = 0;
  const chapters = years.map(({ year, items: ys }, ci): BookChapter => {
    const [f, g] = [ys.filter(forYou).length, ys.filter(against).length];
    const at = (...ways: string[]) => say(`comebacks:${year}`, ...ways);
    const options: Line[] = [];
    if (ci === 0) options.push(at("The first comeback", "The first turnaround", "Where the comebacks start"));
    if (ys.some((x) => twoDown(x.m))) options.push(at("From two sets down", "Back from two sets down", "Two sets down, still won"));
    if (f > g) options.push(at("Your player came back", "Your player fought back", "Comebacks for your side"));
    if (g > f) options.push(at("Against your player", "Your player let it slip", "The ones that got away"));
    options.push(at(`${s(ys.length, "comeback")} in ${year}`, `${year}: ${s(ys.length, "comeback")}`));
    const title = pickTitle(options, prevTitle);
    prevTitle = title.key;
    const previously = ci === 0 ? null : `${s(cumulative, "comeback")} in your log`;
    cumulative += ys.length;
    return {
      key: year,
      year,
      title: title.text,
      previously,
      notes: [],
      side: f + g ? `${s(ys.length, "comeback")}: ${f} for your player, ${g} against.` : `${s(ys.length, "comeback")}. No side taken.`,
      epigraph: epigraphOf(ys),
      entries: ys.map((x) => {
        const [s0] = parseSets(x.m.score);
        return loggedEntry(x, twoDown(x.m) ? `${x.m.winner} was two sets down` : `${x.m.winner} lost the first set ${s0.w}–${s0.l}`);
      }),
      compact: false,
      footer: { label: "Comebacks so far:", value: String(cumulative), share: cumulative / items.length },
    };
  });
  const c = new Map<string, number>();
  for (const x of items) c.set(x.m.winner, (c.get(x.m.winner) ?? 0) + 1);
  const [mostP, mostN] = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    id: "comebacks",
    kind: "collection",
    title: "Comebacks",
    faces: [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p),
    subtitle: `Every winner you watched who lost the first set: ${items.length} so far.`,
    ...(() => {
      const down = (x: Item) => (deficit(x.m) >= 2 ? "From 2 sets down" : "From 1 set down");
      return { ...rowsOf(items, down, (x) => x.m.winner, ["From 1 set down", "From 2 sets down"], (c) => `${c} came back`), stripCaption: "How far behind they were, and who came back." };
    })(),
    facts: [
      ["Comebacks watched", String(items.length)],
      ["Came back most", `${mostP} (${mostN})`],
      ["From two sets down", String(items.filter((x) => twoDown(x.m)).length)],
    ],
    chapters,
    epilogue: {
      big: [
        { label: "for your player", n: items.filter(forYou).length, face: false },
        { label: "against", n: items.filter(against).length, face: false },
      ],
      facts: [["Your average", `${avg(items.map((x) => x.fan.rating)).toFixed(1)} (${avg(others.map((x) => x.fan.rating)).toFixed(1)} for the rest)`]],
      favourite: favouriteOf(items, order),
    },
  };
}

function bindCalls(all: Item[], order: string[]): BookData {
  const items = all.filter((x) => x.fan.pick);
  const years = byWatchYear(items);
  let prevTitle = "";
  let made = 0;
  let right = 0;
  const chapters = years.map(({ year, items: ys }, ci): BookChapter => {
    let run = 0;
    let best = 0;
    for (const x of ys) {
      run = called(x) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    const r = ys.filter(called).length;
    const e = ys.filter(exact).length;
    const at = (...ways: string[]) => say(`calls:${year}`, ...ways);
    const options: Line[] = [];
    if (ci === 0) options.push(at("Your first calls", "First predictions", "Calling it early"));
    if (best >= 3) options.push(at(`${best} right in a row`, `${best} straight right`, `A run of ${best}`));
    if (r === ys.length && ys.length > 1) options.push(at("Every call right", "A perfect year", "Not one wrong"));
    if (r === 0) options.push(at("A year to forget", "None right", "Nothing went your way"));
    options.push(at(`${r} of ${ys.length} right`, `${r} right out of ${ys.length}`));
    const title = pickTitle(options, prevTitle);
    prevTitle = title.key;
    const previously = ci === 0 ? null : `${right} of ${s(made, "call")} right`;
    made += ys.length;
    right += r;
    return {
      key: year,
      year,
      title: title.text,
      previously,
      notes: [],
      side: `${s(ys.length, "call")}, ${r} right${e ? ` (${e} exact)` : ""}.`,
      epigraph: epigraphOf(ys),
      entries: ys.map((x) => {
        const p = x.fan.pick!;
        const went = finished(x.m.score) ? `: it went ${setCount(x.m.score)}` : ": it ended early";
        return loggedEntry(x, `You picked ${p.winner} in ${p.sets}${exact(x) ? ": exactly right" : called(x) ? went : ""}`);
      }),
      compact: false,
      footer: { label: "Your calls so far:", value: `${right} of ${made} right`, share: right / made },
    };
  });

  let run = 0;
  let best = 0;
  for (const x of [...items].sort(byWatched)) {
    run = called(x) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const perPlayer = new Map<string, { n: number; r: number }>();
  for (const x of items) {
    const p = x.fan.pick!.winner;
    const cur = perPlayer.get(p) ?? { n: 0, r: 0 };
    perPlayer.set(p, { n: cur.n + 1, r: cur.r + (called(x) ? 1 : 0) });
  }
  const [picked, pv] = [...perPlayer.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  const r = items.filter(called).length;
  return {
    id: "calls",
    kind: "collection",
    title: "Called It",
    faces: [...perPlayer.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3).map(([p]) => p),
    subtitle: `Every prediction you made: ${items.length} calls.`,
    ...rowsOf(
      items,
      (x) => (exact(x) ? "Winner and sets" : called(x) ? "Winner only" : "Missed"),
      (x) => (exact(x) ? "exact" : called(x) ? "right" : "wrong"),
      ["Winner and sets", "Winner only", "Missed"],
      () => "",
    ),
    stripLegend: [],
    stripCaption: "How close each call came.",
    facts: [
      ["Right", `${r} of ${items.length}`],
      ["Exactly right", String(items.filter(exact).length)],
      ["Longest run", `${best} in a row`],
    ],
    chapters,
    epilogue: {
      big: [
        { label: "right", n: r, face: false },
        { label: "missed", n: items.length - r, face: false },
      ],
      facts: [["Picked most", `${picked}: ${pv.r} of ${pv.n} right`]],
      favourite: favouriteOf(items, order),
    },
  };
}

/** Bind any book on the shelf from the current log. */
export function buildBook(id: string, diary: Diary): BookData {
  const all: Item[] = loggedItems(diary);
  const { order } = diary;
  const book = id.includes("-")
    ? bindRivalry(id, diary)
    : id === "finals"
      ? bindFinals(all, order)
      : id === "five"
        ? bindFive(all, order)
        : id === "comebacks"
          ? bindComebacks(all, order)
          : id === "calls"
            ? bindCalls(all, order)
            : bindSeasons(all, order);
  // Milestones in your log show on their match wherever it turns up
  const marks = milestones(diary);
  for (const chapter of book.chapters)
    for (const e of chapter.entries) if (e.kind === "logged" && marks.has(e.id)) e.marks.push(...marks.get(e.id)!);
  return book;
}

/** Which book a logged match should open in: its rivalry if it has one, otherwise your seasons. */
export function bookFor(id: string, diary: Diary) {
  const m = diary.matches[id];
  const inPair = (p: string) => m.winner === p || m.loser === p;
  return findRivalries(diary.entries, diary.matches).find((r) => inPair(r.players[0]) && inPair(r.players[1]))?.id ?? "seasons";
}

export type MissedMeeting = { key: string; event: string; year: string; round: string; matchId?: string };

/**
 * A rivalry's meetings that aren't in your log, as a list to catch up on: finals first, then
 * semifinals and quarterfinals, newest first within each. Winners are left out, so the list
 * doesn't give the result away.
 */
export function missedMeetings(id: string, diary: Diary) {
  const players = (findRivalries(diary.entries, diary.matches).find((r) => r.id === id)?.players ?? id.split("-")) as [string, string];
  const record = recordFor(id, players, diary);
  const stage = (round: string) => {
    const i = ["F", "SF", "QF"].indexOf(round);
    return i < 0 ? 3 : i;
  };
  const missed = record
    .map((meet, i) => ({ meet, i }))
    .filter(({ meet }) => !meet.logId || !diary.entries[meet.logId])
    .sort((a, b) => stage(a.meet.round) - stage(b.meet.round) || b.meet.date.localeCompare(a.meet.date))
    .map(({ meet, i }): MissedMeeting => ({ key: String(i), event: meet.event, year: meet.date.slice(0, 4), round: roundName(meet), matchId: meet.matchId }));
  return { players, total: record.length, missed };
}

/** How many matches a book holds, for its cover. */
export function shelfCount(id: string, diary: Diary) {
  const rivalry = findRivalries(diary.entries, diary.matches).find((r) => r.id === id);
  if (rivalry) return recordFor(id, rivalry.players, diary).length;
  const all: Item[] = loggedItems(diary);
  if (id === "finals") return all.filter((x) => isFinal(x.m.round)).length;
  if (id === "five") return all.filter((x) => isFive(x.m)).length;
  if (id === "comebacks") return all.filter((x) => lostFirst(x.m)).length;
  if (id === "calls") return all.filter((x) => x.fan.pick).length;
  return all.length;
}
