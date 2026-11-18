import type { Metadata } from "next";
import { MatchesPage, matchesDescription } from "./view";

export const metadata: Metadata = {
  title: "Matches · CourtSaga",
  description: matchesDescription,
  openGraph: { title: "Every tennis match since 2003 · CourtSaga", description: matchesDescription },
};

export default function MensMatches() {
  return <MatchesPage tour="atp" />;
}
