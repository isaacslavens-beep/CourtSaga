import type { Metadata } from "next";
import { AdvancedPage, advancedDescription } from "./view";

export const metadata: Metadata = {
  title: "Advanced · CourtSaga",
  description: advancedDescription,
  openGraph: { title: "Play with tennis numbers · CourtSaga", description: advancedDescription },
};

export default function MensAdvanced() {
  return <AdvancedPage tour="atp" />;
}
