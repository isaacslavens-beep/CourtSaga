// Turns the record and the fan's log into books. Every title, line and number here comes from
// fixed rules over the data, so the same log always binds the same book. No generated prose:
// the only free text in a book is the fan's own notes. Lines are kept short on purpose.

import { findRivalries, isRewatch, matchById, matches, monthLabel, parseSets, rivalries, setCount, tournamentOf, type FanEntry, type Match } from "./library";
import { rivalryRecords, type RecordMeeting } from "./rivalry-records";

/* ---------- The shape every book shares ---------- */

export type Entry =
  | { kind: "logged"; id: string; m: Match; fan: FanEntry; mark: string | null; detail: string | null }
  | { kind: "other"; key: string; head: string; line: string; mark: string | null };

export type BookChapter = {
  key: string;
  year: string;
  title: string;
  side: string;
  epigraph: { note: string; date: string; id: string } | null;
  entries: Entry[];
  compact: boolean;
  footer: { label: string; value: string; share: number | null };
};

// One mark per match in "The shape of it" chart
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

export type ShelfBook = { id: string; kind: "rivalry" | "collection"; title: string; players: string[]; leather: string; blurb: string };

// The saga unlocks once you've logged this many matches; a collection appears once it has this many
export const SAGA_MIN_MATCHES = 5;
export const COLLECTION_MIN = 3;

const rivalryLeathers = ["#5a2a1f", "#24463a", "#55284d"];
const collections: (Omit<ShelfBook, "kind" | "players"> & { test: (x: Item) => boolean })[] = [
  { id: "seasons", title: "Seasons", leather: "#2f4060", blurb: "matches", test: () => true },
  { id: "five", title: "Five-Setters", leather: "#7a3028", blurb: "matches", test: (x) => isFive(x.m) },
  { id: "comebacks", title: "Comebacks", leather: "#46562f", blurb: "matches", test: (x) => lostFirst(x.m) },
  { id: "calls", title: "Called It", leather: "#6a5226", blurb: "calls", test: (x) => !!x.fan.pick },
];

/** The shelf, decided by rule from the log: rivalries first, then every collection with enough in it. */
export function buildShelf(entries: Record<string, FanEntry>): ShelfBook[] {
  const all: Item[] = loggedItems(entries);
  if (all.length < SAGA_MIN_MATCHES) return [];
  return [
    ...findRivalries(entries).map((r, i) => ({
      id: r.id,
      kind: "rivalry" as const,
      title: r.players.join(" & "),
      players: r.players,
      leather: rivalryLeathers[i % rivalryLeathers.length],
      blurb: "meetings",
    })),
    ...collections
      .filter((c) => c.id === "seasons" || all.filter(c.test).length >= COLLECTION_MIN)
      .map((c) => ({ id: c.id, title: c.title, leather: c.leather, blurb: c.blurb, kind: "collection" as const, players: [] })),
  ];
}

/** Every meeting in a rivalry: the full record when the results data has it, otherwise the ones you logged. */
function recordFor(id: string, [A, B]: [string, string]): RecordMeeting[] {
  return (
    rivalryRecords[id] ??
    matches
      .filter((m) => (m.winner === A && m.loser === B) || (m.winner === B && m.loser === A))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({ date: m.date, event: m.event.replace(/ \d{4}$/, ""), round: m.round, surface: m.surface, winner: m.winner, logId: m.id }))
  );
}

/* ---------- Helpers ---------- */

/** Only the matches you've actually logged */
const loggedItems = (entries: Record<string, FanEntry>): Item[] =>
  matches.filter((m) => entries[m.id]).map((m) => ({ m, fan: entries[m.id] }));

type Item = { m: Match; fan: FanEntry };
const s = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const shortEvent = (m: Match) => m.event.replace(/ \d{4}$/, "");
const byWatched = (a: Item, b: Item) => a.fan.watchedDate.localeCompare(b.fan.watchedDate) || a.m.date.localeCompare(b.m.date);
const called = (x: Item) => !!x.fan.pick && x.fan.pick.winner === x.m.winner;
const exact = (x: Item) => called(x) && x.fan.pick!.sets === setCount(x.m.score);
const isFive = (m: Match) => m.bestOf === 5 && setCount(m.score) === 5;
const lostFirst = (m: Match) => {
  const [s0] = parseSets(m.score);
  return s0.w < s0.l;
};
const twoDown = (m: Match) => {
  const [s0, s1] = parseSets(m.score);
  return s0.w < s0.l && !!s1 && s1.w < s1.l;
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

/** First option that doesn't repeat the previous chapter's title. */
const pickTitle = (options: string[], prev: string) => options.find((t) => t !== prev) ?? options[options.length - 1];

function loggedEntry(x: Item, detail: string | null = null, mark: string | null = null): Entry {
  return {
    kind: "logged",
    id: x.m.id,
    m: x.m,
    fan: x.fan,
    mark: mark ?? (isRewatch(x.m, x.fan) ? `Rewatched ${monthLabel(x.fan.watchedDate)}` : null),
    detail,
  };
}

function favouriteOf(items: Item[], order: string[]) {
  const id = order.find((oid) => items.some((x) => x.m.id === oid));
  const fav = items.find((x) => x.m.id === id);
  return fav ? { label: `${fav.m.event} · ${fav.m.round}`, note: fav.fan.note } : null;
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
        title: `${x.m.event} · ${x.m.round}: ${x.m.winner} won · you rated it ${x.fan.rating}`,
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

function bindRivalry(id: string, entries: Record<string, FanEntry>, order: string[]): BookData {
  const [A, B] = (findRivalries(entries).find((r) => r.id === id)?.players ?? id.split("-")) as [string, string];
  type Beat = { meet: RecordMeeting; m?: Match; fan?: FanEntry; turn: string | null; i: number; a: number; b: number };
  const lead = (a: number, b: number) => (a === b ? null : a > b ? A : B);
  const standing = (a: number, b: number) => (a === b ? `All square, ${a}–${b}` : `${lead(a, b)} leads ${Math.max(a, b)}–${Math.min(a, b)}`);

  let a = 0;
  let b = 0;
  const beats: Beat[] = recordFor(id, [A, B]).map((meet, i) => {
    const before = lead(a, b);
    if (meet.winner === A) a++;
    else b++;
    const after = lead(a, b);
    const turn = i > 0 && after !== before ? (after ? `Put ${after} ahead` : `Levelled it at ${a}–${b}`) : null;
    return { meet, m: meet.logId ? matchById[meet.logId] : undefined, fan: meet.logId ? entries[meet.logId] : undefined, turn, i, a, b };
  });
  const yours = beats.filter((x): x is Beat & Item => !!x.fan && !!x.m);

  let prevTitle = "";
  let beenLevel = false;
  let lastBacker: string | null = null;
  const chapters: BookChapter[] = [...new Set(beats.map((x) => x.meet.date.slice(0, 4)))].map((year, ci) => {
    const cb = beats.filter((x) => x.meet.date.startsWith(year));
    const first = cb[0];
    const last = cb[cb.length - 1];
    const [ba, bb] = [first.a - (first.meet.winner === A ? 1 : 0), first.b - (first.meet.winner === B ? 1 : 0)];
    const winners = cb.map((x) => x.meet.winner);
    const [lb, la] = [lead(ba, bb), lead(last.a, last.b)];
    const [ya, yb] = [winners.filter((w) => w === A).length, winners.filter((w) => w === B).length];

    const options: string[] = [];
    if (ci === 0) options.push(cb.length === 1 ? "The first meeting" : "How it started");
    if (la && la !== lb) options.push(lb ? `${la} moves ahead` : `${la} takes the lead`);
    if (!la && lb) options.push(beenLevel ? "All square again" : "All square");
    if (cb.length > 1 && ya * yb === 0) options.push(`${winners[0]} wins all ${cb.length}`);
    if (la && la === lb) {
      const [gb, ga] = [Math.abs(ba - bb), Math.abs(last.a - last.b)];
      options.push(ga > gb ? `${la} pulls away` : ga < gb ? `${la === A ? B : A} closes the gap` : `${la} holds on`);
    }
    options.push(ya === yb ? `Even in ${year}` : `${Math.max(ya, yb)}–${Math.min(ya, yb)} to ${ya > yb ? A : B}`);
    const title = pickTitle(options, prevTitle);
    prevTitle = title;
    if (cb.some((x) => x.a === x.b)) beenLevel = true;

    // Where you came in this season
    const mine = cb.filter((x): x is Beat & Item => !!x.fan && !!x.m);
    let side: string;
    if (!mine.length) side = cb.length === 1 ? "Not in your log." : `None of these ${cb.length} in your log.`;
    else {
      const seen = mine.length < cb.length ? `You watched ${mine.length} of ${cb.length}. ` : "";
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
      title,
      side,
      epigraph: epigraphOf(mine),
      entries: cb.map((x): Entry =>
        x.fan && x.m
          ? loggedEntry({ m: x.m, fan: x.fan }, null, x.turn)
          : { kind: "other", key: String(x.i), head: `${x.meet.event} · ${x.meet.round}`, line: `${x.meet.winner} won`, mark: x.turn },
      ),
      compact: false,
      footer: { label: `End of ${year}:`, value: standing(last.a, last.b), share: last.a / (last.a + last.b) },
    };
  });

  const view = { a: yours.filter((x) => x.meet.winner === A).length, b: yours.filter((x) => x.meet.winner === B).length };
  const swings = beats.filter((x) => x.turn);
  const finals = beats.filter((x) => x.meet.round === "Final");
  const backed = yours.filter((x) => x.fan.cheering);
  const calls = yours.filter((x) => x.fan.pick);

  return {
    id,
    kind: "rivalry",
    title: `${A} & ${B}`,
    faces: [A, B],
    subtitle: `All ${beats.length} meetings, ${beats[0].meet.date.slice(0, 4)}–${beats[beats.length - 1].meet.date.slice(0, 4)}. You watched ${yours.length}.`,
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
    stripCaption: "Every meeting in order: above the line for one player, below for the other.",
    stripLegend: [
      { color: A, label: `${A} won` },
      { color: B, label: `${B} won` },
      { color: "", label: "Not in your log", faded: true },
    ],
    facts: [
      ["Overall", standing(a, b)],
      ["In the ones you watched", view.a === view.b ? `${view.a}–${view.b}` : `${view.a > view.b ? A : B} ${Math.max(view.a, view.b)}–${Math.min(view.a, view.b)}`],
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

    const options: string[] = [];
    if (ci === 0) options.push("Where it started");
    if (top && prevTop && top.player !== prevTop) options.push(`The switch to ${top.player}`);
    if (live && !liveBefore) options.push("First time in person");
    if (rewatches && !rewatchBefore) options.push("Back to the classics");
    if (n === maxN && n > 2) options.push("Your busiest season");
    if (top && top.n / n >= 0.5) options.push(`Mostly ${top.player}`);
    options.push(`${n} matches in ${year}`);
    const title = pickTitle(options, prevTitle);
    prevTitle = title;
    if (top) prevTop = top.player;
    if (live) liveBefore = true;
    if (rewatches) rewatchBefore = true;

    const calls = ys.filter((x) => x.fan.pick);
    cumulative += n;
    return {
      key: year,
      year,
      title,
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

function bindFive(all: Item[], order: string[]): BookData {
  const items = all.filter((x) => isFive(x.m));
  const others = all.filter((x) => !isFive(x.m));
  const years = byWatchYear(items);
  let prevTitle = "";
  let cumulative = 0;
  const chapters = years.map(({ year, items: ys }, ci): BookChapter => {
    const options: string[] = [];
    if (ci === 0) options.push("The first one");
    if (ys.some((x) => twoDown(x.m))) options.push("From two sets down");
    if (ys.some((x) => fifthTiebreak(x.m))) options.push("A fifth-set tiebreak");
    if (ys.some((x) => fifthLong(x.m))) options.push("Past 6–6 in the fifth");
    options.push(`${s(ys.length, "five-setter")} in ${year}`);
    const title = pickTitle(options, prevTitle);
    prevTitle = title;
    cumulative += ys.length;
    const top = mostBacked(ys);
    return {
      key: year,
      year,
      title,
      side: `${s(ys.length, "five-setter")}. ${top ? `Backed ${top.player}: ${top.record}.` : "No side taken."}`,
      epigraph: epigraphOf(ys),
      entries: ys.map((x) => loggedEntry(x, `Fifth set ${lastSet(x.m)}`, twoDown(x.m) ? "From two sets down" : null)),
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
    const options: string[] = [];
    if (ci === 0) options.push("The first comeback");
    if (ys.some((x) => twoDown(x.m))) options.push("From two sets down");
    if (f > g) options.push("Your player came back");
    if (g > f) options.push("Against your player");
    options.push(`${s(ys.length, "comeback")} in ${year}`);
    const title = pickTitle(options, prevTitle);
    prevTitle = title;
    cumulative += ys.length;
    return {
      key: year,
      year,
      title,
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
    const options: string[] = [];
    if (ci === 0) options.push("Your first calls");
    if (best >= 3) options.push(`${best} right in a row`);
    if (r === ys.length && ys.length > 1) options.push("Every call right");
    if (r === 0) options.push("A year to forget");
    options.push(`${r} of ${ys.length} right`);
    const title = pickTitle(options, prevTitle);
    prevTitle = title;
    made += ys.length;
    right += r;
    return {
      key: year,
      year,
      title,
      side: `${s(ys.length, "call")}, ${r} right${e ? ` (${e} exact)` : ""}.`,
      epigraph: epigraphOf(ys),
      entries: ys.map((x) => {
        const p = x.fan.pick!;
        return loggedEntry(x, `You picked ${p.winner} in ${p.sets}${exact(x) ? ": exactly right" : called(x) ? `: it went ${setCount(x.m.score)}` : ""}`);
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
export function buildBook(id: string, entries: Record<string, FanEntry>, order: string[]): BookData {
  if (id.includes("-")) return bindRivalry(id, entries, order);
  const all: Item[] = loggedItems(entries);
  if (id === "five") return bindFive(all, order);
  if (id === "comebacks") return bindComebacks(all, order);
  if (id === "calls") return bindCalls(all, order);
  return bindSeasons(all, order);
}

/** Which book a logged match should open in: its rivalry if it has one, otherwise your seasons. */
export function bookFor(id: string) {
  const m = matchById[id];
  const inPair = (p: string) => m.winner === p || m.loser === p;
  return rivalries.find((r) => inPair(r.players[0]) && inPair(r.players[1]))?.id ?? "seasons";
}

/** How many matches a book holds, for its cover. */
export function shelfCount(id: string, entries: Record<string, FanEntry>) {
  const rivalry = findRivalries(entries).find((r) => r.id === id);
  if (rivalry) return recordFor(id, rivalry.players).length;
  const all: Item[] = loggedItems(entries);
  if (id === "five") return all.filter((x) => isFive(x.m)).length;
  if (id === "comebacks") return all.filter((x) => lostFirst(x.m)).length;
  if (id === "calls") return all.filter((x) => x.fan.pick).length;
  return all.length;
}
