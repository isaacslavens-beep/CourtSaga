import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBar } from "../../ui";
import { OpeningDiary } from "../loading-page";
import { QuizMaker } from "./maker";
import { QuizCredit } from "./parts";

/* The quiz: pick a tour, then type the answers. The page is the same for everyone; each quiz is drawn
   when it starts. */

const description = "A tennis quiz from every tour-level final since 2003: ten questions on who won and who lost the big finals, then share your score.";

export const metadata: Metadata = {
  title: "Quiz · CourtSaga",
  description,
  openGraph: { title: "Tennis quiz · CourtSaga", description },
};

export default function QuizPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageBar n={5} title="Quiz" />
      <section className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <QuizMaker />
          </Suspense>
          <QuizCredit />
        </div>
      </section>
    </div>
  );
}
