// Which look each signed-in page has (see .court-* in globals.css): the log on Wimbledon's grass,
// exploring on the US Open's court, the account on the US Open's court, and the saga a book of its own. The
// header reads it too, so it matches the page below it.
export type Court = "wimbledon" | "rg" | "uso" | "saga";

export const pageCourts: Record<string, Court> = {
  "/explore": "uso",
  "/saga": "saga",
  "/account": "uso",
  "/admin": "uso",
};
