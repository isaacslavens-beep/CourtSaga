import type { Metadata } from "next";
import { StatisticsPage, statisticsDescription } from "../view";

export const metadata: Metadata = {
  title: "Women's statistics · CourtSaga",
  description: statisticsDescription,
  openGraph: { title: "Women's tennis statistics · CourtSaga", description: statisticsDescription },
};

export default function WomensStatistics() {
  return <StatisticsPage tour="wta" />;
}
