import { Suspense } from "react";
import { recordBooks } from "@/lib/records";
import type { Tour } from "../../diary/library";
import { RecordsView } from "../../diary/records-ui";
import { PageTitle } from "../../page-title";
import { OpeningDiary } from "../loading-page";

/* Statistics, for one tour: the record books (app/diary/records.ts) on Explore's court. Nothing here
   depends on who's looking, so the page is built ahead of time and rebuilt as the data changes. */

export const statisticsDescription = "Records from every tour-level singles match since 2003: one-sided rivalries, title runs, winning streaks, the best seasons and plenty of oddities.";

export function StatisticsPage({ tour }: { tour: Tour }) {
  return (
    <div className="court-uso flex flex-1 flex-col">
      <section className="court-page flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <div className="mb-6">
            <PageTitle n={2}>Statistics</PageTitle>
          </div>
          <Suspense fallback={<OpeningDiary />}>
            <Books tour={tour} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Books({ tour }: { tour: Tour }) {
  // A build without the database still builds: the page says the statistics aren't available
  const books = await recordBooks(tour).catch(() => null);
  if (!books) return <p className="rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">The statistics aren&apos;t available right now. Try again in a little while.</p>;
  return <RecordsView books={books} />;
}
