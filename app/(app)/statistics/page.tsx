import type { Metadata } from "next";
import { StatisticsPage, statisticsDescription } from "./view";

export const metadata: Metadata = {
  title: "Statistics · CourtSaga",
  description: statisticsDescription,
  openGraph: { title: "Tennis statistics · CourtSaga", description: statisticsDescription },
};

export default function MensStatistics() {
  return <StatisticsPage tour="atp" />;
}
