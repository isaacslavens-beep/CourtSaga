import type { Metadata } from "next";
import { Moved } from "./moved";

export const metadata: Metadata = { title: "Statistics · CourtSaga", robots: { index: false } };

export default function MensAdvanced() {
  return <Moved to="/statistics" />;
}
