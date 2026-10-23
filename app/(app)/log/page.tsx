import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { findMatch, latestPage, loadDiary, seasonRange } from "@/lib/diary";
import { MatchFinder } from "../../diary/finder";
import { LogSection } from "../../diary/log";
import { LogProvider } from "../../diary/store";
import { CourtBand } from "../../court-band";
import { StepHeading } from "../../step-heading";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";

export const metadata: Metadata = { title: "Log a match · CourtSaga" };

export default function LogPage({ searchParams }: PageProps<"/log">) {
  return (
    <div className="court-wimbledon flex flex-1 flex-col">
      <CourtBand compact>
        <StepHeading as="h1" onCourt compact n={1} verb="Write" title="Log a match" body="Find a match, rate it, and add a few words if you like." />
      </CourtBand>
      <section className="court-page flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <Log searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Log({ searchParams }: Pick<PageProps<"/log">, "searchParams">) {
  const user = await requireUser();
  const [{ m }, diary, seasons] = await Promise.all([searchParams, loadDiary(user.id), seasonRange()]);
  const wanted = typeof m === "string" ? m : null;
  // A match asked for by link that isn't logged yet opens as a new page
  const found = wanted && !diary.entries[wanted] ? await findMatch(wanted) : null;
  const rows = found ? [...diary.rows, found] : diary.rows;
  const focus = wanted && rows.some((r) => r.id === wanted) ? wanted : latestPage(diary);
  return (
    <LogProvider key={`${diary.version}:${wanted}`} mode="diary" rows={rows} entries={diary.entries} order={diary.order} focusId={focus} saver={saver}>
      <div className="space-y-8">
        <MatchFinder seasons={seasons} />
        <div id="your-log" className="scroll-mt-6">
          <LogSection />
        </div>
      </div>
    </LogProvider>
  );
}
