// Which look each signed-in page has (see .court-* in globals.css): the log on Wimbledon's grass,
// exploring on Wimbledon's grass under its purple, statistics and the account on the US Open's court, interact on
// Roland Garros's clay, and the saga a book of its own. The
// header reads it too, so it matches the page below it.
export type Court = "wimbledon" | "rg" | "uso" | "saga";

export const pageCourts: Record<string, Court> = {
  "/explore": "wimbledon",
  "/saga": "saga",
  "/statistics": "uso",
  "/statistics/women": "uso",
  "/interact": "rg",
  "/interact/women": "rg",
  "/account": "uso",
  "/admin": "uso",
};
