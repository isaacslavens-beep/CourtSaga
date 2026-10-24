// Loads the TML-Database match files into the database: every row, ATP and WTA, as matches and players.
//
//   npm run import:matches -- ~/Desktop/courtsaga/tml-data
//
// It reads YYYY.csv (ATP) and YYYY_wta.csv (WTA) for whatever years the folder holds, and upserts, so it can
// run again at any time: after a fix upstream, or when 2026.csv and 2026_wta.csv arrive. A match's id is
// built from tour, tourney_id, round, winner and loser, and never changes between runs, because diary
// entries point at it. Nothing is ever deleted; matches a new run no longer finds are only reported.
//
// The CSVs aren't in the repo. Their licence is non-commercial (see the site's footer).

import { loadEnvConfig } from "@next/env";
import { parse } from "csv-parse/sync";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { parseScore, type Round, type Surface, type Tier, type Tour } from "../app/diary/library";
import { eventWords, roundWords, slamRoundWords, tourWords } from "../lib/search-words";

loadEnvConfig(process.cwd());

const columns = [
  "tourney_id",
  "tourney_name",
  "surface",
  "draw_size",
  "tourney_level",
  "indoor",
  "tourney_date",
  "match_num",
  "winner_id",
  "winner_name",
  "winner_ioc",
  "loser_id",
  "loser_name",
  "loser_ioc",
  "score",
  "best_of",
  "round",
  "minutes",
] as const;
// Read when the files have them: seeds, entries, rankings, ages, hands, heights and serve stats
const statColumns = ["ace", "df", "svpt", "1stIn", "1stWon", "2ndWon", "SvGms", "bpSaved", "bpFaced"] as const;
type Row = Record<(typeof columns)[number], string> & Partial<Record<string, string>>;

/* ---------- Fixes to the data ---------- */

// Rows that give a player someone else's id, copied with that player's country. Each is matched by name,
// so a later release that fixes the row upstream is left alone. G793 is Juan-Andres Gomez's id and MH30
// is John Millman's; both keep their own rows.
const idFixes: { tour: Tour; id: string; name: string; to: string }[] = [
  { tour: "atp", id: "G793", name: "Harshana Godamanna", to: "104631" },
  { tour: "atp", id: "MH30", name: "Marc-Andrea Huesler", to: "HH06" },
];

// tourney_level to one display tier per tour
const tiers: Record<Tour, Record<string, Tier>> = {
  atp: { G: "slam", M: "1000", "500": "500", "250": "250", F: "finals", O: "olympics", D: "team", A: "other" },
  wta: {
    G: "slam",
    PM: "1000",
    "1000": "1000",
    T1: "1000",
    P5: "500",
    "500": "500",
    P: "500",
    T2: "500",
    I: "250",
    "250": "250",
    T3: "250",
    T4: "250",
    T5: "250",
    F: "finals",
    W: "finals",
    O: "olympics",
    D: "team",
    A: "other",
  },
};

// Ordinary tour events the data files under another level
const tierFixes: { tour: Tour; name: string; season: number; tier: Tier }[] = [
  { tour: "atp", name: "Doha", season: 2024, tier: "250" },
  { tour: "atp", name: "Los Cabos", season: 2024, tier: "250" },
  { tour: "atp", name: "Winston-Salem", season: 2026, tier: "250" },
  { tour: "wta", name: "Prague Open", season: 2025, tier: "250" },
  { tour: "wta", name: "Charleston 2", season: 2021, tier: "250" },
];

// The dataset's names, tidied to what the site shows. The big events keep the names the tournament
// badges in app/match-ui.tsx look for.
const eventNames: Record<string, string> = {
  "Canada Masters": "Canada",
  "Cincinnati Masters": "Cincinnati",
  "Hamburg Masters": "Hamburg",
  "Indian Wells Masters": "Indian Wells",
  "Madrid Masters": "Madrid",
  "Miami Masters": "Miami",
  "Monte Carlo Masters": "Monte Carlo",
  "Rome Masters": "Rome",
  "Shanghai Masters": "Shanghai",
  "Atp Cup": "ATP Cup",
  "Next Gen ATP Finals": "Next Gen Finals",
  "NextGen Finals": "Next Gen Finals",
  "''s-Hertogenbosch": "'s-Hertogenbosch",
  "Rio De Janeiro": "Rio de Janeiro",
  "Vina Del Mar": "Vina del Mar",
  "Winston Salem": "Winston-Salem",
};

// Davis Cup and Billie Jean King Cup ties, named in full
const stageWords: Record<string, string> = {
  WG: "World Group",
  WG1: "World Group I",
  WG2: "World Group II",
  G1: "Group I",
  G2: "Group II",
  G3: "Group III",
  G4: "Group IV",
  QLS: "Qualifiers",
  PO: "play-off",
  PPO: "promotion play-off",
  REL: "relegation play-off",
  PM: "promotion match",
  RR: "round robin",
  RRA: "pool A",
  RRB: "pool B",
  RRC: "pool C",
  RRD: "pool D",
  R1: "first round",
  R2: "second round",
  R3: "third round",
  QF: "quarterfinal",
  SF: "semifinal",
  F: "final",
};

function eventOf(name: string, tour: Tour, tier: Tier): { event: string; stage: string | null } {
  if (tier === "olympics") return { event: "Olympics", stage: null };
  if (tier === "finals" && tour === "atp") return { event: "ATP Finals", stage: null };
  if (tier === "finals") return { event: name === "Zhuhai" ? "WTA Elite Trophy" : name === "Tournament of Champions" ? name : "WTA Finals", stage: null };
  const cup = name.match(/^(Davis Cup|Fed Cup|BJK Cup|Billie Jean King Cup)\b\s*(.*)$/);
  if (!cup) return { event: eventNames[name] ?? name.replace(/-(\d)$/, " $1"), stage: null };
  // "WG QF: AUS vs USA", "Finals", "Play-offs - Group A", "G2 ESA vs VEN"
  const tie = cup[2].match(/\b([A-Z]{3}) vs ([A-Z]{3})\b/);
  const rest = cup[2].replace(tie?.[0] ?? "", "").replace(":", "").replace(" - ", " · ").trim();
  const stage = rest
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => stageWords[w] ?? w)
    .join(" ");
  return { event: cup[1] === "BJK Cup" ? "Billie Jean King Cup" : cup[1], stage: [stage, tie?.[0]].filter(Boolean).join(" · ") || null };
}

const rounds: Record<string, Round> = { R128: "R128", R64: "R64", R32: "R32", R16: "R16", QF: "QF", SF: "SF", F: "F", RR: "RR", BR: "BR", "3rd/4th": "3P" };
const surfaces: Record<string, Surface> = { Hard: "hard", Clay: "clay", Grass: "grass", Carpet: "carpet", "": "unknown" };

/**
 * tourney_date is the tournament's first day, not the match's, so a match's day is estimated from how
 * far through the event its round falls. Only its month is ever shown.
 */
function playedOn(start: Date, round: Round, drawSize: number | null, tier: Tier) {
  const draw = drawSize && drawSize > 1 ? drawSize : 32;
  const days = tier === "slam" ? 13 : draw >= 96 ? 11 : draw >= 48 ? 7 : 6;
  const fromFinal = { F: 0, BR: 0, "3P": 0, SF: 1, QF: 2, R16: 3, R32: 4, R64: 5, R128: 6, RR: -1 }[round];
  const roundsInDraw = Math.max(2, Math.ceil(Math.log2(draw)));
  const offset = fromFinal < 0 ? (tier === "team" ? 1 : 2) : Math.max(0, Math.round(days * (1 - fromFinal / (roundsInDraw - 1))));
  return new Date(start.getTime() + offset * 86_400_000);
}

/* ---------- Players' names ---------- */

const tidy = (name: string) => name.replace(/\s+/g, " ").trim();
const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Surnames that start with a particle: "de Minaur", "del Potro", "van de Zandschulp"
const particles = new Set(["de", "del", "della", "der", "den", "di", "da", "das", "dos", "du", "van", "von", "ten", "ter", "el", "al", "la", "le", "los"]);
// Where double surnames are the custom, and the first names that come in pairs there
const doubleSurnames = new Set(["ESP", "ARG", "MEX", "COL", "CHI", "PER", "URU", "VEN", "PAR", "PRY", "BOL", "ECU", "DOM", "CRC", "GUA", "ESA", "PUR", "CUB", "BRA", "POR"]);
const pairedFirstNames = /^(Juan (Carlos|Ignacio|Pablo|Manuel|Martin|Sebastian|Bautista)|Jose (Luis|Maria)|Maria (Jose|Teresa|Emilia|Lourdes|Fernanda|Paz)|Ana Sofia|Tomas Martin|Thiago Agustin|Daniel Elahi|Adolfo Daniel) /;
// Notable players the rules above get wrong
const surnames: Record<string, string> = {
  "Alison Riske Amritraj": "Riske Amritraj",
  "Bethanie Mattek Sands": "Mattek Sands",
  "Kimiko Date Krumm": "Date Krumm",
  "Jelena Kostanic Tosic": "Kostanic Tosic",
  "Silvia Farina Elia": "Farina Elia",
  "Antonella Serra Zanetti": "Serra Zanetti",
  "Patricia Mayr Achleitner": "Mayr Achleitner",
  "Edina Gallovits Hall": "Gallovits Hall",
  "Giovanni Mpetshi Perricard": "Mpetshi Perricard",
  "Michelle Larcher De Brito": "Larcher De Brito",
  "Jesse Huta Galung": "Huta Galung",
  "Masa Zec Peskiric": "Zec Peskiric",
  "Martin Antonio Vergara del Puerto": "Vergara del Puerto",
};

/** The surname the site shows: "Alcaraz", "del Potro", "Bautista Agut". */
function surnameOf(full: string, ioc: string | null) {
  if (surnames[full]) return surnames[full];
  const words = full.replace(/\s+(Jr\.?|Sr\.?)$/, "").split(" ");
  if (words.length < 2) return full;
  const particle = words.findIndex((w, i) => i > 0 && i < words.length - 1 && particles.has(w.toLowerCase()));
  if (particle > 0) return words.slice(particle).join(" ");
  if (words.length >= 3 && ioc && doubleSurnames.has(ioc)) {
    const paired = full.match(pairedFirstNames);
    return paired ? full.slice(paired[0].length) : words.slice(-2).join(" ");
  }
  return words[words.length - 1];
}

/* ---------- Reading the files ---------- */

type Source = { file: string; line: number; tour: Tour; season: number; row: Row };

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function readSources(folder: string) {
  let names: string[];
  try {
    if (!(await stat(folder)).isDirectory()) throw new Error("not a folder");
    names = await readdir(folder);
  } catch {
    fail(
      `Can't read the folder ${folder}.\n` +
        "Copy the TML-Database files (2003.csv to 2025.csv and 2003_wta.csv to 2025_wta.csv) into it, or pass the folder they're in, then run this again.",
    );
  }
  const files = names.filter((f) => /^\d{4}(_wta)?\.csv$/.test(f)).sort();
  const ignored = names.filter((f) => f.endsWith(".csv") && !files.includes(f));
  if (!files.length) fail(`There are no match files (YYYY.csv or YYYY_wta.csv) in ${folder}.`);

  const sources: Source[] = [];
  for (const file of files) {
    const [, year, wta] = file.match(/^(\d{4})(_wta)?\.csv$/)!;
    let rows: Row[];
    try {
      rows = parse(await readFile(path.join(folder, file), "utf8"), { columns: true, bom: true, skip_empty_lines: true });
    } catch (err) {
      fail(`Can't read ${file}: ${(err as Error).message}`);
    }
    const missing = columns.filter((c) => rows.length && !(c in rows[0]));
    if (missing.length) fail(`${file} is missing columns: ${missing.join(", ")}. Is it a TML-Database / Sackmann file?`);
    rows.forEach((row, i) => sources.push({ file, line: i + 2, tour: wta ? "wta" : "atp", season: Number(year), row }));
  }
  return { files, ignored, sources };
}

/* ---------- Shaping rows into players and matches ---------- */

type MatchRecord = {
  id: string;
  tour: Tour;
  season: number;
  tourneyId: string;
  tourneyName: string;
  event: string;
  stage: string | null;
  level: string;
  tier: Tier;
  surface: Surface;
  indoor: boolean | null;
  drawSize: number | null;
  startDate: string;
  playedOn: string;
  round: Round;
  matchNum: number | null;
  winnerId: string;
  loserId: string;
  score: string;
  bestOf: number;
  outcome: string;
  minutes: number | null;
  winnerSeed: number | null;
  winnerEntry: string | null;
  winnerRank: number | null;
  winnerPoints: number | null;
  winnerAge: number | null;
  loserSeed: number | null;
  loserEntry: string | null;
  loserRank: number | null;
  loserPoints: number | null;
  loserAge: number | null;
  winnerStats: number[] | null;
  loserStats: number[] | null;
  searchable: boolean;
  doc: string;
};

type Seen = { name: string; ioc: string | null; hand: string | null; height: number | null; date: string; order: number; fixed: boolean };

const int = (s: string | undefined) => (s && /^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
const decimal = (s: string | undefined) => (s && /^\d+(\.\d+)?$/.test(s.trim()) ? Number(s.trim()) : null);
const text = (s: string | undefined) => s?.trim().toUpperCase() || null;
/** One side's serve stats in statColumns order, or null when the row has none */
function statsOf(row: Row, prefix: "w" | "l") {
  const values = statColumns.map((c) => int(row[`${prefix}_${c}`]));
  return values.every((v) => v !== null) && values[2]! > 0 ? (values as number[]) : null;
}
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
// Lower case, word characters only; accents are left for unaccent() in the database
const searchDoc = (...parts: (string | null)[]) =>
  parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function shape(sources: Source[]) {
  const warnings: string[] = [];
  const skipped: string[] = [];
  const matches = new Map<string, MatchRecord>();
  const seen = new Map<string, Seen[]>(); // player key -> every row they appear in
  let duplicates = 0;
  let fixedRows = 0;

  sources.forEach(({ file, line, tour, season, row }, order) => {
    const at = `${file}:${line}`;
    const level = row.tourney_level.trim();
    const round = rounds[row.round.trim()];
    const date = row.tourney_date.trim().match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!round || !date || !row.winner_id.trim() || !row.loser_id.trim()) {
      skipped.push(`${at}: ${!round ? `unknown round "${row.round}"` : !date ? `bad tourney_date "${row.tourney_date}"` : "no player id"}`);
      return;
    }
    let tier = tiers[tour][level];
    if (!tier) {
      warnings.push(`${at}: unknown tourney_level "${level}", shown as "other"`);
      tier = "other";
    }
    const name = tidy(row.tourney_name);
    tier = tierFixes.find((f) => f.tour === tour && f.name === name && f.season === season)?.tier ?? tier;

    const players = (["winner", "loser"] as const).map((side) => {
      const raw = {
        id: row[`${side}_id`].trim(),
        name: tidy(row[`${side}_name`]),
        ioc: row[`${side}_ioc`].trim() || null,
        hand: text(row[`${side}_hand`]),
        height: int(row[`${side}_ht`]),
      };
      const fix = idFixes.find((f) => f.tour === tour && f.id === raw.id && fold(f.name) === fold(raw.name));
      if (fix) fixedRows++;
      return { ...raw, id: fix?.to ?? raw.id, fixed: !!fix };
    });

    const start = new Date(Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3])));
    for (const p of players) {
      const key = `${tour}:${p.id}`;
      seen.set(key, [...(seen.get(key) ?? []), { name: p.name, ioc: p.ioc, hand: p.hand, height: p.height, date: isoDate(start), order, fixed: p.fixed }]);
    }

    const [winner, loser] = players;
    const id = [tour, row.tourney_id.trim(), round, winner.id, loser.id].join("_");
    const score = tidy(row.score);
    const { outcome } = parseScore(score);
    const drawSize = int(row.draw_size);
    const minutes = int(row.minutes);
    const matchNum = int(row.match_num);

    const existing = matches.get(id);
    if (existing) {
      // The same match listed twice: keep the first, filling in anything it left blank
      duplicates++;
      existing.minutes ??= minutes;
      existing.matchNum ??= matchNum;
      existing.winnerStats ??= statsOf(row, "w");
      existing.loserStats ??= statsOf(row, "l");
      return;
    }

    const { event, stage } = eventOf(name, tour, tier);
    const slam = tier === "slam";
    matches.set(id, {
      id,
      tour,
      season,
      tourneyId: row.tourney_id.trim(),
      tourneyName: name,
      event,
      stage,
      level,
      tier,
      surface: surfaces[row.surface.trim()] ?? "unknown",
      indoor: row.indoor.trim() === "I" ? true : row.indoor.trim() === "O" ? false : null,
      drawSize,
      startDate: isoDate(start),
      playedOn: isoDate(playedOn(start, round, drawSize, tier)),
      round,
      matchNum,
      winnerId: winner.id,
      loserId: loser.id,
      score,
      bestOf: int(row.best_of) === 5 ? 5 : 3,
      outcome,
      minutes,
      winnerSeed: int(row.winner_seed),
      winnerEntry: text(row.winner_entry),
      winnerRank: int(row.winner_rank),
      winnerPoints: int(row.winner_rank_points),
      winnerAge: decimal(row.winner_age),
      loserSeed: int(row.loser_seed),
      loserEntry: text(row.loser_entry),
      loserRank: int(row.loser_rank),
      loserPoints: int(row.loser_rank_points),
      loserAge: decimal(row.loser_age),
      winnerStats: statsOf(row, "w"),
      loserStats: statsOf(row, "l"),
      searchable: outcome !== "walkover" && outcome !== "unplayed",
      doc: searchDoc(
        event,
        name !== event ? name : null,
        eventWords[event] ?? null,
        stage,
        String(season),
        roundWords[round],
        slam ? (slamRoundWords[round] ?? null) : null,
        tourWords[tour],
        winner.name,
        loser.name,
      ),
    });
  });

  // Each player's name and country come from their latest row the data hasn't misfiled
  const players = [...seen.entries()].map(([key, rows]) => {
    const own = rows.filter((r) => !r.fixed);
    const latest = (own.length ? own : rows).reduce((a, b) => (b.date > a.date || (b.date === a.date && b.order > a.order) ? b : a));
    const spellings = new Set(rows.map((r) => r.name));
    if (new Set(own.map((r) => fold(r.name))).size > 1) {
      // Spelling variants share a word ("Xinyu Wang", "Xin Yu Wang"); different people usually don't
      const [first, ...rest] = [...new Set(own.map((r) => fold(r.name)))].map((n) => new Set(n.split(/[\s-]+/)));
      if (rest.some((words) => ![...words].some((w) => first.has(w)))) warnings.push(`${key} has rows under different names: ${[...spellings].join(" / ")}`);
    }
    const [tour, id] = key.split(":") as [Tour, string];
    // Hand and height from the latest row that has them
    const known = (pick: (r: Seen) => unknown) => rows.filter((r) => pick(r) !== null).reduce<Seen | null>((a, b) => (!a || b.date > a.date || (b.date === a.date && b.order > a.order) ? b : a), null);
    const hand = known((r) => (r.hand === "U" ? null : r.hand))?.hand ?? null;
    const height = known((r) => r.height)?.height ?? null;
    return { tour, id, name: latest.name, short: surnameOf(latest.name, latest.ioc), ioc: latest.ioc, hand, height, lastSeen: latest.date, variants: spellings.size };
  });

  return { matches: [...matches.values()], players, duplicates, fixedRows, warnings, skipped };
}

/* ---------- Writing ---------- */

async function upsertPlayers(db: PoolClient, players: ReturnType<typeof shape>["players"]) {
  let inserted = 0;
  for (let i = 0; i < players.length; i += 2000) {
    const batch = players.slice(i, i + 2000);
    const { rows } = await db.query<{ inserted: boolean }>(
      `INSERT INTO players (tour, id, name, short_name, ioc, hand, height, search_name, match_count, last_seen)
       SELECT tour, id, name, short_name, ioc, hand, height, lower(unaccent(name)), 0, last_seen
       FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::date[], $7::text[], $8::smallint[])
         AS t(tour, id, name, short_name, ioc, last_seen, hand, height)
       ON CONFLICT (tour, id) DO UPDATE SET
         name = excluded.name, short_name = excluded.short_name, ioc = excluded.ioc,
         hand = coalesce(excluded.hand, players.hand), height = coalesce(excluded.height, players.height),
         search_name = excluded.search_name, last_seen = excluded.last_seen
       WHERE excluded.last_seen >= players.last_seen
       RETURNING (xmax = 0) AS inserted`,
      [
        batch.map((p) => p.tour),
        batch.map((p) => p.id),
        batch.map((p) => p.name),
        batch.map((p) => p.short),
        batch.map((p) => p.ioc),
        batch.map((p) => p.lastSeen),
        batch.map((p) => p.hand),
        batch.map((p) => p.height),
      ],
    );
    inserted += rows.filter((r) => r.inserted).length;
  }
  return inserted;
}

async function upsertMatches(db: PoolClient, matches: MatchRecord[]) {
  let inserted = 0;
  const col = <K extends keyof MatchRecord>(batch: MatchRecord[], k: K) => batch.map((m) => m[k]);
  for (let i = 0; i < matches.length; i += 5000) {
    const batch = matches.slice(i, i + 5000);
    const { rows } = await db.query<{ inserted: boolean }>(
      `INSERT INTO matches (id, tour, season, tourney_id, tourney_name, event, stage, level, tier, surface, indoor, draw_size,
         start_date, played_on, round, match_num, winner_id, loser_id, score, best_of, outcome, minutes, searchable, search,
         winner_seed, winner_entry, winner_rank, winner_points, winner_age, loser_seed, loser_entry, loser_rank, loser_points, loser_age,
         winner_stats, loser_stats)
       SELECT id, tour, season, tourney_id, tourney_name, event, stage, level, tier, surface, indoor, draw_size,
         start_date, played_on, round, match_num, winner_id, loser_id, score, best_of, outcome, minutes, searchable,
         to_tsvector('simple', unaccent(doc)),
         winner_seed, winner_entry, winner_rank, winner_points, winner_age, loser_seed, loser_entry, loser_rank, loser_points, loser_age,
         nullif(string_to_array(winner_stats, ',')::smallint[], '{}'), nullif(string_to_array(loser_stats, ',')::smallint[], '{}')
       FROM unnest($1::text[], $2::text[], $3::smallint[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[],
         $10::text[], $11::boolean[], $12::smallint[], $13::date[], $14::date[], $15::text[], $16::int[], $17::text[], $18::text[],
         $19::text[], $20::smallint[], $21::text[], $22::int[], $23::boolean[], $24::text[],
         $25::smallint[], $26::text[], $27::int[], $28::int[], $29::real[], $30::smallint[], $31::text[], $32::int[], $33::int[], $34::real[],
         $35::text[], $36::text[])
         AS t(id, tour, season, tourney_id, tourney_name, event, stage, level, tier, surface, indoor, draw_size,
           start_date, played_on, round, match_num, winner_id, loser_id, score, best_of, outcome, minutes, searchable, doc,
           winner_seed, winner_entry, winner_rank, winner_points, winner_age, loser_seed, loser_entry, loser_rank, loser_points, loser_age,
           winner_stats, loser_stats)
       ON CONFLICT (id) DO UPDATE SET
         season = excluded.season, tourney_name = excluded.tourney_name, event = excluded.event, stage = excluded.stage,
         level = excluded.level, tier = excluded.tier, surface = excluded.surface, indoor = excluded.indoor,
         draw_size = excluded.draw_size, start_date = excluded.start_date, played_on = excluded.played_on,
         match_num = excluded.match_num, score = excluded.score, best_of = excluded.best_of, outcome = excluded.outcome,
         minutes = excluded.minutes, searchable = excluded.searchable, search = excluded.search,
         winner_seed = excluded.winner_seed, winner_entry = excluded.winner_entry, winner_rank = excluded.winner_rank,
         winner_points = excluded.winner_points, winner_age = excluded.winner_age, loser_seed = excluded.loser_seed,
         loser_entry = excluded.loser_entry, loser_rank = excluded.loser_rank, loser_points = excluded.loser_points,
         loser_age = excluded.loser_age, winner_stats = excluded.winner_stats, loser_stats = excluded.loser_stats, imported_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [
        col(batch, "id"),
        col(batch, "tour"),
        col(batch, "season"),
        col(batch, "tourneyId"),
        col(batch, "tourneyName"),
        col(batch, "event"),
        col(batch, "stage"),
        col(batch, "level"),
        col(batch, "tier"),
        col(batch, "surface"),
        col(batch, "indoor"),
        col(batch, "drawSize"),
        col(batch, "startDate"),
        col(batch, "playedOn"),
        col(batch, "round"),
        col(batch, "matchNum"),
        col(batch, "winnerId"),
        col(batch, "loserId"),
        col(batch, "score"),
        col(batch, "bestOf"),
        col(batch, "outcome"),
        col(batch, "minutes"),
        col(batch, "searchable"),
        col(batch, "doc"),
        col(batch, "winnerSeed"),
        col(batch, "winnerEntry"),
        col(batch, "winnerRank"),
        col(batch, "winnerPoints"),
        col(batch, "winnerAge"),
        col(batch, "loserSeed"),
        col(batch, "loserEntry"),
        col(batch, "loserRank"),
        col(batch, "loserPoints"),
        col(batch, "loserAge"),
        // Arrays of arrays can't be ragged in Postgres, so each side's stats travel as one string
        batch.map((m) => m.winnerStats?.join(",") ?? ""),
        batch.map((m) => m.loserStats?.join(",") ?? ""),
      ],
    );
    inserted += rows.filter((r) => r.inserted).length;
    process.stdout.write(`\r  writing matches… ${Math.min(i + batch.length, matches.length).toLocaleString()} of ${matches.length.toLocaleString()}`);
  }
  process.stdout.write("\n");
  return inserted;
}

/* ---------- Run ---------- */

async function main() {
  const folder = process.argv[2];
  if (!folder) fail("Usage: npm run import:matches -- <folder with the TML-Database CSVs>");
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) fail("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) in .env.local, or in the environment, first.");

  const { files, ignored, sources } = await readSources(path.resolve(folder.replace(/^~(?=\/)/, process.env.HOME ?? "~")));
  const shaped = shape(sources);
  const seasons = [...new Set(sources.map((s) => s.season))].sort();
  console.log(`Read ${files.length} files (${seasons[0]}–${seasons[seasons.length - 1]}): ${sources.length.toLocaleString()} rows.`);

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const newPlayers = await upsertPlayers(db, shaped.players);
    const newMatches = await upsertMatches(db, shaped.matches);
    // Counts and staleness come from the whole table, so importing a few files never skews them
    await db.query(
      `UPDATE players p SET match_count = c.n FROM (
         SELECT tour, id, count(*)::int AS n FROM (
           SELECT tour, winner_id AS id FROM matches UNION ALL SELECT tour, loser_id FROM matches
         ) x GROUP BY tour, id
       ) c WHERE p.tour = c.tour AND p.id = c.id AND p.match_count <> c.n`,
    );
    const pairs = [...new Set(sources.map((s) => `${s.tour}:${s.season}`))];
    const { rows: stale } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM matches WHERE tour || ':' || season = ANY($1::text[]) AND imported_at < now()`,
      [pairs],
    );
    await db.query("COMMIT");

    const outcomes = new Map<string, number>();
    for (const m of shaped.matches) outcomes.set(m.outcome, (outcomes.get(m.outcome) ?? 0) + 1);
    const hidden = shaped.matches.filter((m) => !m.searchable).length;
    const n = (x: number) => x.toLocaleString().padStart(9);
    console.log(`
Import summary
  rows read           ${n(sources.length)}
  matches             ${n(shaped.matches.length)}  (${newMatches.toLocaleString()} new, ${(shaped.matches.length - newMatches).toLocaleString()} already there, updated)
  duplicate rows      ${n(shaped.duplicates)}  (the same match listed twice, merged into one)
  hidden from search  ${n(hidden)}  (${outcomes.get("walkover") ?? 0} walkovers, ${outcomes.get("unplayed") ?? 0} empty scores; kept, never logged)
  retirements etc.    ${n((outcomes.get("retired") ?? 0) + (outcomes.get("defaulted") ?? 0) + (outcomes.get("abandoned") ?? 0))}  (${outcomes.get("retired") ?? 0} retired, ${outcomes.get("defaulted") ?? 0} defaulted, ${outcomes.get("abandoned") ?? 0} abandoned; searchable)
  players             ${n(shaped.players.length)}  (${newPlayers.toLocaleString()} new)
  merged              ${n(shaped.fixedRows)}  rows moved to the right player (${idFixes.map((f) => `${f.name}: ${f.id} → ${f.to}`).join("; ")})
  name variants       ${n(shaped.players.filter((p) => p.variants > 1).length)}  players with more than one spelling (the most recent is used)
  skipped             ${n(shaped.skipped.length)}  rows`);
    for (const s of shaped.skipped) console.log(`    ${s}`);
    if (ignored.length) console.log(`\nNot imported (not YYYY.csv or YYYY_wta.csv): ${ignored.join(", ")}`);
    if (stale[0].n) console.log(`\nNote: ${stale[0].n} matches already in the database for these seasons weren't in these files. They were kept.`);
    if (shaped.warnings.length) console.log(`\nWarnings:\n${shaped.warnings.map((w) => `  ${w}`).join("\n")}`);
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\nImport failed; nothing was changed.", err);
  process.exit(1);
});
