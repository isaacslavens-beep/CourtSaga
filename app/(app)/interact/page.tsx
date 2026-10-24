import type { Metadata } from "next";
import { InteractPage, interactDescription } from "./view";

export const metadata: Metadata = {
  title: "Interact · CourtSaga",
  description: interactDescription,
  openGraph: { title: "Play with tennis numbers · CourtSaga", description: interactDescription },
};

export default function MensInteract() {
  return <InteractPage tour="atp" />;
}
