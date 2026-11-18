import { STIX_Two_Text } from "next/font/google";
import { Suspense } from "react";
import { recordBooks } from "@/lib/records";
import type { Tour } from "../../diary/library";
import { StatisticsView } from "../../diary/records-ui";
import { TourSwitch } from "../../tour-switch";
import { PageBar } from "../../ui";
import { OpeningDiary } from "../loading-page";

/* Statistics, for one tour: the record books (app/diary/records.ts), then the top 10 at any moment and the
   models (app/diary/models.ts), which the browser fetches when one of their chapters is opened. Nothing
   here depends on who's looking, so the page is built ahead of time and rebuilt as the data changes. */

// The models' formulas are set in a maths face, fetched only when one is shown
const mathFace = STIX_Two_Text({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-math", preload: false });

export const statisticsDescription =
  "Records from every tour-level singles match since 2003, the top 10 at any moment, and models to play with: ratings across eras, serving, play under pressure and ages.";

export function StatisticsPage({ tour }: { tour: Tour }) {
  return (
    <div className={`flex flex-1 flex-col ${mathFace.variable}`}>
      <PageBar n={3} title="Statistics">
        <TourSwitch tour={tour} men="/statistics" women="/statistics/women" />
      </PageBar>
      <section className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
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
  if (!books) return <p className="rounded border border-fault/30 bg-fault/5 px-4 py-3 font-medium text-fault">The statistics aren&apos;t available right now. Try again in a little while.</p>;
  return <StatisticsView books={books} />;
}
