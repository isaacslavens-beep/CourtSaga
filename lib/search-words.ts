import type { Round, Tour } from "@/app/diary/library";

// The words a match can be found by besides its players and event: written into each match's search
// text by scripts/import-matches.ts, and known to search, which never "corrects" them as typos.
// Change them and run the import again to rebuild the search text.

export const roundWords: Record<Round, string> = {
  R128: "r128 round of 128",
  R64: "r64 round of 64",
  R32: "r32 round of 32",
  R16: "r16 round of 16 last 16",
  QF: "qf quarterfinal quarterfinals quarter quarters",
  SF: "sf semifinal semifinals semi semis",
  F: "final",
  RR: "rr round robin group",
  BR: "bronze medal match",
  "3P": "third place play-off",
};

// At the Slams, the early rounds by number
export const slamRoundWords: Partial<Record<Round, string>> = { R128: "first round 1r", R64: "second round 2r", R32: "third round 3r", R16: "fourth round 4r" };

export const tourWords: Record<Tour, string> = { atp: "atp men mens", wta: "wta women womens ladies" };

// Other names fans use for an event
export const eventWords: Record<string, string> = {
  "Australian Open": "ao aus",
  "Roland Garros": "rg french open",
  "US Open": "uso usopen",
  Wimbledon: "wimby",
  "Indian Wells": "iw",
  Cincinnati: "cincy",
  "Monte Carlo": "monte-carlo montecarlo",
  Canada: "canadian open toronto montreal",
  Toronto: "canada canadian open",
  Montreal: "canada canadian open",
  "Paris Masters": "bercy",
  "ATP Finals": "tour finals masters cup year-end",
  "WTA Finals": "championships year-end",
  "Davis Cup": "dc",
  "Fed Cup": "bjk billie jean king",
  "Billie Jean King Cup": "bjk fed",
  Olympics: "olympic games",
};

export const vocabulary = new Set(
  [...Object.values(roundWords), ...Object.values(slamRoundWords), ...Object.values(tourWords), ...Object.values(eventWords)].flatMap((w) =>
    w.split(/[^a-z0-9]+/),
  ),
);
