// Every tour-level meeting in each rivalry, oldest first, through mid-October 2026.
// `logId` links a meeting to the sample fan's log; meetings without one are the ones they didn't log.
// Sources (checked 19 October 2026): Wikipedia's Alcaraz–Sinner and Rybakina–Sabalenka rivalry pages,
// and tennis-x.com (Alcaraz–Djokovic).

import type { Surface } from "./library";

export type RecordMeeting = {
  date: string; // "YYYY-MM"
  event: string; // tournament, without the year
  round: string;
  surface: Surface;
  winner: string;
  logId?: string;
};

const m = (date: string, event: string, round: string, surface: Surface, winner: string, logId?: string): RecordMeeting => ({
  date,
  event,
  round,
  surface,
  winner,
  logId,
});

export const rivalryRecords: Record<string, RecordMeeting[]> = {
  "Alcaraz-Sinner": [
    m("2021-11", "Paris Masters", "Second round", "hard", "Alcaraz"),
    m("2022-07", "Wimbledon", "Fourth round", "grass", "Sinner", "wim22"),
    m("2022-07", "Umag", "Final", "clay", "Sinner"),
    m("2022-09", "US Open", "Quarterfinal", "hard", "Alcaraz", "uso22"),
    m("2023-03", "Indian Wells", "Semifinal", "hard", "Alcaraz"),
    m("2023-03", "Miami", "Semifinal", "hard", "Sinner"),
    m("2023-10", "Beijing", "Semifinal", "hard", "Sinner"),
    m("2024-03", "Indian Wells", "Semifinal", "hard", "Alcaraz", "iw24"),
    m("2024-06", "Roland Garros", "Semifinal", "clay", "Alcaraz", "rg24sf"),
    m("2024-10", "Beijing", "Final", "hard", "Alcaraz", "bei24"),
    m("2025-05", "Rome", "Final", "clay", "Alcaraz", "rom25"),
    m("2025-06", "Roland Garros", "Final", "clay", "Alcaraz", "rg25"),
    m("2025-07", "Wimbledon", "Final", "grass", "Sinner", "wim25"),
    m("2025-08", "Cincinnati", "Final", "hard", "Alcaraz"),
    m("2025-09", "US Open", "Final", "hard", "Alcaraz", "uso25"),
    m("2025-11", "ATP Finals", "Final", "hard", "Sinner"),
    m("2026-04", "Monte-Carlo", "Final", "clay", "Sinner"),
  ],
  "Alcaraz-Djokovic": [
    m("2022-05", "Madrid", "Semifinal", "clay", "Alcaraz"),
    m("2023-06", "Roland Garros", "Semifinal", "clay", "Djokovic", "rg23"),
    m("2023-07", "Wimbledon", "Final", "grass", "Alcaraz", "wim23"),
    m("2023-08", "Cincinnati", "Final", "hard", "Djokovic", "cin23"),
    m("2023-11", "ATP Finals", "Semifinal", "hard", "Djokovic"),
    m("2024-07", "Wimbledon", "Final", "grass", "Alcaraz", "wim24"),
    m("2024-08", "Olympics", "Final", "clay", "Djokovic", "oly24"),
    m("2025-01", "Australian Open", "Quarterfinal", "hard", "Djokovic"),
    m("2025-09", "US Open", "Semifinal", "hard", "Alcaraz", "uso25sf"),
    m("2026-01", "Australian Open", "Final", "hard", "Alcaraz", "ao26"),
  ],
  "Rybakina-Sabalenka": [
    m("2019-09", "Wuhan", "Quarterfinal", "hard", "Sabalenka"),
    m("2021-01", "Abu Dhabi", "Quarterfinal", "hard", "Sabalenka"),
    m("2021-07", "Wimbledon", "Fourth round", "grass", "Sabalenka"),
    m("2023-01", "Australian Open", "Final", "hard", "Sabalenka", "ao23w"),
    m("2023-03", "Indian Wells", "Final", "hard", "Rybakina"),
    m("2023-10", "Beijing", "Quarterfinal", "hard", "Rybakina"),
    m("2023-10", "WTA Finals", "Round robin", "hard", "Sabalenka"),
    m("2024-01", "Brisbane", "Final", "hard", "Rybakina"),
    m("2024-05", "Madrid", "Semifinal", "clay", "Sabalenka"),
    m("2024-11", "WTA Finals", "Round robin", "hard", "Rybakina"),
    m("2025-06", "Berlin", "Quarterfinal", "grass", "Sabalenka"),
    m("2025-08", "Cincinnati", "Quarterfinal", "hard", "Rybakina"),
    m("2025-10", "Wuhan", "Quarterfinal", "hard", "Sabalenka"),
    m("2025-11", "WTA Finals", "Final", "hard", "Rybakina"),
    m("2026-01", "Australian Open", "Final", "hard", "Rybakina"),
    m("2026-03", "Indian Wells", "Final", "hard", "Sabalenka"),
    m("2026-03", "Miami", "Semifinal", "hard", "Sabalenka"),
    m("2026-09", "US Open", "Final", "hard", "Rybakina", "uso26w"),
  ],
};
