import type { Metadata } from "next";
import { Moved } from "../moved";

export const metadata: Metadata = { title: "Women's statistics · CourtSaga", robots: { index: false } };

export default function WomensAdvanced() {
  return <Moved to="/statistics/women" />;
}
