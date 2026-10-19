// A sample fan's log. Results and scores are real; everything in `fan` (when and how
// it was watched, sets seen, rating, who they cheered for, their call, tags, notes)
// is example data for the demos. All three demo sections read and edit this one log.

export type Surface = "clay" | "hard" | "grass";
export type WatchMode = "Live" | "TV" | "Stream";
export type Round = "Final" | "Semifinal" | "Quarterfinal" | "Fourth round" | "Women's final";

export type Match = {
  id: string;
  event: string; // tournament and year, e.g. "Wimbledon 2023"
  date: string; // when it was played, "YYYY-MM"
  round: Round;
  surface: Surface;
  winner: string;
  loser: string;
  score: string; // winner first, e.g. "1-6 7-6(6) 6-1 3-6 6-4"
  bestOf: 3 | 5;
};

export type FanEntry = {
  watchedOn: WatchMode;
  watchedDate: string; // "YYYY-MM"
  setsSeen: number[]; // set indexes
  rating: number; // 1 to 5
  cheering: string | null;
  pick: { winner: string; sets: number } | null;
  tags: string[];
  note: string; // the fan's own words, anything they like
  classic: boolean;
};

type Logged = Match & { fan: FanEntry };

const all = (n: number) => Array.from({ length: n }, (_, i) => i);

const logged: Logged[] = [
  {
    id: "wim22", event: "Wimbledon 2022", date: "2022-07", round: "Fourth round", surface: "grass",
    winner: "Sinner", loser: "Alcaraz", score: "6-1 6-4 6-7(8) 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2022-07", setsSeen: all(4), rating: 4, cheering: null, pick: null, tags: [], note: "First match I ever properly sat down for. Didn't know either of them yet.", classic: false },
  },
  {
    id: "wim22w", event: "Wimbledon 2022", date: "2022-07", round: "Women's final", surface: "grass",
    winner: "Rybakina", loser: "Jabeur", score: "3-6 6-2 6-2", bestOf: 3,
    fan: { watchedOn: "TV", watchedDate: "2022-07", setsSeen: all(3), rating: 4, cheering: null, pick: { winner: "Jabeur", sets: 2 }, tags: [], note: "", classic: false },
  },
  {
    id: "uso22", event: "US Open 2022", date: "2022-09", round: "Quarterfinal", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-3 6-7(7) 6-7(0) 7-5 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2022-09", setsSeen: all(5), rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz", sets: 5 }, tags: ["Marathon"], note: "Finished at almost 3 a.m. Worth every minute.", classic: true },
  },
  {
    id: "ao23w", event: "Australian Open 2023", date: "2023-01", round: "Women's final", surface: "hard",
    winner: "Sabalenka", loser: "Rybakina", score: "4-6 6-3 6-4", bestOf: 3,
    fan: { watchedOn: "TV", watchedDate: "2023-01", setsSeen: all(3), rating: 4, cheering: "Rybakina", pick: { winner: "Rybakina", sets: 2 }, tags: [], note: "", classic: false },
  },
  {
    id: "rg23", event: "Roland Garros 2023", date: "2023-06", round: "Semifinal", surface: "clay",
    winner: "Djokovic", loser: "Alcaraz", score: "6-3 5-7 6-1 6-1", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-06", setsSeen: [2, 3], rating: 3, cheering: "Alcaraz", pick: { winner: "Alcaraz", sets: 4 }, tags: [], note: "Joined in the third set. Cramps. Hard to watch.", classic: false },
  },
  {
    id: "wim23", event: "Wimbledon 2023", date: "2023-07", round: "Final", surface: "grass",
    winner: "Alcaraz", loser: "Djokovic", score: "1-6 7-6(6) 6-1 3-6 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2023-07", setsSeen: all(5), rating: 5, cheering: "Alcaraz", pick: { winner: "Djokovic", sets: 4 }, tags: ["Classic", "Marathon"], note: "Best match I've seen. Screamed at the TV in the fifth.", classic: true },
  },
  {
    id: "cin23", event: "Cincinnati 2023", date: "2023-08", round: "Final", surface: "hard",
    winner: "Djokovic", loser: "Alcaraz", score: "5-7 7-6(7) 7-6(4)", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2023-08", setsSeen: [1, 2], rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz", sets: 2 }, tags: ["Tiebreak drama"], note: "", classic: false },
  },
  {
    id: "wim08", event: "Wimbledon 2008", date: "2008-07", round: "Final", surface: "grass",
    winner: "Nadal", loser: "Federer", score: "6-4 6-4 6-7(5) 6-7(8) 9-7", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-11", setsSeen: all(5), rating: 5, cheering: null, pick: null, tags: ["Classic"], note: "Finally watched the one everyone talks about. They were right.", classic: true },
  },
  {
    id: "ao12", event: "Australian Open 2012", date: "2012-01", round: "Final", surface: "hard",
    winner: "Djokovic", loser: "Nadal", score: "5-7 6-4 6-2 6-7(5) 7-5", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-12", setsSeen: all(5), rating: 5, cheering: null, pick: null, tags: ["Marathon"], note: "Nearly six hours. Watched it over two nights.", classic: true },
  },
  {
    id: "ao24sf", event: "Australian Open 2024", date: "2024-01", round: "Semifinal", surface: "hard",
    winner: "Sinner", loser: "Djokovic", score: "6-1 6-2 6-7(6) 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-01", setsSeen: all(4), rating: 4, cheering: "Sinner", pick: { winner: "Djokovic", sets: 4 }, tags: [], note: "", classic: false },
  },
  {
    id: "ao24f", event: "Australian Open 2024", date: "2024-01", round: "Final", surface: "hard",
    winner: "Sinner", loser: "Medvedev", score: "3-6 3-6 6-4 6-4 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2024-01", setsSeen: all(5), rating: 5, cheering: "Sinner", pick: { winner: "Sinner", sets: 4 }, tags: ["Comeback"], note: "Two sets down. Then he just stopped missing.", classic: false },
  },
  {
    id: "iw24", event: "Indian Wells 2024", date: "2024-03", round: "Semifinal", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "1-6 6-3 6-2", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2024-03", setsSeen: all(3), rating: 3, cheering: "Sinner", pick: { winner: "Sinner", sets: 2 }, tags: [], note: "", classic: false },
  },
  {
    id: "rg24sf", event: "Roland Garros 2024", date: "2024-06", round: "Semifinal", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "2-6 6-3 3-6 6-4 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-06", setsSeen: all(5), rating: 4, cheering: "Sinner", pick: { winner: "Sinner", sets: 4 }, tags: [], note: "", classic: false },
  },
  {
    id: "wim24", event: "Wimbledon 2024", date: "2024-07", round: "Final", surface: "grass",
    winner: "Alcaraz", loser: "Djokovic", score: "6-2 6-2 7-6(4)", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2024-07", setsSeen: all(3), rating: 3, cheering: "Djokovic", pick: { winner: "Alcaraz", sets: 3 }, tags: [], note: "Called it. Wanted to be wrong.", classic: false },
  },
  {
    id: "oly24", event: "Olympics 2024", date: "2024-08", round: "Final", surface: "clay",
    winner: "Djokovic", loser: "Alcaraz", score: "7-6(3) 7-6(2)", bestOf: 3,
    fan: { watchedOn: "Live", watchedDate: "2024-08", setsSeen: all(2), rating: 5, cheering: "Djokovic", pick: { winner: "Alcaraz", sets: 2 }, tags: ["Classic"], note: "We were there, on Philippe-Chatrier. He cried, we cried.", classic: true },
  },
  {
    id: "bei24", event: "Beijing 2024", date: "2024-10", round: "Final", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-7(6) 6-4 7-6(3)", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2024-10", setsSeen: all(3), rating: 4, cheering: "Sinner", pick: { winner: "Sinner", sets: 2 }, tags: ["Tiebreak drama"], note: "", classic: false },
  },
  {
    id: "wim19", event: "Wimbledon 2019", date: "2019-07", round: "Final", surface: "grass",
    winner: "Djokovic", loser: "Federer", score: "7-6(5) 1-6 7-6(4) 4-6 13-12(3)", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-12", setsSeen: all(5), rating: 5, cheering: null, pick: null, tags: ["Marathon"], note: "Knew how it ended and still couldn't watch the match points.", classic: true },
  },
  {
    id: "ao25f", event: "Australian Open 2025", date: "2025-01", round: "Final", surface: "hard",
    winner: "Sinner", loser: "Zverev", score: "6-3 7-6(4) 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2025-01", setsSeen: all(3), rating: 3, cheering: "Sinner", pick: { winner: "Sinner", sets: 3 }, tags: [], note: "", classic: false },
  },
  {
    id: "rom25", event: "Rome 2025", date: "2025-05", round: "Final", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "7-6(5) 6-1", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2025-05", setsSeen: all(2), rating: 3, cheering: "Sinner", pick: { winner: "Sinner", sets: 3 }, tags: [], note: "", classic: false },
  },
  {
    id: "rg25", event: "Roland Garros 2025", date: "2025-06", round: "Final", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "4-6 6-7(4) 6-4 7-6(3) 7-6(10-2)", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-06", setsSeen: all(5), rating: 5, cheering: "Sinner", pick: { winner: "Sinner", sets: 4 }, tags: ["Marathon", "Classic"], note: "Three championship points. Still can't talk about it.", classic: true },
  },
  {
    id: "wim25", event: "Wimbledon 2025", date: "2025-07", round: "Final", surface: "grass",
    winner: "Sinner", loser: "Alcaraz", score: "4-6 6-4 6-4 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2025-07", setsSeen: [1, 2, 3], rating: 4, cheering: "Sinner", pick: { winner: "Sinner", sets: 4 }, tags: ["Comeback"], note: "Hooked once he lost the first set", classic: false },
  },
  {
    id: "uso25sf", event: "US Open 2025", date: "2025-09", round: "Semifinal", surface: "hard",
    winner: "Alcaraz", loser: "Djokovic", score: "6-4 7-6(4) 6-2", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-09", setsSeen: all(3), rating: 3, cheering: "Djokovic", pick: { winner: "Alcaraz", sets: 3 }, tags: [], note: "", classic: false },
  },
  {
    id: "uso25", event: "US Open 2025", date: "2025-09", round: "Final", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-2 3-6 6-1 6-4", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-09", setsSeen: all(4), rating: 3, cheering: "Sinner", pick: { winner: "Sinner", sets: 5 }, tags: [], note: "", classic: false },
  },
  {
    id: "ao26", event: "Australian Open 2026", date: "2026-01", round: "Final", surface: "hard",
    winner: "Alcaraz", loser: "Djokovic", score: "2-6 6-2 6-3 7-5", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-01", setsSeen: [0, 1], rating: 4, cheering: "Djokovic", pick: { winner: "Djokovic", sets: 4 }, tags: [], note: "Had to leave after the second set", classic: false },
  },
  {
    id: "wim26sf", event: "Wimbledon 2026", date: "2026-07", round: "Semifinal", surface: "grass",
    winner: "Sinner", loser: "Djokovic", score: "6-4 6-4 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-07", setsSeen: all(3), rating: 3, cheering: "Sinner", pick: { winner: "Sinner", sets: 3 }, tags: [], note: "", classic: false },
  },
  {
    id: "wim26f", event: "Wimbledon 2026", date: "2026-07", round: "Final", surface: "grass",
    winner: "Sinner", loser: "Zverev", score: "6-7(7) 7-6(2) 6-3 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-07", setsSeen: all(4), rating: 4, cheering: "Sinner", pick: { winner: "Sinner", sets: 4 }, tags: ["Comeback"], note: "Lost the first set and never looked worried.", classic: false },
  },
  {
    id: "uso26qf", event: "US Open 2026", date: "2026-09", round: "Quarterfinal", surface: "hard",
    winner: "Shelton", loser: "Alcaraz", score: "6-7(5) 6-1 6-3 1-6 7-6(10-7)", bestOf: 5,
    fan: { watchedOn: "Live", watchedDate: "2026-09", setsSeen: all(5), rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz", sets: 4 }, tags: ["Marathon", "Tiebreak drama"], note: "Still in our seats at 3:33 a.m. for the final tiebreak.", classic: true },
  },
  {
    id: "uso26w", event: "US Open 2026", date: "2026-09", round: "Women's final", surface: "hard",
    winner: "Rybakina", loser: "Sabalenka", score: "6-4 5-7 6-2", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2026-09", setsSeen: all(3), rating: 5, cheering: "Rybakina", pick: { winner: "Rybakina", sets: 3 }, tags: ["Classic"], note: "Nervy after she dropped the second", classic: true },
  },
];

export const matches: Match[] = logged.map(({ id, event, date, round, surface, winner, loser, score, bestOf }) => ({
  id,
  event,
  date,
  round,
  surface,
  winner,
  loser,
  score,
  bestOf,
}));
export const matchById: Record<string, Match> = Object.fromEntries(matches.map((m) => [m.id, m]));
// Backing a player is your call that they'll win, so the pick always follows who you backed
export const sampleLog: Record<string, FanEntry> = Object.fromEntries(
  logged.map((m) => [m.id, { ...m.fan, pick: m.fan.cheering ? { winner: m.fan.cheering, sets: m.fan.pick?.sets ?? setCount(m.score) } : null }]),
);

export const surfaceLabels: Record<Surface, string> = { clay: "Clay", hard: "Hard", grass: "Grass" };

// Rankings are kept per tournament: the four Slams in calendar order, then everything else
export const slams = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"] as const;
export type Tournament = (typeof slams)[number] | "Other events";
export const tournaments: Tournament[] = [...slams, "Other events"];
export const tournamentOf = (m: Match): Tournament => slams.find((t) => m.event.startsWith(t)) ?? "Other events";

// Rivalries are picked by rule, not by hand: every pairing you've logged at least
// MIN_RIVALRY_MEETINGS times, most meetings first (ties: the one you watched most recently),
// top MAX_RIVALRIES. Within a pair, the player who appears more in your log comes first.
export const MIN_RIVALRY_MEETINGS = 2;
export const MAX_RIVALRIES = 3;

export function findRivalries(log: Record<string, FanEntry>) {
  const appearances = new Map<string, number>();
  const mine = matches.filter((m) => log[m.id]);
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

export const rivalries = findRivalries(sampleLog);
export const rivalryOf = (m: Match) => rivalries.find((r) => involves(m, ...r.players));

/** "Wimbledon 2023 · Final" */
export function eventLabel(m: Match) {
  return `${m.event} · ${m.round}`;
}

export function involves(m: Match, a: string, b?: string) {
  if (!b) return m.winner === a || m.loser === a;
  return (m.winner === a && m.loser === b) || (m.winner === b && m.loser === a);
}

/** Games per set from a score like "6-7(5) 7-5", winner first. */
export function parseSets(score: string) {
  return score.split(" ").map((set) => {
    const [w, l] = set.replace(/\(.*\)/, "").split("-").map(Number);
    return { w, l };
  });
}

export function setCount(score: string) {
  return score.split(" ").length;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2023-07" -> "Jul 2023" */
export function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${months[Number(m) - 1]} ${y}`;
}

/** Watched at least a few months after it was played. */
export function isRewatch(m: Match, fan: FanEntry) {
  const toMonths = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
  return toMonths(fan.watchedDate) - toMonths(m.date) >= 3;
}

// Highlights on YouTube, keyed by match id. Checked against YouTube's oEmbed data
// (title and channel) on 18 October 2026; the tournaments' own, Tennis TV and broadcasters.
export const highlightVideos: Record<string, string> = {
  wim08: "U5Af1jGgYqA", // Wimbledon: Best Rallies
  ao12: "4Nk_whncZ20", // Australian Open: Extended Highlights
  wim19: "gFQ4xPfJ5pY", // ESPN: 2019 Wimbledon Highlights
  wim22: "hR11Emi6KCw", // Wimbledon: Sinner Overcomes Alcaraz
  wim22w: "BzkN0Yfoyh0", // Wimbledon: Ladies' Singles Final Highlights
  uso22: "-SSd4pFPUXk", // US Open: Extended Highlights
  ao23w: "RZYrEiyPGuE", // Australian Open: Extended Highlights
  rg23: "JjbWqtnAbxY", // "Djokovic vs Alcaraz Semi-final Highlights | Roland-Garros 2023"
  wim23: "dvBr9Wr8BCY", // Wimbledon: Extended Highlights
  cin23: "QTEqmACEuTI", // Tennis TV: Cincinnati 2023 Final Highlights
  ao24sf: "d8ICgsnZHrU", // Australian Open: Extended Highlights
  ao24f: "b90INDbXX7Y", // Australian Open: Extended Highlights
  iw24: "P3eXD15w7So", // Tennis TV: Extended Highlights
  rg24sf: "ZKAexfNzwh0", // Roland-Garros: Semi-final Highlights
  wim24: "64WsO9LKE-A", // Wimbledon: Final Extended Highlights
  oly24: "s2hVlbNadCc", // "Novak Djokovic wins gold in Men's Tennis Singles | Paris 2024 Highlights"
  bei24: "UL7r13j1sLs", // Tennis TV: Beijing Final Extended Highlights
  ao25f: "F5B1QpU0Evo", // Australian Open: Extended Highlights
  rom25: "m-p9LA0aQHk", // Sky Sport Tennis: Finale highlights (Italian commentary)
  rg25: "L63N1y5BnfY", // Roland-Garros: extended highlights
  wim25: "eRbTHj2KLro", // Wimbledon: Highlights
  uso25sf: "91QiqjXzBdc", // US Open: Extended Highlights
  uso25: "DHo1mw7lj3s", // US Open: Extended Highlights
  ao26: "Z99RntcbEtY", // Australian Open: Extended Highlights
  wim26sf: "pgFm3YBU9_E", // Wimbledon: Extended Highlights
  wim26f: "t88oAZbdtX8", // Wimbledon: Extended Highlights
  uso26qf: "rzQK-peqhJw", // US Open: Extended Highlights
  uso26w: "47hMZmSQO2I", // US Open: Extended Highlights
};
