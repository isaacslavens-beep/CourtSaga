import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { coverLines, loadDiary, shareSlugOf } from "@/lib/diary";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { toMatches, watched } from "../../diary/library";
import { SagaSection } from "../../diary/saga";
import { AllMatches } from "../../diary/saga-list";
import { LogProvider } from "../../diary/store";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";
import { SagaHero } from "./hero";
import { ShareSaga } from "./share";

export const metadata: Metadata = { title: "Your saga · CourtSaga" };

export default function SagaPage({ searchParams }: PageProps<"/saga">) {
  return (
    <div className="saga-room flex flex-1 flex-col">
      <Suspense
        fallback={
          <>
            <SagaHero title="Your saga" lines={[]} players={[]} share={null} have={SAGA_MIN_MATCHES} need={SAGA_MIN_MATCHES} />
            <OpeningDiary />
          </>
        }
      >
        <Saga searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Saga({ searchParams }: Pick<PageProps<"/saga">, "searchParams">) {
  const user = await requireUser();
  const [{ m }, diary, slug, request] = await Promise.all([searchParams, loadDiary(user.id, { records: true }), shareSlugOf(user.id), headers()]);
  const origin = `${request.get("x-forwarded-proto") ?? "https"}://${request.get("x-forwarded-host") ?? request.get("host")}`;
  const spot = typeof m === "string" && diary.entries[m] ? { target: "story" as const, id: m, n: 1 } : null;
  const have = diary.order.length;
  const seen = Object.values(diary.entries).filter((e) => watched({ ...e, cheering: null, pick: null })).length;
  const lines = [...coverLines(diary), ...(seen ? [`${seen} watched`] : [])];
  // Who turns up most in the diary, by the names the saga calls them
  const count = new Map<string, number>();
  for (const m of Object.values(toMatches(diary.rows))) for (const p of [m.winner, m.loser]) count.set(p, (count.get(p) ?? 0) + 1);
  const players = [...count].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, n]) => ({ name, count: n }));
  return (
    <>
      <SagaHero
        title="Your saga"
        lines={lines}
        players={players}
        share={<ShareSaga slug={slug} origin={origin} />}
        have={have}
        need={SAGA_MIN_MATCHES}
      />
      <section className="flex-1 pb-20 pt-8 sm:pt-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <LogProvider key={`${diary.version}:${spot?.id}`} mode="diary" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records} spotlight={spot} saver={saver}>
            <div className="space-y-14">
              {have >= SAGA_MIN_MATCHES && (
                <div id="books" className="scroll-mt-6">
                  <SagaSection />
                </div>
              )}
              <AllMatches />
            </div>
          </LogProvider>
        </div>
      </section>
    </>
  );
}
