import type { Metadata } from "next";
import { MatchesPage, matchesDescription } from "../view";

export const metadata: Metadata = {
  title: "Women's matches · CourtSaga",
  description: matchesDescription,
  openGraph: { title: "Every women's tennis match since 2003 · CourtSaga", description: matchesDescription },
};

export default function WomensMatches() {
  return <MatchesPage tour="wta" />;
}
