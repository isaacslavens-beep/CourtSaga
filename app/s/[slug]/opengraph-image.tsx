import { coverLines, loadDiary, sharedSagaOwner } from "@/lib/diary";
import { ogCard, ogPhoto, ogSize } from "../../og-card";
import SiteCard from "../../opengraph-image";

/* The card a shared saga's link shows: whose saga it is and what's in it, beside Federer's finger wag at
   Roland Garros. A link that's been turned off shows the site's own card. */

export const alt = "A tennis saga, shared from CourtSaga";
export const size = ogSize;
export const contentType = "image/png";

const photo = await ogPhoto("federer-finger-wag.jpg");

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const owner = await sharedSagaOwner((await params).slug);
  if (!owner) return SiteCard();
  const diary = await loadDiary(owner.id, { records: true });
  const title = `${owner.name}'s saga`;
  const titleSize = title.length > 22 ? 64 : title.length > 15 ? 78 : 92;
  return ogCard({ eyebrow: "A TENNIS SAGA", title, titleSize, tags: coverLines(diary), photo, focus: "50% 6%" });
}
