import { STIX_Two_Text } from "next/font/google";
import { Suspense } from "react";
import { interactModels } from "@/lib/models";
import type { Tour } from "../../diary/library";
import { InteractView } from "../../diary/models-ui";
import { CourtBand } from "../../court-band";
import { StepHeading } from "../../step-heading";
import { OpeningDiary } from "../loading-page";

/* Interact, for one tour: the models (app/diary/models.ts) on Roland Garros's clay. Nothing here depends
   on who's looking, so the page is built ahead of time and rebuilt as the data changes. */

// The models' formulas are set in a maths face, loaded only here
const mathFace = STIX_Two_Text({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-math", preload: false });

export const interactDescription = "Play with models fitted to every tour-level singles match since 2003: upset odds, ratings across eras, serving, play under pressure, ages and match lengths.";

export function InteractPage({ tour }: { tour: Tour }) {
  return (
    <div className={`court-rg flex flex-1 flex-col ${mathFace.variable}`}>
      <CourtBand compact>
        <StepHeading
          as="h1"
          onCourt
          compact
          n={4}
          verb="Play with"
          title="Interact"
          body="Move the numbers and watch the answer change. Every model says what it was built from and how often it's right."
        />
      </CourtBand>
      <section className="court-page flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <Models tour={tour} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Models({ tour }: { tour: Tour }) {
  // A build without the database still builds: the page says the models aren't available
  const models = await interactModels(tour).catch(() => null);
  if (!models) return <p className="rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">The models aren&apos;t available right now. Try again in a little while.</p>;
  return <InteractView books={models} />;
}
