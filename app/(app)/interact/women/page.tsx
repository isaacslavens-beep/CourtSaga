import type { Metadata } from "next";
import { InteractPage, interactDescription } from "../view";

export const metadata: Metadata = {
  title: "Women's interact · CourtSaga",
  description: interactDescription,
  openGraph: { title: "Play with women's tennis numbers · CourtSaga", description: interactDescription },
};

export default function WomensInteract() {
  return <InteractPage tour="wta" />;
}
