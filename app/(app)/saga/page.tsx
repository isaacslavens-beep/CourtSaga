import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { coverLines, loadDiary, shareSlugOf } from "@/lib/diary";
import { rivalryRecords } from "../../demos/rivalry-records";
import { sampleEntries, sampleMatches, sampleOrder } from "../../demos/sample";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { toMatches, watched } from "../../diary/library";
import { SagaSection } from "../../diary/saga";
import { AllMatches } from "../../diary/saga-list";
import { LogProvider } from "../../diary/store";
import { SectionHead } from "../../ui";
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
  const user = (await getSession())?.user;
  if (!user) return <GuestSaga />;
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

// The sample books' photos and where they're from
const photoCredits = [
  ["Rybakina, US Open 2026", "Just Women's Sports"],
  ["Alcaraz, Australian Open 2026", "ATP Tour"],
  ["Sinner at Wimbledon, 2025", "ATP Tour"],
  ["Alcaraz and Djokovic, Australian Open 2026", "Olympics.com"],
  ["Nadal and Federer, Australian Open 2009", "Tennis365"],
];

/** Signed out: the way to a saga of one's own, and three books from a sample fan's saga to open */
function GuestSaga() {
  return (
    <>
      <SagaHero title="Your saga" lines={[]} players={[]} share={null} have={0} need={SAGA_MIN_MATCHES} />
      <section className="flex-1 pb-20 pt-8 sm:pt-10">
        <div className="mx-auto w-full max-w-6xl space-y-10 px-4 sm:px-8">
          <div className="panel flex flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-muted">
              <span className="font-display text-lg font-bold text-foreground">Free, with an account.</span> Star matches in Explore and they become books like these.
            </p>
            <span className="flex shrink-0 items-center gap-4">
              <Link href="/login?next=%2Fsaga" className="font-semibold text-court underline-offset-4 hover:underline">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Sign up
              </Link>
            </span>
          </div>
          <div>
            <SectionHead title="A sample saga" body="Three books from a sample fan's saga. Open one and turn the pages." />
            <LogProvider mode="shared" matches={sampleMatches} entries={sampleEntries} order={sampleOrder} records={rivalryRecords}>
              <SagaSection only={["Alcaraz-Sinner", "Alcaraz-Djokovic", "finals"]} />
            </LogProvider>
            <p className="mt-6 text-xs leading-relaxed text-muted">
              <span className="font-semibold">Photos:</span> {photoCredits.map(([photo, source]) => `${photo} (${source})`).join(" · ")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
