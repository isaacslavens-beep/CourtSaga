// Every tour-level meeting in each rivalry, oldest first, through mid-October 2026.
// `logId` links a meeting to the sample fan's log, whose entry carries its score; meetings without one
// are the ones they didn't log, and carry their own score here, winner first, as in the log.
// Sources (checked 20 October 2026): Wikipedia's Alcaraz–Sinner and Rybakina–Sabalenka rivalry pages;
// for Alcaraz–Djokovic, tennis-x.com, with the three scores not in the log checked against tennis365.com
// and tennismajors.com.

import type { Surface } from "./library";

export type RecordMeeting = {
  date: string; // "YYYY-MM"
  event: string; // tournament, without the year
  round: string;
  surface: Surface;
  winner: string;
  logId?: string;
  score?: string; // only for meetings not in the log, e.g. "6-7(5) 6-1 6-1"
  retired?: boolean; // the loser retired mid-match
};

/** One meeting: its score, or `{ log }` for a meeting in the sample log. A trailing " ret." marks a retirement. */
const m = (date: string, event: string, round: string, surface: Surface, winner: string, result: string | { log: string }): RecordMeeting =>
  typeof result === "string"
    ? { date, event, round, surface, winner, score: result.replace(/ ret\.$/, ""), retired: result.endsWith(" ret.") }
    : { date, event, round, surface, winner, logId: result.log };

export const rivalryRecords: Record<string, RecordMeeting[]> = {
  "Alcaraz-Sinner": [
    m("2021-11", "Paris Masters", "Second round", "hard", "Alcaraz", "7-6(1) 7-5"),
    m("2022-07", "Wimbledon", "Fourth round", "grass", "Sinner", { log: "wim22" }),
    m("2022-07", "Umag", "Final", "clay", "Sinner", "6-7(5) 6-1 6-1"),
    m("2022-09", "US Open", "Quarterfinal", "hard", "Alcaraz", { log: "uso22" }),
    m("2023-03", "Indian Wells", "Semifinal", "hard", "Alcaraz", "7-6(4) 6-3"),
    m("2023-03", "Miami", "Semifinal", "hard", "Sinner", "6-7(4) 6-4 6-2"),
    m("2023-10", "Beijing", "Semifinal", "hard", "Sinner", "7-6(4) 6-1"),
    m("2024-03", "Indian Wells", "Semifinal", "hard", "Alcaraz", { log: "iw24" }),
    m("2024-06", "Roland Garros", "Semifinal", "clay", "Alcaraz", { log: "rg24sf" }),
    m("2024-10", "Beijing", "Final", "hard", "Alcaraz", { log: "bei24" }),
    m("2025-05", "Rome", "Final", "clay", "Alcaraz", { log: "rom25" }),
    m("2025-06", "Roland Garros", "Final", "clay", "Alcaraz", { log: "rg25" }),
    m("2025-07", "Wimbledon", "Final", "grass", "Sinner", { log: "wim25" }),
    m("2025-08", "Cincinnati", "Final", "hard", "Alcaraz", "5-0 ret."),
    m("2025-09", "US Open", "Final", "hard", "Alcaraz", { log: "uso25" }),
    m("2025-11", "ATP Finals", "Final", "hard", "Sinner", "7-6(4) 7-5"),
    m("2026-04", "Monte-Carlo", "Final", "clay", "Sinner", "7-6(5) 6-3"),
  ],
  "Alcaraz-Djokovic": [
    m("2022-05", "Madrid", "Semifinal", "clay", "Alcaraz", "6-7(5) 7-5 7-6(5)"),
    m("2023-06", "Roland Garros", "Semifinal", "clay", "Djokovic", { log: "rg23" }),
    m("2023-07", "Wimbledon", "Final", "grass", "Alcaraz", { log: "wim23" }),
    m("2023-08", "Cincinnati", "Final", "hard", "Djokovic", { log: "cin23" }),
    m("2023-11", "ATP Finals", "Semifinal", "hard", "Djokovic", "6-3 6-2"),
    m("2024-07", "Wimbledon", "Final", "grass", "Alcaraz", { log: "wim24" }),
    m("2024-08", "Olympics", "Final", "clay", "Djokovic", { log: "oly24" }),
    m("2025-01", "Australian Open", "Quarterfinal", "hard", "Djokovic", "4-6 6-4 6-3 6-4"),
    m("2025-09", "US Open", "Semifinal", "hard", "Alcaraz", { log: "uso25sf" }),
    m("2026-01", "Australian Open", "Final", "hard", "Alcaraz", { log: "ao26" }),
  ],
  "Rybakina-Sabalenka": [
    m("2019-09", "Wuhan", "Quarterfinal", "hard", "Sabalenka", "6-3 1-6 6-3"),
    m("2021-01", "Abu Dhabi", "Quarterfinal", "hard", "Sabalenka", "6-4 4-6 6-3"),
    m("2021-07", "Wimbledon", "Fourth round", "grass", "Sabalenka", "6-3 4-6 6-3"),
    m("2023-01", "Australian Open", "Final", "hard", "Sabalenka", { log: "ao23w" }),
    m("2023-03", "Indian Wells", "Final", "hard", "Rybakina", "7-6(11) 6-4"),
    m("2023-10", "Beijing", "Quarterfinal", "hard", "Rybakina", "7-5 6-2"),
    m("2023-10", "WTA Finals", "Round robin", "hard", "Sabalenka", "6-2 3-6 6-3"),
    m("2024-01", "Brisbane", "Final", "hard", "Rybakina", "6-0 6-3"),
    m("2024-05", "Madrid", "Semifinal", "clay", "Sabalenka", "1-6 7-5 7-6(5)"),
    m("2024-11", "WTA Finals", "Round robin", "hard", "Rybakina", "6-4 3-6 6-1"),
    m("2025-06", "Berlin", "Quarterfinal", "grass", "Sabalenka", "7-6(6) 3-6 7-6(6)"),
    m("2025-08", "Cincinnati", "Quarterfinal", "hard", "Rybakina", "6-1 6-4"),
    m("2025-10", "Wuhan", "Quarterfinal", "hard", "Sabalenka", "6-3 6-3"),
    m("2025-11", "WTA Finals", "Final", "hard", "Rybakina", "6-3 7-6(0)"),
    m("2026-01", "Australian Open", "Final", "hard", "Rybakina", "6-4 4-6 6-4"),
    m("2026-03", "Indian Wells", "Final", "hard", "Sabalenka", "3-6 6-3 7-6(6)"),
    m("2026-03", "Miami", "Semifinal", "hard", "Sabalenka", "6-4 6-3"),
    m("2026-09", "US Open", "Final", "hard", "Rybakina", { log: "uso26w" }),
  ],
};
