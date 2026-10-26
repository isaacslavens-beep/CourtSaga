import { ogCard, ogPhoto, ogSize } from "./og-card";

/* The card a shared link shows: the line about the site beside Alcaraz and Nadal at the Paris Olympics. */

export const alt = "CourtSaga: explore and track the story of tennis";
export const size = ogSize;
export const contentType = "image/png";

const photo = await ogPhoto("alcaraz-nadal-paris-2024.jpg");

export default async function Image() {
  return ogCard({ title: "Explore and track the story of tennis", photo, focus: "62% 30%" });
}
