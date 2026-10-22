// Which Slam's court each page of the diary is drawn on (see .court-* in globals.css). The header reads it
// too, so it sits on the same surround as the court below it.
export type Court = "ao" | "wimbledon" | "rg" | "uso";

export const pageCourts: Record<string, Court> = {
  "/log": "ao",
  "/rank": "wimbledon",
  "/saga": "rg",
  "/account": "uso",
};
