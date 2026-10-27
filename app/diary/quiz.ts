// The quiz: questions written by rule from every match in the data, one tour at a time, and quizzes drawn
// from them at random. Like the record books (records.ts), the questions come from fixed rules, so the
// same data always gives the same bank; only the draw is random, so the same settings give a new quiz each
// time. Every answer is typed: a name, a year or a number, never a choice from a list.

import type { RecordBooks, RecordMatch } from "./records";
import type { Player, Round, Tier, Tour } from "./library";

/* ---------- What it reads and gives ---------- */

export type QuizPlayer = Player & { hand: string | null; height: number | null };
export type QuizInput = { tour: Tour; matches: RecordMatch[]; players: Record<string, QuizPlayer>; last: string; books: RecordBooks | null };

// How well known a fact is: 1 is what most fans know, 4 is what almost nobody does
export type Level = 1 | 2 | 3 | 4;
export const levelNames: Record<Level, string> = { 1: "Easy", 2: "Medium", 3: "Hard", 4: "Extreme" };

export type TopicId = "slams" | "titles" | "rivalries" | "careers" | "records" | "oddities";
export const topics: { id: TopicId; label: string; blurb: string }[] = [
  { id: "slams", label: "Grand Slams", blurb: "Champions, finals, years and upsets" },
  { id: "titles", label: "Other titles", blurb: "1000s, the tour finals, the Olympics, 500s and 250s" },
  { id: "rivalries", label: "Rivalries", blurb: "Head-to-heads and first meetings" },
  { id: "careers", label: "Careers", blurb: "First titles, No. 1s, title counts, who am I" },
  { id: "records", label: "Records", blurb: "Streaks, seasons and the Statistics boards" },
  { id: "oddities", label: "Oddities", blurb: "Aces, the longest matches, qualifiers' runs" },
];

export type Answer = { kind: "name"; key: string; text: string } | { kind: "year"; value: number } | { kind: "number"; value: number };

export type Question = {
  id: string; // the rule and what it's about, so a quiz never asks the same thing twice
  rule: string;
  tour: Tour;
  topic: TopicId;
  level: Level;
  prompt: string;
  answer: Answer;
  fact: string; // shown once it's answered
  go: string | null; // a match to open in Explore
  about: string[]; // the players it's about or answered by, for a quiz on one player
  season: number | null; // the season it's about, or null for a whole career or record
  events: string[]; // the tournament it's about, as the data names it, or none
};

export type BankPlayer = { key: string; name: string; short: string; matches: number };

export type QuestionBank = {
  tour: Tour;
  from: number; // the first season in the data
  to: number; // the latest
  last: string; // the latest match date
  questions: Question[];
  players: BankPlayer[]; // everyone who played, for checking names
};

/* ---------- Small helpers ---------- */

const ladder: Round[] = ["RR", "R128", "R64", "R32", "R16", "QF", "SF", "BR", "3P", "F"];
const chron = (x: RecordMatch, y: RecordMatch) =>
  x.start.localeCompare(y.start) || ladder.indexOf(x.round) - ladder.indexOf(y.round) || (x.num ?? 0) - (y.num ?? 0) || x.id.localeCompare(y.id);
const titleTiers = new Set<Tier>(["slam", "1000", "500", "250", "finals", "olympics"]);
const exhibitions = new Set(["Laver Cup", "Next Gen Finals"]);
const isTitle = (m: RecordMatch) => m.round === "F" && titleTiers.has(m.tier) && !exhibitions.has(m.event);
const STAT = { ace: 0 } as const;

const roundWords: Partial<Record<Round, string>> = { R128: "first round", R64: "second round", R32: "third round", R16: "fourth round", QF: "quarterfinals", SF: "semifinals", F: "final" };
const otherRoundWords: Partial<Record<Round, string>> = { R128: "round of 128", R64: "round of 64", R32: "round of 32", R16: "round of 16", QF: "quarterfinals", SF: "semifinals", F: "final" };
const roundIn = (m: RecordMatch) => (m.tier === "slam" ? roundWords : otherRoundWords)[m.round] ?? "round robin";

/** "at Wimbledon", "at the ATP Finals", "at the Canadian Open" */
function at(event: string) {
  if (event === "Canada") return "at the Canadian Open";
  if (event === "Olympics") return "at the Olympics";
  return /^(ATP|WTA) |Finals$|Masters$|Trophy$|Tournament|Open$|Cup$/.test(event) ? `at the ${event}` : `at ${event}`;
}
/** "Wimbledon", "the Australian Open" */
const the = (event: string) => at(event).slice(3);
/** "the 2008 Wimbledon final" reads better than "the Wimbledon 2008 final" */
const theFinal = (m: RecordMatch) =>
  m.event === "Olympics"
    ? `the ${m.season} Olympic final`
    : /Finals$|Trophy$|Champions$/.test(m.event)
      ? `the final of the ${m.season} ${m.event}`
      : `the ${m.season} ${m.event === "Canada" ? "Canadian Open" : m.event} final`;
const flipped = (score: string) => score.replace(/(\[?)(\d+)-(\d+)/g, "$1$3-$2");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- How well known each player is ---------- */

type Career = {
  key: string;
  matches: number;
  titles: RecordMatch[]; // finals won, in order
  slams: RecordMatch[];
  best: number; // best ranking, from any match
  first: RecordMatch; // first match in the data
  last: RecordMatch;
  firstNo1: RecordMatch | null;
  // Whether the player was already a name when the data starts, so "first" questions could be wrong
  veteran: boolean;
};

// 3: a legend (three Slams, or No. 1, or 30 titles); 2: a star; 1: a known name; 0: everyone else
function fameOf(c: Career | undefined): 0 | 1 | 2 | 3 {
  if (!c) return 0;
  if (c.slams.length >= 3 || c.best === 1 || c.titles.length >= 30) return 3;
  if (c.slams.length >= 1 || c.best <= 5 || c.titles.length >= 12) return 2;
  if (c.best <= 20 || c.titles.length >= 3) return 1;
  return 0;
}

/* ---------- The bank ---------- */

// The rules whose questions are about one tournament: a quiz on chosen tournaments draws only on these
const tournamentRules = new Set(["slam-champion", "slam-runner-up", "final-year", "slam-once", "slam-event-count", "slam-event-last", "slam-upset", "champion", "big-champion", "big-runner-up", "slam-aces", "slam-longest", "slam-qualifier"]);

export function buildQuestions({ tour, matches, players, last, books }: QuizInput): QuestionBank {
  const played = matches.filter((m) => !exhibitions.has(m.event) && m.tier !== "team" && m.tier !== "other").sort(chron);
  const from = played[0]?.season ?? 2003;
  const to = played[played.length - 1]?.season ?? from;
  const tw = tour === "atp" ? "men's" : "women's";
  const name = (key: string) => players[key]?.name ?? key;
  const out: Question[] = [];
  const seen = new Set<string>();
  const byId = new Map(played.map((m) => [m.id, m]));
  const add = (q: Omit<Question, "tour" | "events"> & { tour?: Tour }) => {
    if (seen.has(q.id)) return;
    seen.add(q.id);
    // A question about one tournament is about the event of its match; a career, a rivalry or a record isn't
    const at = tournamentRules.has(q.rule) && q.go ? byId.get(q.go)?.event : undefined;
    out.push({ ...q, id: `${tour}:${q.id}`, tour, events: at ? [at] : [] });
  };

  // Careers, in one pass
  const careers = new Map<string, Career>();
  const career = (key: string, m: RecordMatch) => {
    let c = careers.get(key);
    if (!c) careers.set(key, (c = { key, matches: 0, titles: [], slams: [], best: 9999, first: m, last: m, firstNo1: null, veteran: false }));
    return c;
  };
  for (const m of played) {
    for (const [key, rank] of [
      [m.w, m.wr],
      [m.l, m.lr],
    ] as const) {
      const c = career(key, m);
      c.matches++;
      c.last = m;
      if (rank) {
        c.best = Math.min(c.best, rank);
        if (rank === 1 && !c.firstNo1) c.firstNo1 = m;
      }
    }
    if (isTitle(m)) {
      const c = career(m.w, m);
      c.titles.push(m);
      if (m.tier === "slam") c.slams.push(m);
    }
  }
  // Ranked in the top 40 as a grown-up from the start: may have won things before 2003
  for (const c of careers.values()) {
    const r = c.first.w === c.key ? c.first.wr : c.first.lr;
    const a = c.first.w === c.key ? c.first.wa : null;
    c.veteran = c.first.season === from && !!r && r <= 40 && (a === null || a >= 20);
  }
  const fame = (key: string) => fameOf(careers.get(key));
  const active = (key: string) => (Date.parse(last) - Date.parse(careers.get(key)!.last.date)) / 86_400_000 < 200;
  const since = (key: string) => (careers.get(key)!.first.season === from ? ` since ${from}` : "");

  const finals = played.filter(isTitle);

  /* Grand Slams */
  for (const m of finals.filter((f) => f.tier === "slam")) {
    const fw = fame(m.w);
    const fl = fame(m.l);
    const fact = `${name(m.w)} beat ${name(m.l)} ${m.score} in the final.`;
    add({
      id: `slam-champion:${m.id}`,
      rule: "slam-champion",
      topic: "slams",
      level: fw === 3 ? 1 : fw === 2 ? 2 : 3,
      prompt: `Who won the ${tw} singles title ${at(m.event)} in ${m.season}?`,
      answer: { kind: "name", key: m.w, text: name(m.w) },
      fact,
      go: m.id,
      about: [m.w],
      season: m.season,
    });
    add({
      id: `slam-runner-up:${m.id}`,
      rule: "slam-runner-up",
      topic: "slams",
      level: fl === 3 ? 1 : fl === 2 ? 2 : 3,
      prompt: `Who did ${name(m.w)} beat in ${theFinal(m)}?`,
      answer: { kind: "name", key: m.l, text: name(m.l) },
      fact: `${name(m.w)} won ${m.score}.`,
      go: m.id,
      about: [m.w, m.l],
      season: m.season,
    });
  }
  // The year of a final between two players, where they only met in that final once
  const finalPairs = new Map<string, RecordMatch[]>();
  for (const m of finals) {
    const k = `${m.event}|${m.w}|${m.l}`;
    finalPairs.set(k, [...(finalPairs.get(k) ?? []), m]);
  }
  for (const [, ms] of finalPairs) {
    if (ms.length !== 1) continue;
    const m = ms[0];
    if (m.tier !== "slam" && m.tier !== "finals" && m.tier !== "olympics" && m.tier !== "1000") continue;
    const both = Math.min(fame(m.w), fame(m.l));
    const big = m.tier === "slam";
    add({
      id: `final-year:${m.id}`,
      rule: "final-year",
      topic: big ? "slams" : "titles",
      level: (big ? (both === 3 ? 2 : 3) : both === 3 ? 3 : 4) as Level,
      prompt: `In which year did ${name(m.w)} beat ${name(m.l)} in the ${m.event === "Olympics" ? "Olympic" : m.event === "Canada" ? "Canadian Open" : m.event} final?`,
      answer: { kind: "year", value: m.season },
      fact: `${m.event} ${m.season}: ${name(m.w)} won ${m.score}.`,
      go: m.id,
      about: [m.w, m.l],
      season: m.season,
    });
  }
  // Each player's Slams: the first, the only one at an event, the count at each, the last for the retired
  const slamsBy = new Map<string, RecordMatch[]>();
  for (const m of finals.filter((f) => f.tier === "slam")) slamsBy.set(m.w, [...(slamsBy.get(m.w) ?? []), m]);
  for (const [key, won] of slamsBy) {
    const c = careers.get(key)!;
    const f = fame(key);
    const firstSlam = won[0];
    if (!c.veteran)
      add({
        id: `slam-first:${key}`,
        rule: "slam-first",
        topic: "slams",
        level: f === 3 ? 2 : 3,
        prompt: `In which year did ${name(key)} win a first Grand Slam title?`,
        answer: { kind: "year", value: firstSlam.season },
        fact: `${firstSlam.event} ${firstSlam.season}, beating ${name(firstSlam.l)} ${firstSlam.score} in the final.`,
        go: firstSlam.id,
        about: [key],
        season: firstSlam.season,
      });
    if (won.length >= 2)
      add({
        id: `slam-count:${key}`,
        rule: "slam-count",
        topic: "slams",
        level: won.length >= 4 ? 2 : 3,
        prompt: `How many Grand Slam singles titles ${active(key) ? `has ${name(key)} won` : `did ${name(key)} win`}${since(key)}?`,
        answer: { kind: "number", value: won.length },
        fact: `${won.length}: ${summarise(won)}.`,
        go: won[won.length - 1].id,
        about: [key],
        season: null,
      });
    const byEvent = new Map<string, RecordMatch[]>();
    for (const m of won) byEvent.set(m.event, [...(byEvent.get(m.event) ?? []), m]);
    for (const [event, ms] of byEvent) {
      if (ms.length === 1 && !c.veteran)
        add({
          id: `slam-once:${key}:${event}`,
          rule: "slam-once",
          topic: "slams",
          level: f === 3 ? 2 : 3,
          prompt: `${name(key)} won ${the(event)} once. In which year?`,
          answer: { kind: "year", value: ms[0].season },
          fact: `${event} ${ms[0].season}, beating ${name(ms[0].l)} ${ms[0].score} in the final.`,
          go: ms[0].id,
          about: [key],
          season: ms[0].season,
        });
      else {
        add({
          id: `slam-event-count:${key}:${event}`,
          rule: "slam-event-count",
          topic: "slams",
          level: ms.length >= 5 ? 2 : 3,
          prompt: `How many ${event} titles ${active(key) ? `has ${name(key)} won` : `did ${name(key)} win`}${since(key)}?`,
          answer: { kind: "number", value: ms.length },
          fact: `${ms.length}: ${ms.map((m) => m.season).join(", ")}.`,
          go: ms[ms.length - 1].id,
          about: [key],
          season: null,
        });
        if (!active(key))
          add({
            id: `slam-event-last:${key}:${event}`,
            rule: "slam-event-last",
            topic: "slams",
            level: f === 3 ? 3 : 4,
            prompt: `In which year did ${name(key)} win ${the(event)} for the last time?`,
            answer: { kind: "year", value: ms[ms.length - 1].season },
            fact: `${ms.length} titles there: ${ms.map((m) => m.season).join(", ")}.`,
            go: ms[ms.length - 1].id,
            about: [key],
            season: ms[ms.length - 1].season,
          });
      }
    }
  }
  // Upsets: a legend beaten before the semifinals of a Slam by someone less known
  for (const m of played) {
    if (m.tier !== "slam" || !["R128", "R64", "R32", "R16", "QF"].includes(m.round) || m.outcome !== "completed") continue;
    if (fame(m.l) < 3 || fame(m.w) >= fame(m.l)) continue;
    const late = m.round === "QF" || m.round === "R16";
    add({
      id: `slam-upset:${m.id}`,
      rule: "slam-upset",
      topic: "slams",
      level: late && fame(m.w) >= 2 ? 2 : 3,
      prompt: `Who knocked ${name(m.l)} out of ${the(m.event)} in ${m.season}, in the ${roundIn(m)}?`,
      answer: { kind: "name", key: m.w, text: name(m.w) },
      fact: `${name(m.w)}${m.wr ? `, ranked No. ${m.wr},` : ""} won ${m.score}.`,
      go: m.id,
      about: [m.w, m.l],
      season: m.season,
    });
  }

  /* Other titles */
  for (const m of finals.filter((f) => f.tier !== "slam" && !/\d$/.test(f.event))) {
    const fw = fame(m.w);
    const big = m.tier === "finals" || m.tier === "olympics";
    // The 1000s, the tour finals and the Olympics are the big tournaments after the Slams
    const major = big || m.tier === "1000";
    const level: Level = big ? (fw === 3 ? 2 : 3) : m.tier === "1000" ? (fw === 3 ? 3 : 4) : m.tier === "500" && fw === 3 ? 3 : 4;
    if (major) {
      const fl = fame(m.l);
      add({
        id: `big-runner-up:${m.id}`,
        rule: "big-runner-up",
        topic: "titles",
        level: (big ? (fl === 3 ? 2 : 3) : fl === 3 ? 3 : 4) as Level,
        prompt: m.event === "Olympics" ? `Who did ${name(m.w)} beat for ${tw} singles gold at the ${m.season} Olympics?` : `Who did ${name(m.w)} beat in ${theFinal(m)}?`,
        answer: { kind: "name", key: m.l, text: name(m.l) },
        fact: `${name(m.w)} won ${m.score}.`,
        go: m.id,
        about: [m.w, m.l],
        season: m.season,
      });
    }
    add({
      id: `champion:${m.id}`,
      rule: major ? "big-champion" : "champion",
      topic: "titles",
      level,
      prompt: m.event === "Olympics" ? `Who won ${tw} singles gold at the ${m.season} Olympics?` : `Who won the ${tw} title ${at(m.event)} in ${m.season}?`,
      answer: { kind: "name", key: m.w, text: name(m.w) },
      fact: `${name(m.w)} beat ${name(m.l)} ${m.score} in the final.`,
      go: m.id,
      about: [m.w],
      season: m.season,
    });
  }

  /* Careers */
  for (const c of careers.values()) {
    const f = fameOf(c);
    const key = c.key;
    if (c.titles.length >= 3 && f >= 2)
      add({
        id: `title-count:${key}`,
        rule: "title-count",
        topic: "careers",
        level: 4,
        prompt: `How many tour-level singles titles ${active(key) ? `has ${name(key)} won` : `did ${name(key)} win`}${since(key)}?`,
        answer: { kind: "number", value: c.titles.length },
        fact: `${c.titles.length} titles, from ${c.titles[0].event} ${c.titles[0].season} to ${c.titles[c.titles.length - 1].event} ${c.titles[c.titles.length - 1].season}.`,
        go: c.titles[c.titles.length - 1].id,
        about: [key],
        season: null,
      });
    if (c.titles.length && !c.veteran && f >= 1) {
      const t = c.titles[0];
      add({
        id: `title-first:${key}`,
        rule: "title-first",
        topic: "careers",
        level: f === 3 ? 3 : 4,
        prompt: `In which year did ${name(key)} win a first tour-level title?`,
        answer: { kind: "year", value: t.season },
        fact: `${t.event} ${t.season}, beating ${name(t.l)} ${t.score} in the final.`,
        go: t.id,
        about: [key],
        season: t.season,
      });
    }
    // The first match as No. 1, where the data didn't start with them there
    if (c.firstNo1 && c.firstNo1.date.slice(0, 7) > `${from}-02`) {
      const m = c.firstNo1;
      add({
        id: `no1-first:${key}`,
        rule: "no1-first",
        topic: "careers",
        level: f === 3 && c.slams.length >= 4 ? 2 : 3,
        prompt: `In which year did ${name(key)} first reach No. 1 in the rankings?`,
        answer: { kind: "year", value: Number(m.date.slice(0, 4)) },
        fact: `${name(key)} first played as No. 1 at ${m.event} ${m.season}.`,
        go: m.id,
        about: [key],
        season: Number(m.date.slice(0, 4)),
      });
    }
    // Who am I: the titles, the hand and the height
    if (c.titles.length >= 5 && f >= 1) {
      const p = players[key];
      const clues = [
        `I won ${plural(c.titles.length, "title")}${since(key) ? ` from ${from} on` : ""}, the first ${at(c.titles[0].event)} in ${c.titles[0].season}, the last ${at(c.titles[c.titles.length - 1].event)} in ${c.titles[c.titles.length - 1].season}.`,
        c.slams.length ? `${plural(c.slams.length, "of them was a Slam", "of them were Slams")}.` : "None of them was a Slam.",
        c.best <= 10 ? `My best ranking was No. ${c.best}.` : `I never made the top 10; my best was No. ${c.best}.`,
        p?.hand === "L" ? "I'm left-handed." : null,
        p?.height ? `I'm ${p.height} cm tall.` : null,
        p?.ioc ? `I play for ${p.ioc}.` : null,
      ].filter(Boolean);
      add({
        id: `who-am-i:${key}`,
        rule: "who-am-i",
        topic: "careers",
        level: f === 3 ? 2 : f === 2 ? 3 : 4,
        prompt: `Who am I? ${clues.join(" ")}`,
        answer: { kind: "name", key, text: name(key) },
        fact: `${name(key)}: ${c.matches} tour-level matches from ${c.first.season} to ${c.last.season}.`,
        go: c.titles[c.titles.length - 1].id,
        about: [key],
        season: null,
      });
    }
  }

  /* Rivalries */
  const pairs = new Map<string, RecordMatch[]>();
  for (const m of played) {
    const k = [m.w, m.l].sort().join("|");
    pairs.set(k, [...(pairs.get(k) ?? []), m]);
  }
  const beatenBy = new Map<string, Map<string, number>>();
  const beat = new Map<string, Map<string, number>>();
  for (const m of played) {
    if (!beatenBy.has(m.l)) beatenBy.set(m.l, new Map());
    beatenBy.get(m.l)!.set(m.w, (beatenBy.get(m.l)!.get(m.w) ?? 0) + 1);
    if (!beat.has(m.w)) beat.set(m.w, new Map());
    beat.get(m.w)!.set(m.l, (beat.get(m.w)!.get(m.l) ?? 0) + 1);
  }
  const topOf = (counts: Map<string, number> | undefined) => {
    const sorted = [...(counts ?? [])].sort((a, b) => b[1] - a[1]);
    return sorted.length && sorted[0][1] >= 4 && (sorted.length === 1 || sorted[1][1] < sorted[0][1]) ? sorted[0] : null;
  };
  const h2h = (a: string, b: string) => {
    const ms = pairs.get([a, b].sort().join("|")) ?? [];
    const aw = ms.filter((m) => m.w === a).length;
    return { ms, aw, bw: ms.length - aw };
  };
  for (const c of careers.values()) {
    const f = fameOf(c);
    if (f < 2) continue;
    const nemesis = topOf(beatenBy.get(c.key));
    if (nemesis) {
      const { aw, bw, ms } = h2h(nemesis[0], c.key);
      add({
        id: `nemesis:${c.key}`,
        rule: "nemesis",
        topic: "rivalries",
        level: fame(nemesis[0]) === 3 && f === 3 ? 2 : fame(nemesis[0]) >= 2 ? 3 : 4,
        prompt: `Who beat ${name(c.key)} more often than anyone else did?`,
        answer: { kind: "name", key: nemesis[0], text: name(nemesis[0]) },
        fact: `${name(nemesis[0])} won ${aw} of their ${ms.length} meetings (${aw}–${bw}).`,
        go: ms[ms.length - 1].id,
        about: [c.key, nemesis[0]],
        season: null,
      });
    }
    const victim = topOf(beat.get(c.key));
    if (victim) {
      const { aw, bw, ms } = h2h(c.key, victim[0]);
      add({
        id: `victim:${c.key}`,
        rule: "victim",
        topic: "rivalries",
        level: fame(victim[0]) >= 2 && f === 3 ? 3 : 4,
        prompt: `Who did ${name(c.key)} beat more often than anyone else?`,
        answer: { kind: "name", key: victim[0], text: name(victim[0]) },
        fact: `${name(c.key)} leads it ${aw}–${bw}.`,
        go: ms[ms.length - 1].id,
        about: [c.key, victim[0]],
        season: null,
      });
    }
  }
  // Who leads it, between two Slam champions who've met a few times and aren't level
  const slamWinners = new Set(finals.filter((f) => f.tier === "slam").map((f) => f.w));
  for (const [k, ms] of pairs) {
    const [a, b] = k.split("|");
    if (!slamWinners.has(a) || !slamWinners.has(b) || ms.length < 3) continue;
    const { aw, bw } = h2h(a, b);
    if (aw === bw) continue;
    const [lead, trail, w, l] = aw > bw ? [a, b, aw, bw] : [b, a, bw, aw];
    const level = Math.min(4, (fame(a) === 3 && fame(b) === 3 ? 2 : 3) + (w - l <= 1 ? 1 : 0)) as Level;
    add({
      id: `h2h-leader:${k}`,
      rule: "h2h-leader",
      topic: "rivalries",
      level,
      prompt: `Who has the better record against the other${since(a) || since(b) ? ` since ${from}` : ""}: ${name(a)} or ${name(b)}?`,
      answer: { kind: "name", key: lead, text: name(lead) },
      fact: `${name(lead)} leads ${name(trail)} ${w}–${l}.`,
      go: ms[ms.length - 1].id,
      about: [a, b],
      season: null,
    });
  }
  for (const [k, ms] of pairs) {
    const [a, b] = k.split("|");
    const both = Math.min(fame(a), fame(b));
    if (ms.length >= 15 && both >= 2) {
      const { aw } = h2h(a, b);
      add({
        id: `h2h-count:${k}`,
        rule: "h2h-count",
        topic: "rivalries",
        level: both === 3 ? 3 : 4,
        prompt: `How many times did ${name(a)} and ${name(b)} play each other${since(a) || since(b) ? ` since ${from}` : ""}?`,
        answer: { kind: "number", value: ms.length },
        fact: `${ms.length} meetings: ${name(a)} won ${aw}, ${name(b)} ${ms.length - aw}.`,
        go: ms[ms.length - 1].id,
        about: [a, b],
        season: null,
      });
    }
    if (ms.length >= 8 && both >= 2 && !careers.get(a)!.veteran && !careers.get(b)!.veteran) {
      const m = ms[0];
      add({
        id: `h2h-first:${k}`,
        rule: "h2h-first",
        topic: "rivalries",
        level: both === 3 ? 3 : 4,
        prompt: `In which year did ${name(a)} and ${name(b)} first play each other on the tour?`,
        answer: { kind: "year", value: Number(m.date.slice(0, 4)) },
        fact: `${m.event} ${m.season}, ${roundIn(m)}: ${name(m.w)} won ${m.score}.`,
        go: m.id,
        about: [a, b],
        season: Number(m.date.slice(0, 4)),
      });
    }
  }

  /* Records: seasons, and the leaders of the Statistics boards */
  const bySeason = new Map<number, RecordMatch[]>();
  for (const m of played) bySeason.set(m.season, [...(bySeason.get(m.season) ?? []), m]);
  for (const [season, ms] of bySeason) {
    if (season === to && Date.parse(last) < Date.parse(`${season}-11-20`)) continue; // a season still being played
    const wins = new Map<string, number>();
    const titles = new Map<string, number>();
    for (const m of ms) {
      wins.set(m.w, (wins.get(m.w) ?? 0) + 1);
      if (isTitle(m)) titles.set(m.w, (titles.get(m.w) ?? 0) + 1);
    }
    const mostWins = topOf(wins);
    if (mostWins)
      add({
        id: `season-wins:${season}`,
        rule: "season-wins",
        topic: "records",
        level: fame(mostWins[0]) === 3 ? 2 : 3,
        prompt: `Who won the most matches on the ${tw} tour in ${season}?`,
        answer: { kind: "name", key: mostWins[0], text: name(mostWins[0]) },
        fact: `${name(mostWins[0])} won ${mostWins[1]} matches.`,
        go: null,
        about: [mostWins[0]],
        season,
      });
    const mostTitles = [...titles].sort((x, y) => y[1] - x[1]);
    if (mostTitles.length && mostTitles[0][1] >= 3 && (mostTitles.length === 1 || mostTitles[1][1] < mostTitles[0][1]))
      add({
        id: `season-titles:${season}`,
        rule: "season-titles",
        topic: "records",
        level: fame(mostTitles[0][0]) === 3 ? 2 : 3,
        prompt: `Who won the most ${tw} titles in ${season}?`,
        answer: { kind: "name", key: mostTitles[0][0], text: name(mostTitles[0][0]) },
        fact: `${name(mostTitles[0][0])} won ${mostTitles[0][1]}.`,
        go: null,
        about: [mostTitles[0][0]],
        season,
      });
  }
  if (books) for (const q of boardQuestions(books, tw, from)) add({ ...q, level: (fame(q.answer.kind === "name" ? q.answer.key : "") === 3 ? 3 : 4) as Level });

  /* Oddities: in each Slam, the most aces in a match, the longest match, and qualifiers who went deep */
  const slamEditions = new Map<string, RecordMatch[]>();
  for (const m of played) if (m.tier === "slam") slamEditions.set(m.tourneyId, [...(slamEditions.get(m.tourneyId) ?? []), m]);
  for (const [, ms] of slamEditions) {
    const e = ms[0];
    const aces = ms
      .flatMap((m) => [
        { m, key: m.w, n: m.wst?.[STAT.ace] },
        { m, key: m.l, n: m.lst?.[STAT.ace] },
      ])
      .filter((x): x is { m: RecordMatch; key: string; n: number } => typeof x.n === "number")
      .sort((x, y) => y.n - x.n);
    if (aces.length > ms.length && aces[0].n > (aces[1]?.n ?? 0)) {
      const { m, key, n } = aces[0];
      add({
        id: `slam-aces:${e.tourneyId}`,
        rule: "slam-aces",
        topic: "oddities",
        level: 4,
        prompt: `Who hit the most aces in one match ${at(e.event)} in ${e.season}?`,
        answer: { kind: "name", key, text: name(key) },
        fact: `${n} aces, in the ${roundIn(m)} against ${name(m.w === key ? m.l : m.w)} (${m.w === key ? "won" : "lost"} ${m.w === key ? m.score : flipped(m.score)}).`,
        go: m.id,
        about: [key],
        season: e.season,
      });
    }
    const long = ms.filter((m) => m.minutes && m.minutes < 1000).sort((x, y) => y.minutes! - x.minutes!);
    if (long.length > ms.length / 2 && long[0].minutes! > (long[1]?.minutes ?? 0)) {
      const m = long[0];
      add({
        id: `slam-longest:${e.tourneyId}`,
        rule: "slam-longest",
        topic: "oddities",
        level: m.minutes! >= 400 ? 3 : 4,
        prompt: `Who won the longest match ${at(e.event)} in ${e.season}?`,
        answer: { kind: "name", key: m.w, text: name(m.w) },
        fact: `${Math.floor(m.minutes! / 60)} h ${String(m.minutes! % 60).padStart(2, "0")} in the ${roundIn(m)}: ${name(m.w)} beat ${name(m.l)} ${m.score}.`,
        go: m.id,
        about: [m.w, m.l],
        season: e.season,
      });
    }
    // Qualifiers and lucky losers in the quarterfinals or later: how far the furthest went
    const deep = new Map<string, RecordMatch>();
    for (const m of ms)
      for (const [key, entry] of [
        [m.w, m.we],
        [m.l, m.le],
      ] as const)
        if ((entry === "Q" || entry === "LL") && ["QF", "SF", "F"].includes(m.round)) {
          const cur = deep.get(key);
          if (!cur || ladder.indexOf(m.round) > ladder.indexOf(cur.round)) deep.set(key, m);
        }
    if (deep.size === 1) {
      const [key, m] = [...deep][0];
      const champion = m.round === "F" && m.w === key;
      const reached = champion ? "won the title" : m.round === "F" ? "reached the final" : `reached the ${roundIn(m)}`;
      add({
        id: `slam-qualifier:${e.tourneyId}`,
        rule: "slam-qualifier",
        topic: "oddities",
        level: champion ? 2 : 4,
        prompt: `Which ${(m.w === key ? m.we : m.le) === "LL" ? "lucky loser" : "qualifier"} ${reached} ${at(e.event)} in ${e.season}?`,
        answer: { kind: "name", key, text: name(key) },
        fact: `${name(key)} ${reached}${champion ? `, beating ${name(m.l)} ${m.score}` : `, then lost to ${name(m.w === key ? m.l : m.w)}`}.`,
        go: m.id,
        about: [key],
        season: e.season,
      });
    }
  }

  const bankPlayers = [...careers.values()].map((c) => ({ key: c.key, name: name(c.key), short: players[c.key]?.short ?? name(c.key), matches: c.matches }));
  return { tour, from, to, last, questions: out, players: bankPlayers };
}

/** "Wimbledon 2003, 2004 …" for a list of titles: each event once, with its years */
function summarise(ms: RecordMatch[]) {
  const by = new Map<string, number[]>();
  for (const m of ms) by.set(m.event, [...(by.get(m.event) ?? []), m.season]);
  return [...by].map(([event, ys]) => `${event} ${ys.length > 1 ? `×${ys.length}` : ys[0]}`).join(", ");
}

/* ---------- Questions from the Statistics boards ---------- */

// The boards a question can be asked about: its leader, as a name, from a line that says what the record is.
// `pair` boards ask for the other side of a pair, the leader given.
const boardPrompts: Record<string, { ask: (view: string, other: string) => string; pair?: boolean }> = {
  "never-beaten": { ask: (_, o) => `${o} won every one of the most meetings anyone has had with one opponent without losing. Who was on the other side?`, pair: true },
  "most-played": { ask: (_, o) => `Which player did ${o} play more often than any pair has met?`, pair: true },
  lopsided: { ask: (_, o) => `${o} has the most one-sided head-to-head of any pair who met 15 times or more. Against whom?`, pair: true },
  "final-pairs": { ask: (_, o) => `${o} met one player in more finals than any other pair has. Who?`, pair: true },
  "event-titles": { ask: () => "Who won the most titles at one tournament?" },
  "event-streak": { ask: () => "Who has the longest unbeaten run at one tournament, across the years?" },
  "slams-in-a-row": { ask: (v) => `Who reached the ${v.toLowerCase()} at the most Slams in a row?` },
  "slam-cheapest": { ask: () => "Who won a Slam title without dropping a set and losing the fewest games?" },
  "from-qualifying": { ask: () => "Which qualifier or lucky loser went the furthest at a Slam?" },
  "win-streaks": { ask: () => "Who put together the longest winning streak?" },
  "surface-streaks": { ask: (v) => `Who won the most matches in a row on ${v.toLowerCase()}?` },
  "finals-streaks": { ask: () => "Who won the most tournament finals in a row?" },
  "top10-streaks": { ask: () => "Who won the most matches in a row against top-10 players?" },
  "set-streaks": { ask: () => "Who won the most sets in a row?" },
  "season-titles": { ask: () => "Who won the most titles in a single season?" },
  "season-top10": { ask: () => "Who beat the most top-10 players in a single season?" },
  "season-pct": { ask: () => "Who had the best season by share of matches won (40 matches or more)?" },
  longest: { ask: () => "Who won the longest match?" },
  aces: { ask: () => "Who hit the most aces in a single match?" },
  "beat-no1": { ask: () => "Who was the lowest-ranked player to beat the world No. 1?" },
  "two-sets-down": { ask: () => "Who won the most best-of-five matches from two sets down?" },
  "from-a-bagel": { ask: () => "Who won the most matches after losing the first set 0–6?" },
  bagels: { ask: () => "Who won the most 6–0 sets?" },
  tiebreaks: { ask: () => "Who has the best tiebreak record, of everyone with 100 or more played?" },
  deciders: { ask: () => "Who has the best record in deciding sets, of everyone with 60 or more played?" },
  hold: { ask: () => "Who was the hardest player to break?" },
  break: { ask: () => "Who won the biggest share of return games?" },
  "no1-wins": { ask: () => "Who beat the reigning world No. 1 the most times?" },
  ages: { ask: (v) => `Who was the ${v === "Youngest" ? "youngest" : "oldest"} player to win a title?` },
  "long-shots": { ask: (v) => (v === "Slams" ? "Who was the lowest-ranked player to win a Slam?" : "Who was the lowest-ranked player to win a 1000, a tour finals or the Olympics?") },
};

function boardQuestions(books: RecordBooks, tw: string, from: number): Omit<Question, "tour" | "level" | "events">[] {
  const out: Omit<Question, "tour" | "level" | "events">[] = [];
  for (const b of books.boards) {
    const p = boardPrompts[b.id];
    if (!p) continue;
    for (const v of b.views) {
      const [top, next] = v.rows;
      if (!top || next?.rank === 1 || !top.players.length) continue;
      const answer = p.pair ? top.players[1] : top.players[0];
      if (!answer) continue;
      const leader = books.full[top.players[0]] ?? top.players[0];
      const view = v.label;
      out.push({
        id: `board:${b.id}:${v.id}`,
        rule: "board",
        topic: "records",
        prompt: `${tw[0].toUpperCase()}${tw.slice(1)} tour since ${from}: ${p.ask(view, leader)}`,
        answer: { kind: "name", key: answer, text: books.full[answer] ?? answer },
        fact: `${top.stat} ${b.unit}${top.note ? `: ${top.note}` : ""}.`,
        go: top.go?.id ?? null,
        about: top.players,
        season: null,
      });
    }
  }
  return out;
}

/* ---------- Drawing a quiz ---------- */

// Every quiz is the same shape: ten questions. Six ask who won or lost the final of a big tournament (a
// Slam, a 1000, the tour finals, the Olympics); three are odder (who won the most titles or matches in a
// year, who leads the head-to-head between two Slam champions); one asks for a year or a count of titles.
// The levels are picked for you, the same mix every time, so every quiz has the famous and the obscure.
export const QUIZ_LENGTH = 10;
const finalRules = new Set(["slam-champion", "slam-runner-up", "big-champion", "big-runner-up"]);
const oddRules = new Set(["season-titles", "season-wins", "h2h-leader"]);
const ODD_QUESTIONS = 3;
const numberRules = new Set(["final-year", "slam-once", "slam-count", "slam-event-count", "title-count"]);
const levelMix: Record<Level, number> = { 1: 0.3, 2: 0.35, 3: 0.25, 4: 0.1 };

/**
 * A quiz drawn at random from the banks of the tours asked for: each question's level by the mix, then
 * any question at that level. No match or player's name twice, and questions in `avoid` (asked
 * recently) only once the rest run out. Then they're shuffled.
 */
export function drawQuiz(banks: QuestionBank[], tours: Tour[], avoid: Set<string>, random = Math.random): Question[] {
  const pool = banks.flatMap((b) => b.questions).filter((q) => tours.includes(q.tour));
  const picked: Question[] = [];
  const take = (rules: Set<string>, count: number) => {
    const byLevel = new Map<Level, Question[]>(([1, 2, 3, 4] as Level[]).map((l) => [l, pool.filter((q) => q.level === l && rules.has(q.rule))]));
    const fits = (q: Question, strict: boolean) =>
      !picked.includes(q) &&
      !picked.some((p) => (q.go && p.go === q.go) || (q.answer.kind === "name" && p.answer.kind === "name" && p.answer.key === q.answer.key)) &&
      (!strict || !avoid.has(q.id));
    const out: Question[] = [];
    for (let i = 0; i < count; i++) {
      // The level for this question, then the nearest level that still has a question to give
      let r = random();
      let level: Level = 4;
      for (const l of [1, 2, 3, 4] as Level[]) {
        if ((r -= levelMix[l]) < 0) {
          level = l;
          break;
        }
      }
      const order = ([1, 2, 3, 4] as Level[]).sort((a, b) => Math.abs(a - level) - Math.abs(b - level) || levelMix[b] - levelMix[a]);
      let q: Question | undefined;
      for (const strict of [true, false]) {
        for (const l of order) {
          const options = byLevel.get(l)!.filter((x) => fits(x, strict));
          if (options.length) {
            q = options[Math.floor(random() * options.length)];
            break;
          }
        }
        if (q) break;
      }
      if (!q) break;
      picked.push(q);
      out.push(q);
    }
    return out;
  };
  const odd = take(oddRules, ODD_QUESTIONS);
  const all = [...odd, ...take(numberRules, 1), ...take(finalRules, QUIZ_LENGTH - 1 - odd.length)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/* ---------- Checking an answer ---------- */

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// A typo or two, more for longer names
const close = (typed: string, form: string) => typed === form || distance(typed.replace(/ /g, ""), form.replace(/ /g, "")) <= (form.length >= 9 ? 2 : form.length >= 5 ? 1 : 0);

/** A number or a year, typed. A name is picked from a list (findPlayers), so it's checked by who was picked. */
export function check(answer: Answer, typed: string) {
  const n = Number(fold(typed).replace(/ /g, ""));
  return answer.kind !== "name" && typed.trim() !== "" && Number.isFinite(n) && n === answer.value;
}

/**
 * The players a typed name could be, best first: every word typed starts a word of the name ("rog fed"),
 * or failing that, it's a typo or two from one ("djokovich"). Among equals, whoever played more.
 */
export function findPlayers(players: BankPlayer[], typed: string, limit = 8): BankPlayer[] {
  const words = fold(typed).split(" ").filter(Boolean);
  if (!words.length) return [];
  const scored: { p: BankPlayer; score: number }[] = [];
  for (const p of players) {
    const name = fold(p.name).split(" ");
    if (words.every((w) => name.some((n) => n.startsWith(w)))) scored.push({ p, score: 2 });
    else if (words.length === 1 && words[0].length >= 4 && name.some((n) => close(words[0], n))) scored.push({ p, score: 1 });
  }
  return scored.sort((x, y) => y.score - x.score || y.p.matches - x.p.matches).slice(0, limit).map((x) => x.p);
}
