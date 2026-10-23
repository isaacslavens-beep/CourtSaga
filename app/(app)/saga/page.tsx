import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { coverLines, loadDiary, shareSlugOf } from "@/lib/diary";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { SagaSection } from "../../diary/saga";
import { AllMatches } from "../../diary/saga-list";
import { LogProvider } from "../../diary/store";
import { SagaHeader } from "../../saga-header";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";
import { ShareSaga } from "./share";

export const metadata: Metadata = { title: "Your saga · CourtSaga" };

const body = "Your matches, turned into a story. Automatically built from the matches you star: look through your tennis Saga anytime or share it with friends.";

export default function SagaPage({ searchParams }: PageProps<"/saga">) {
  return (
    <div className="court-saga saga-room flex flex-1 flex-col">
      <section className="flex-1 pb-20 pt-10 sm:pt-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense
            fallback={
              <>
                <SagaHeader step={2} kicker="Read back" title="Your saga" body={body} />
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
      <SagaHeader step={2} kicker="Read back" title="Your saga" body={body} lines={coverLines(diary)} />
      <div className="mt-10 space-y-12">
        {enough && <ShareSaga slug={slug} origin={origin} />}
        <LogProvider key={`${diary.version}:${spot?.id}`} mode="diary" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records} spotlight={spot} saver={saver}>
          <div className="space-y-12">
            <AllMatches />
            <SagaSection />
          </div>
        </LogProvider>
      </div>
      {!enough && (
        <p className="mt-4 text-center text-muted">
          {diary.order.length === 1 ? "1 match" : `${diary.order.length} matches`} so far.{" "}
          <Link href="/explore" className="font-semibold text-court underline underline-offset-4">
            Find a match to star
          </Link>
        </p>
      )}
    </>
  );
}
