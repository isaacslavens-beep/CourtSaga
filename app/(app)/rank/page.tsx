import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDiary } from "@/lib/diary";
import { RankSection } from "../../diary/rank";
import { LogProvider } from "../../diary/store";
import { StepHeading } from "../../step-heading";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";

export const metadata: Metadata = { title: "Rank your favourites · CourtSaga" };

export default function RankPage({ searchParams }: PageProps<"/rank">) {
  return (
    <section className="flex-1 bg-surface/60 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
        <StepHeading as="h1" n={2} verb="Sort" title="Rank your favourites" body="Your best matches at each tournament, in your own order." />
        <Suspense fallback={<OpeningDiary />}>
          <Ranking searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Ranking({ searchParams }: Pick<PageProps<"/rank">, "searchParams">) {
  const user = await requireUser();
  const [{ m }, diary] = await Promise.all([searchParams, loadDiary(user.id)]);
  if (!diary.order.length)
    return (
      <p className="mt-10 rounded-3xl border-2 border-dashed border-line p-10 text-center text-lg font-medium text-muted">
        Nothing to rank yet.{" "}
        <Link href="/log" className="font-semibold text-court underline underline-offset-4">
          Log a match
        </Link>{" "}
        and it lines up here.
      </p>
    );
  const spot = typeof m === "string" && diary.entries[m] ? { target: "rank" as const, id: m, n: 1 } : null;
  return (
    <LogProvider key={`${diary.version}:${spot?.id}`} mode="diary" rows={diary.rows} entries={diary.entries} order={diary.order} spotlight={spot} saver={saver}>
      <div className="mt-10">
        <RankSection />
      </div>
    </LogProvider>
  );
}
