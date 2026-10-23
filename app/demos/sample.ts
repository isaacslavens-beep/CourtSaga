// A sample fan's starred matches for the landing page's demos, most watched and a couple only starred. Results
// and scores are real; everything in `fan` (when and how it was watched, if it was, rating, who they cheered
// for, their call, notes) is example data. All three demo sections read and edit this one log, and nothing is saved.

import { toStoredEntry, type FanEntry, type Match, type StoredEntry } from "../diary/library";

type Logged = Match & { fan: FanEntry };

const logged: Logged[] = [
  {
    id: "wim22", event: "Wimbledon 2022", date: "2022-07", round: "R16", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Alcaraz", score: "6-1 6-4 6-7(8) 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2022-07", rating: 4, cheering: null, pick: null, note: "First match I ever properly sat down for. Didn't know either of them yet." },
  },
  {
    id: "wim22w", event: "Wimbledon 2022", date: "2022-07", round: "F", tour: "wta", surface: "grass",
    winner: "Rybakina", loser: "Jabeur", score: "3-6 6-2 6-2", bestOf: 3,
    fan: { watchedOn: "TV", watchedDate: "2022-07", rating: 4, cheering: null, pick: { winner: "Jabeur" }, note: "" },
  },
  {
    id: "uso22", event: "US Open 2022", date: "2022-09", round: "QF", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-3 6-7(7) 6-7(0) 7-5 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2022-09", rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, note: "Finished at almost 3 a.m. Worth every minute." },
  },
  {
    id: "ao23w", event: "Australian Open 2023", date: "2023-01", round: "F", tour: "wta", surface: "hard",
    winner: "Sabalenka", loser: "Rybakina", score: "4-6 6-3 6-4", bestOf: 3,
    fan: { watchedOn: "TV", watchedDate: "2023-01", rating: 4, cheering: "Rybakina", pick: { winner: "Rybakina" }, note: "" },
  },
  {
    id: "rg23", event: "Roland Garros 2023", date: "2023-06", round: "SF", tour: "atp", surface: "clay",
    winner: "Djokovic", loser: "Alcaraz", score: "6-3 5-7 6-1 6-1", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-06", rating: 3, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, note: "Joined in the third set. Cramps. Hard to watch." },
  },
  {
    id: "wim23", event: "Wimbledon 2023", date: "2023-07", round: "F", tour: "atp", surface: "grass",
    winner: "Alcaraz", loser: "Djokovic", score: "1-6 7-6(6) 6-1 3-6 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2023-07", rating: 5, cheering: "Alcaraz", pick: { winner: "Djokovic" }, note: "Best match I've seen. Screamed at the TV in the fifth." },
  },
  {
    id: "cin23", event: "Cincinnati 2023", date: "2023-08", round: "F", tour: "atp", surface: "hard",
    winner: "Djokovic", loser: "Alcaraz", score: "5-7 7-6(7) 7-6(4)", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2023-08", rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, note: "" },
  },
  {
    id: "wim08", event: "Wimbledon 2008", date: "2008-07", round: "F", tour: "atp", surface: "grass",
    winner: "Nadal", loser: "Federer", score: "6-4 6-4 6-7(5) 6-7(8) 9-7", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-11", rating: 5, cheering: null, pick: null, note: "Finally watched the one everyone talks about. They were right." },
  },
  {
    id: "ao12", event: "Australian Open 2012", date: "2012-01", round: "F", tour: "atp", surface: "hard",
    winner: "Djokovic", loser: "Nadal", score: "5-7 6-4 6-2 6-7(5) 7-5", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2023-12", rating: 5, cheering: null, pick: null, note: "Nearly six hours. Watched it over two nights." },
  },
  {
    id: "ao24sf", event: "Australian Open 2024", date: "2024-01", round: "SF", tour: "atp", surface: "hard",
    winner: "Sinner", loser: "Djokovic", score: "6-1 6-2 6-7(6) 6-3", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-01", rating: 4, cheering: "Sinner", pick: { winner: "Djokovic" }, note: "" },
  },
  {
    id: "ao24f", event: "Australian Open 2024", date: "2024-01", round: "F", tour: "atp", surface: "hard",
    winner: "Sinner", loser: "Medvedev", score: "3-6 3-6 6-4 6-4 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2024-01", rating: 5, cheering: "Sinner", pick: { winner: "Sinner" }, note: "Two sets down. Then he just stopped missing." },
  },
  {
    id: "iw24", event: "Indian Wells 2024", date: "2024-03", round: "SF", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "1-6 6-3 6-2", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2024-03", rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, note: "" },
  },
  {
    id: "rg24sf", event: "Roland Garros 2024", date: "2024-06", round: "SF", tour: "atp", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "2-6 6-3 3-6 6-4 6-3", bestOf: 5,
    fan: { watchedOn: null, watchedDate: "2024-06", rating: null, cheering: "Sinner", pick: { winner: "Sinner" }, note: "Missed it. Starring it for the rivalry." },
  },
  {
    id: "wim24", event: "Wimbledon 2024", date: "2024-07", round: "F", tour: "atp", surface: "grass",
    winner: "Alcaraz", loser: "Djokovic", score: "6-2 6-2 7-6(4)", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2024-07", rating: 3, cheering: "Djokovic", pick: { winner: "Alcaraz" }, note: "Called it. Wanted to be wrong." },
  },
  {
    id: "oly24", event: "Olympics 2024", date: "2024-08", round: "F", tour: "atp", surface: "clay",
    winner: "Djokovic", loser: "Alcaraz", score: "7-6(3) 7-6(2)", bestOf: 3,
    fan: { watchedOn: "Live", watchedDate: "2024-08", rating: 5, cheering: "Djokovic", pick: { winner: "Alcaraz" }, note: "We were there, on Philippe-Chatrier. He cried, we cried." },
  },
  {
    id: "bei24", event: "Beijing 2024", date: "2024-10", round: "F", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-7(6) 6-4 7-6(3)", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2024-10", rating: 4, cheering: "Sinner", pick: { winner: "Sinner" }, note: "" },
  },
  {
    id: "wim19", event: "Wimbledon 2019", date: "2019-07", round: "F", tour: "atp", surface: "grass",
    winner: "Djokovic", loser: "Federer", score: "7-6(5) 1-6 7-6(4) 4-6 13-12(3)", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2024-12", rating: 5, cheering: null, pick: null, note: "Knew how it ended and still couldn't watch the match points." },
  },
  {
    id: "ao25f", event: "Australian Open 2025", date: "2025-01", round: "F", tour: "atp", surface: "hard",
    winner: "Sinner", loser: "Zverev", score: "6-3 7-6(4) 6-3", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2025-01", rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, note: "" },
  },
  {
    id: "rom25", event: "Rome 2025", date: "2025-05", round: "F", tour: "atp", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "7-6(5) 6-1", bestOf: 3,
    fan: { watchedOn: null, watchedDate: "2025-05", rating: null, cheering: "Sinner", pick: { winner: "Sinner" }, note: "" },
  },
  {
    id: "rg25", event: "Roland Garros 2025", date: "2025-06", round: "F", tour: "atp", surface: "clay",
    winner: "Alcaraz", loser: "Sinner", score: "4-6 6-7(4) 6-4 7-6(3) 7-6(10-2)", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-06", rating: 5, cheering: "Sinner", pick: { winner: "Sinner" }, note: "Three championship points. Still can't talk about it." },
  },
  {
    id: "wim25", event: "Wimbledon 2025", date: "2025-07", round: "F", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Alcaraz", score: "4-6 6-4 6-4 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2025-07", rating: 4, cheering: "Sinner", pick: { winner: "Sinner" }, note: "Hooked once he lost the first set" },
  },
  {
    id: "uso25sf", event: "US Open 2025", date: "2025-09", round: "SF", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Djokovic", score: "6-4 7-6(4) 6-2", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-09", rating: 3, cheering: "Djokovic", pick: { winner: "Alcaraz" }, note: "" },
  },
  {
    id: "uso25", event: "US Open 2025", date: "2025-09", round: "F", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Sinner", score: "6-2 3-6 6-1 6-4", bestOf: 5,
    fan: { watchedOn: "Stream", watchedDate: "2025-09", rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, note: "" },
  },
  {
    id: "ao26", event: "Australian Open 2026", date: "2026-01", round: "F", tour: "atp", surface: "hard",
    winner: "Alcaraz", loser: "Djokovic", score: "2-6 6-2 6-3 7-5", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-01", rating: 4, cheering: "Djokovic", pick: { winner: "Djokovic" }, note: "Had to leave after the second set" },
  },
  {
    id: "wim26sf", event: "Wimbledon 2026", date: "2026-07", round: "SF", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Djokovic", score: "6-4 6-4 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-07", rating: 3, cheering: "Sinner", pick: { winner: "Sinner" }, note: "" },
  },
  {
    id: "wim26f", event: "Wimbledon 2026", date: "2026-07", round: "F", tour: "atp", surface: "grass",
    winner: "Sinner", loser: "Zverev", score: "6-7(7) 7-6(2) 6-3 6-4", bestOf: 5,
    fan: { watchedOn: "TV", watchedDate: "2026-07", rating: 4, cheering: "Sinner", pick: { winner: "Sinner" }, note: "Lost the first set and never looked worried." },
  },
  {
    id: "uso26qf", event: "US Open 2026", date: "2026-09", round: "QF", tour: "atp", surface: "hard",
    winner: "Shelton", loser: "Alcaraz", score: "6-7(5) 6-1 6-3 1-6 7-6(10-7)", bestOf: 5,
    fan: { watchedOn: "Live", watchedDate: "2026-09", rating: 5, cheering: "Alcaraz", pick: { winner: "Alcaraz" }, note: "Still in our seats at 3:33 a.m. for the final tiebreak." },
  },
  {
    id: "uso26w", event: "US Open 2026", date: "2026-09", round: "F", tour: "wta", surface: "hard",
    winner: "Rybakina", loser: "Sabalenka", score: "6-4 5-7 6-2", bestOf: 3,
    fan: { watchedOn: "Stream", watchedDate: "2026-09", rating: 5, cheering: "Rybakina", pick: { winner: "Rybakina" }, note: "Nervy after she dropped the second" },
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
  .sort((a, b) => (sampleLog[b].rating ?? 0) - (sampleLog[a].rating ?? 0) || sampleMatches[b].date.localeCompare(sampleMatches[a].date));
