import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { coverLines, loadDiary, shareSlugOf } from "@/lib/diary";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { SagaSection } from "../../diary/saga";
import { LogProvider } from "../../diary/store";
import { SagaCover, SagaKicker } from "../../saga-cover";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";
import { ShareSaga } from "./share";

export const metadata: Metadata = { title: "Your saga · CourtSaga" };

const kicker = (
  <SagaKicker>
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-bold tracking-normal text-[#0b0d12] ring-1 ring-black/10">3</span>
    Read back
  </SagaKicker>
);
const body = "Your matches, read back to you. It builds itself from what you log and rank: your rivalries, your five-setters, the calls you got right, and the meetings you missed.";

export default function SagaPage({ searchParams }: PageProps<"/saga">) {
  return (
    <div className="court-saga flex flex-1 flex-col">
      <section className="stage stage-plain flex-1 pb-16 pt-8 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense
            fallback={
              <>
                <SagaCover kicker={kicker} title="Your saga" body={body} />
                <OpeningDiary />
              </>
            }
          >
            <Saga searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Saga({ searchParams }: Pick<PageProps<"/saga">, "searchParams">) {
  const user = await requireUser();
  const [{ m }, diary, slug, request] = await Promise.all([searchParams, loadDiary(user.id, { records: true }), shareSlugOf(user.id), headers()]);
  const origin = `${request.get("x-forwarded-proto") ?? "https"}://${request.get("x-forwarded-host") ?? request.get("host")}`;
  const spot = typeof m === "string" && diary.entries[m] ? { target: "story" as const, id: m, n: 1 } : null;
  const enough = diary.order.length >= SAGA_MIN_MATCHES;
  return (
    <>
      <SagaCover kicker={kicker} title="Your saga" body={body} lines={coverLines(diary)} />
      <div className="mt-8 space-y-10">
        {enough && <ShareSaga slug={slug} origin={origin} />}
        <LogProvider key={`${diary.version}:${spot?.id}`} mode="diary" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records} spotlight={spot} saver={saver}>
          <SagaSection />
        </LogProvider>
      </div>
      {!enough && (
        <p className="mt-4 text-center text-muted">
          {diary.order.length === 1 ? "1 match" : `${diary.order.length} matches`} so far.{" "}
          <Link href="/log" className="font-semibold text-court underline underline-offset-4">
            Log a match
          </Link>
        </p>
      )}
    </>
  );
}
