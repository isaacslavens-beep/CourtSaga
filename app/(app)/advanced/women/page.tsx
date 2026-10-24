import type { Metadata } from "next";
import { AdvancedPage, advancedDescription } from "../view";

export const metadata: Metadata = {
  title: "Women's advanced · CourtSaga",
  description: advancedDescription,
  openGraph: { title: "Play with women's tennis numbers · CourtSaga", description: advancedDescription },
};

export default function WomensAdvanced() {
  return <AdvancedPage tour="wta" />;
}
