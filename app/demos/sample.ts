// A sample fan's log for the landing page's demos. Results and scores are real; everything in `fan` (when
// and how it was watched, sets seen, rating, who they cheered for, their call, tags, notes) is example
// data. All three demo sections read and edit this one log, and nothing is saved.

import { toStoredEntry, type FanEntry, type Match, type StoredEntry } from "../diary/library";

type Logged = Match & { fan: FanEntry };

const all = (n: number) => Array.from({ length: n }, (_, i) => i);

const logged: Logged[] = [
  {
    id: "wim22", event: "Wimbledon 2022", date: "2022-07", round: "R16", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Alcaraz", score: "6-1 6-4 6-7(8) 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2022-07", setsSeen: all(4), rating: 4, cheering: null, pick: null, tags: [], note: "First match I ever properly sat down for. Didn't know either of them yet.", classic: false },
  },
  {
    id: "wim22w", event: "Wimbledon 2022", date: "2022-07", round: "F", tour: "wta", surface: "grass",
    winner: "Rybakina", loser: "Jabeur", score: "3-6 6-2 6-2", bestOf: 3,
    fan: { watchedOn: "TV", watchedDate: "2022-07", setsSeen: all(3), rating: 4, cheering: null, pick: { winner: "Jabeur" }, tags: [], note: "", classic: false },
  },
  {
    id: "uso22", event: "US Open 2022", date: "2022-09", round: "QF", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-3 6-7(7) 6-7(0) 7-5 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2022-09", setsSeen: all(5), rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, tags: ["Marathon"], note: "Finished at almost 3 a.m. Worth every minute.", classic: true },
  },
  {
    id: "ao23w", event: "Australian Open 2023", date: "2023-01", round: "F", tour: "wta", surface: "hard",
    winner: "Sabalenka", loser: "Rybakina", score: "4-6 6-3 6-4", bestOf: 3,
    fan: { watchedOn: "TV", watchedDate: "2023-01", setsSeen: all(3), rating: 4, cheering: "Rybakina", pick: { winner: "Rybakina" }, tags: [], note: "", classic: false },
  },
  {
    id: "rg23", event: "Roland Garros 2023", date: "2023-06", round: "SF", tour: "atp", surface: "clay",
    winner: "Djokovic", loser: "Alcaraz", score: "6-3 5-7 6-1 6-1", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-06", setsSeen: [2, 3], rating: 3, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, tags: [], note: "Joined in the third set. Cramps. Hard to watch.", classic: false },
  },
  {
    id: "wim23", event: "Wimbledon 2023", date: "2023-07", round: "F", tour: "atp", surface: "grass",
    winner: "Alcaraz", loser: "Djokovic", score: "1-6 7-6(6) 6-1 3-6 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2023-07", setsSeen: all(5), rating: 5, cheering: "Alcaraz", pick: { winner: "Djokovic" }, tags: ["Classic", "Marathon"], note: "Best match I've seen. Screamed at the TV in the fifth.", classic: true },
  },
  {
    id: "cin23", event: "Cincinnati 2023", date: "2023-08", round: "F", tour: "atp", surface: "hard",
    winner: "Djokovic", loser: "Alcaraz", score: "5-7 7-6(7) 7-6(4)", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2023-08", setsSeen: [1, 2], rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, tags: ["Tiebreak drama"], note: "", classic: false },
  },
  {
    id: "wim08", event: "Wimbledon 2008", date: "2008-07", round: "F", tour: "atp", surface: "grass",
    winner: "Nadal", loser: "Federer", score: "6-4 6-4 6-7(5) 6-7(8) 9-7", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-11", setsSeen: all(5), rating: 5, cheering: null, pick: null, tags: ["Classic"], note: "Finally watched the one everyone talks about. They were right.", classic: true },
  },
  {
    id: "ao12", event: "Australian Open 2012", date: "2012-01", round: "F", tour: "atp", surface: "hard",
    winner: "Djokovic", loser: "Nadal", score: "5-7 6-4 6-2 6-7(5) 7-5", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-12", setsSeen: all(5), rating: 5, cheering: null, pick: null, tags: ["Marathon"], note: "Nearly six hours. Watched it over two nights.", classic: true },
  },
  {
    id: "ao24sf", event: "Australian Open 2024", date: "2024-01", round: "SF", tour: "atp", surface: "hard",
    winner: "Sinner", loser: "Djokovic", score: "6-1 6-2 6-7(6) 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-01", setsSeen: all(4), rating: 4, cheering: "Sinner", pick: { winner: "Djokovic" }, tags: [], note: "", classic: false },
  },
  {
    id: "ao24f", event: "Australian Open 2024", date: "2024-01", round: "F", tour: "atp", surface: "hard",
    winner: "Sinner", loser: "Medvedev", score: "3-6 3-6 6-4 6-4 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2024-01", setsSeen: all(5), rating: 5, cheering: "Sinner", pick: { winner: "Sinner" }, tags: ["Comeback"], note: "Two sets down. Then he just stopped missing.", classic: false },
  },
  {
    id: "iw24", event: "Indian Wells 2024", date: "2024-03", round: "SF", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "1-6 6-3 6-2", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2024-03", setsSeen: all(3), rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, tags: [], note: "", classic: false },
  },
  {
    id: "rg24sf", event: "Roland Garros 2024", date: "2024-06", round: "SF", tour: "atp", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "2-6 6-3 3-6 6-4 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-06", setsSeen: all(5), rating: 4, cheering: "Sinner", pick: { winner: "Sinner" }, tags: [], note: "", classic: false },
  },
  {
    id: "wim24", event: "Wimbledon 2024", date: "2024-07", round: "F", tour: "atp", surface: "grass",
    winner: "Alcaraz", loser: "Djokovic", score: "6-2 6-2 7-6(4)", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2024-07", setsSeen: all(3), rating: 3, cheering: "Djokovic", pick: { winner: "Alcaraz" }, tags: [], note: "Called it. Wanted to be wrong.", classic: false },
  },
  {
    id: "oly24", event: "Olympics 2024", date: "2024-08", round: "F", tour: "atp", surface: "clay",
    winner: "Djokovic", loser: "Alcaraz", score: "7-6(3) 7-6(2)", bestOf: 3,
    fan: { watchedOn: "Live", watchedDate: "2024-08", setsSeen: all(2), rating: 5, cheering: "Djokovic", pick: { winner: "Alcaraz" }, tags: ["Classic"], note: "We were there, on Philippe-Chatrier. He cried, we cried.", classic: true },
  },
  {
    id: "bei24", event: "Beijing 2024", date: "2024-10", round: "F", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-7(6) 6-4 7-6(3)", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2024-10", setsSeen: all(3), rating: 4, cheering: "Sinner", pick: { winner: "Sinner" }, tags: ["Tiebreak drama"], note: "", classic: false },
  },
  {
    id: "wim19", event: "Wimbledon 2019", date: "2019-07", round: "F", tour: "atp", surface: "grass",
    winner: "Djokovic", loser: "Federer", score: "7-6(5) 1-6 7-6(4) 4-6 13-12(3)", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-12", setsSeen: all(5), rating: 5, cheering: null, pick: null, tags: ["Marathon"], note: "Knew how it ended and still couldn't watch the match points.", classic: true },
  },
  {
    id: "ao25f", event: "Australian Open 2025", date: "2025-01", round: "F", tour: "atp", surface: "hard",
    winner: "Sinner", loser: "Zverev", score: "6-3 7-6(4) 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2025-01", setsSeen: all(3), rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, tags: [], note: "", classic: false },
  },
  {
    id: "rom25", event: "Rome 2025", date: "2025-05", round: "F", tour: "atp", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "7-6(5) 6-1", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2025-05", setsSeen: all(2), rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, tags: [], note: "", classic: false },
  },
  {
    id: "rg25", event: "Roland Garros 2025", date: "2025-06", round: "F", tour: "atp", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "4-6 6-7(4) 6-4 7-6(3) 7-6(10-2)", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-06", setsSeen: all(5), rating: 5, cheering: "Sinner", pick: { winner: "Sinner" }, tags: ["Marathon", "Classic"], note: "Three championship points. Still can't talk about it.", classic: true },
  },
  {
    id: "wim25", event: "Wimbledon 2025", date: "2025-07", round: "F", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Alcaraz", score: "4-6 6-4 6-4 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2025-07", setsSeen: [1, 2, 3], rating: 4, cheering: "Sinner", pick: { winner: "Sinner" }, tags: ["Comeback"], note: "Hooked once he lost the first set", classic: false },
  },
  {
    id: "uso25sf", event: "US Open 2025", date: "2025-09", round: "SF", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Djokovic", score: "6-4 7-6(4) 6-2", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-09", setsSeen: all(3), rating: 3, cheering: "Djokovic", pick: { winner: "Alcaraz" }, tags: [], note: "", classic: false },
  },
  {
    id: "uso25", event: "US Open 2025", date: "2025-09", round: "F", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-2 3-6 6-1 6-4", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-09", setsSeen: all(4), rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, tags: [], note: "", classic: false },
  },
  {
    id: "ao26", event: "Australian Open 2026", date: "2026-01", round: "F", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Djokovic", score: "2-6 6-2 6-3 7-5", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-01", setsSeen: [0, 1], rating: 4, cheering: "Djokovic", pick: { winner: "Djokovic" }, tags: [], note: "Had to leave after the second set", classic: false },
  },
  {
    id: "wim26sf", event: "Wimbledon 2026", date: "2026-07", round: "SF", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Djokovic", score: "6-4 6-4 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-07", setsSeen: all(3), rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, tags: [], note: "", classic: false },
  },
  {
    id: "wim26f", event: "Wimbledon 2026", date: "2026-07", round: "F", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Zverev", score: "6-7(7) 7-6(2) 6-3 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-07", setsSeen: all(4), rating: 4, cheering: "Sinner", pick: { winner: "Sinner" }, tags: ["Comeback"], note: "Lost the first set and never looked worried.", classic: false },
  },
  {
    id: "uso26qf", event: "US Open 2026", date: "2026-09", round: "QF", tour: "atp", surface: "hard",
    winner: "Shelton", loser: "Alcaraz", score: "6-7(5) 6-1 6-3 1-6 7-6(10-7)", bestOf: 5,
    fan: { watchedOn: "Live", watchedDate: "2026-09", setsSeen: all(5), rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, tags: ["Marathon", "Tiebreak drama"], note: "Still in our seats at 3:33 a.m. for the final tiebreak.", classic: true },
  },
  {
    id: "uso26w", event: "US Open 2026", date: "2026-09", round: "F", tour: "wta", surface: "hard",
    winner: "Rybakina", loser: "Sabalenka", score: "6-4 5-7 6-2", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2026-09", setsSeen: all(3), rating: 5, cheering: "Rybakina", pick: { winner: "Rybakina" }, tags: ["Classic"], note: "Nervy after she dropped the second", classic: true },
  },
];

export const sampleMatches: Record<string, Match> = Object.fromEntries(
  logged.map(({ id, event, date, round, tour, surface, winner, loser, score, bestOf }) => [
    id,
    { id, event, date, round, tour, surface, winner, loser, score, bestOf },
  ]),
);
// Backing a player is your call that they'll win, so the pick always follows who you backed
export const sampleLog: Record<string, FanEntry> = Object.fromEntries(
  logged.map((m) => [m.id, { ...m.fan, pick: m.fan.cheering ? { winner: m.fan.cheering } : null }]),
);
// As the diary keeps them: who they backed as a side of the match
export const sampleEntries: Record<string, StoredEntry> = Object.fromEntries(
  Object.entries(sampleLog).map(([id, fan]) => [id, toStoredEntry(fan, sampleMatches[id]) as StoredEntry]),
);
// The sample fan's ranking: their ratings, best first, newest first among equals
export const sampleOrder = logged
  .map((m) => m.id)
  .sort((a, b) => sampleLog[b].rating - sampleLog[a].rating || sampleMatches[b].date.localeCompare(sampleMatches[a].date));
