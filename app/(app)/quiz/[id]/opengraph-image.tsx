import { loadQuiz } from "@/lib/quiz";
import { ogCard, ogPhoto, ogSize } from "../../../og-card";
import SiteCard from "../../../opengraph-image";

/* The card a quiz's results link shows: whose score it is and the quiz's credit, beside Nadal and
   Federer at the 2009 Australian Open. A quiz still being played shows the site's own card. */

export const alt = "Tennis quiz results from CourtSaga";
export const size = ogSize;
export const contentType = "image/png";

const photo = await ogPhoto("nadal-federer-ao-2009-final.jpg");

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const quiz = await loadQuiz((await params).id).catch(() => null);
  if (!quiz?.finishedAt) return SiteCard();
  const n = (quiz.questions as unknown[]).length;
  const title = `Results: ${quiz.correct ?? 0}/${n}`;
  const titleSize = title.length > 22 ? 64 : title.length > 15 ? 78 : 92;
  return ogCard({ eyebrow: quiz.name ? `${quiz.name.toUpperCase()} · TENNIS QUIZ` : "A TENNIS QUIZ", title, titleSize, tags: ["Quiz | Results Committee"], photo, focus: "45% 30%" });
}
