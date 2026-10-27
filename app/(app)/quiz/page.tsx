import type { Metadata } from "next";
import { Suspense } from "react";
import { quizPlayers } from "@/lib/quiz";
import { PageBar } from "../../ui";
import { OpeningDiary } from "../loading-page";
import { QuizMaker } from "./maker";

/* The quiz: pick how hard and what about, then type the answers. Nothing here depends on who's looking,
   so the page is built ahead of time; each quiz is drawn when it starts. */

const description = "A tennis quiz from every tour-level match since 2003: type the champions, the years and the records, from easy to extreme, then share your score.";

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
            <Maker />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Maker() {
  // A build without the database still builds: the page says the quiz isn't available
  const data = await quizPlayers().catch(() => null);
  if (!data) return <p className="rounded border border-fault/30 bg-fault/5 px-4 py-3 font-medium text-fault">The quiz isn&apos;t available right now. Try again in a little while.</p>;
  return <QuizMaker players={data.players} from={data.from} to={data.to} />;
}
