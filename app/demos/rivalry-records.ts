// Every tour-level meeting in each of the sample fan's rivalries, oldest first, through mid-October 2026.
// `logId` links a meeting to the sample log, whose entry carries its score; meetings without one
// are the ones they didn't log, and carry their own score here, winner first, as in the log.
// Sources (checked 20 October 2026): Wikipedia's Alcaraz–Sinner and Rybakina–Sabalenka rivalry pages;
// for Alcaraz–Djokovic, tennis-x.com, with the three scores not in the log checked against tennis365.com
// and tennismajors.com. A signed-in fan's rivalries come from the match data instead (lib/diary.ts).

import type { RecordMeeting, Round, Surface } from "../diary/library";

/** One meeting: its score, or `{ log }` for a meeting in the sample log. A trailing " ret." marks a retirement. */
const m = (date: string, event: string, round: Round, surface: Surface, winner: string, result: string | { log: string }): RecordMeeting =>
  typeof result === "string"
    ? { date, event, round, surface, winner, score: result.replace(/ ret\.$/, " RET") }
    : { date, event, round, surface, winner, logId: result.log };

export const rivalryRecords: Record<string, RecordMeeting[]> = {
  "Alcaraz-Sinner": [
    m("2021-11", "Paris Masters", "R32", "hard", "Alcaraz", "7-6(1) 7-5"),
    m("2022-07", "Wimbledon", "R16", "grass", "Sinner", { log: "wim22" }),
    m("2022-07", "Umag", "F", "clay", "Sinner", "6-7(5) 6-1 6-1"),
    m("2022-09", "US Open", "QF", "hard", "Alcaraz", { log: "uso22" }),
    m("2023-03", "Indian Wells", "SF", "hard", "Alcaraz", "7-6(4) 6-3"),
    m("2023-03", "Miami", "SF", "hard", "Sinner", "6-7(4) 6-4 6-2"),
    m("2023-10", "Beijing", "SF", "hard", "Sinner", "7-6(4) 6-1"),
    m("2024-03", "Indian Wells", "SF", "hard", "Alcaraz", { log: "iw24" }),
    m("2024-06", "Roland Garros", "SF", "clay", "Alcaraz", { log: "rg24sf" }),
    m("2024-10", "Beijing", "F", "hard", "Alcaraz", { log: "bei24" }),
    m("2025-05", "Rome", "F", "clay", "Alcaraz", { log: "rom25" }),
    m("2025-06", "Roland Garros", "F", "clay", "Alcaraz", { log: "rg25" }),
    m("2025-07", "Wimbledon", "F", "grass", "Sinner", { log: "wim25" }),
    m("2025-08", "Cincinnati", "F", "hard", "Alcaraz", "5-0 ret."),
    m("2025-09", "US Open", "F", "hard", "Alcaraz", { log: "uso25" }),
    m("2025-11", "ATP Finals", "F", "hard", "Sinner", "7-6(4) 7-5"),
    m("2026-04", "Monte-Carlo", "F", "clay", "Sinner", "7-6(5) 6-3"),
  ],
  "Alcaraz-Djokovic": [
    m("2022-05", "Madrid", "SF", "clay", "Alcaraz", "6-7(5) 7-5 7-6(5)"),
    m("2023-06", "Roland Garros", "SF", "clay", "Djokovic", { log: "rg23" }),
    m("2023-07", "Wimbledon", "F", "grass", "Alcaraz", { log: "wim23" }),
    m("2023-08", "Cincinnati", "F", "hard", "Djokovic", { log: "cin23" }),
    m("2023-11", "ATP Finals", "SF", "hard", "Djokovic", "6-3 6-2"),
    m("2024-07", "Wimbledon", "F", "grass", "Alcaraz", { log: "wim24" }),
    m("2024-08", "Olympics", "F", "clay", "Djokovic", { log: "oly24" }),
    m("2025-01", "Australian Open", "QF", "hard", "Djokovic", "4-6 6-4 6-3 6-4"),
    m("2025-09", "US Open", "SF", "hard", "Alcaraz", { log: "uso25sf" }),
    m("2026-01", "Australian Open", "F", "hard", "Alcaraz", { log: "ao26" }),
  ],
  "Rybakina-Sabalenka": [
    m("2019-09", "Wuhan", "QF", "hard", "Sabalenka", "6-3 1-6 6-3"),
    m("2021-01", "Abu Dhabi", "QF", "hard", "Sabalenka", "6-4 4-6 6-3"),
    m("2021-07", "Wimbledon", "R16", "grass", "Sabalenka", "6-3 4-6 6-3"),
    m("2023-01", "Australian Open", "F", "hard", "Sabalenka", { log: "ao23w" }),
    m("2023-03", "Indian Wells", "F", "hard", "Rybakina", "7-6(11) 6-4"),
    m("2023-10", "Beijing", "QF", "hard", "Rybakina", "7-5 6-2"),
    m("2023-10", "WTA Finals", "RR", "hard", "Sabalenka", "6-2 3-6 6-3"),
    m("2024-01", "Brisbane", "F", "hard", "Rybakina", "6-0 6-3"),
    m("2024-05", "Madrid", "SF", "clay", "Sabalenka", "1-6 7-5 7-6(5)"),
    m("2024-11", "WTA Finals", "RR", "hard", "Rybakina", "6-4 3-6 6-1"),
    m("2025-06", "Berlin", "QF", "grass", "Sabalenka", "7-6(6) 3-6 7-6(6)"),
    m("2025-08", "Cincinnati", "QF", "hard", "Rybakina", "6-1 6-4"),
    m("2025-10", "Wuhan", "QF", "hard", "Sabalenka", "6-3 6-3"),
    m("2025-11", "WTA Finals", "F", "hard", "Rybakina", "6-3 7-6(0)"),
    m("2026-01", "Australian Open", "F", "hard", "Rybakina", "6-4 4-6 6-4"),
    m("2026-03", "Indian Wells", "F", "hard", "Sabalenka", "3-6 6-3 7-6(6)"),
    m("2026-03", "Miami", "SF", "hard", "Sabalenka", "6-4 6-3"),
    m("2026-09", "US Open", "F", "hard", "Rybakina", { log: "uso26w" }),
  ],
};
