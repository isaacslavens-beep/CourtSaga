import { ogCard, ogPhoto, ogSize } from "../../og-card";

/* The card a shared match shows, the same for every match: Nadal and Federer after the 2009 Australian
   Open final. The link's title says which match it is. */

export const alt = "Explore the story of any tennis match on CourtSaga";
export const size = ogSize;
export const contentType = "image/png";

const photo = await ogPhoto("nadal-federer-ao-2009-final.jpg");

export default async function Image() {
  return ogCard({ title: "The story behind any match", photo, focus: "45% 30%" });
}
