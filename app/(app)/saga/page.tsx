import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDiary, shareSlugOf } from "@/lib/diary";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { SagaSection } from "../../diary/saga";
import { LogProvider } from "../../diary/store";
import { StepHeading } from "../../step-heading";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";
import { ShareSaga } from "./share";

export const metadata: Metadata = { title: "Your saga · CourtSaga" };

export default function SagaPage({ searchParams }: PageProps<"/saga">) {
  return (
    <section className="stage flex-1 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
        <StepHeading
          as="h1"
          n={3}
          verb="Read back"
          title="Your saga"
          body="Your matches, read back to you. It builds itself from the matches you log: your rivalries, your five-setters, the calls you got right, and the meetings you missed."
        />
        <Suspense fallback={<OpeningDiary />}>
          <Saga searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
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
      {enough && <ShareSaga slug={slug} origin={origin} />}
      <LogProvider key={`${diary.version}:${spot?.id}`} mode="diary" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records} spotlight={spot} saver={saver}>
        <div className="mt-10">
          <SagaSection />
        </div>
      </LogProvider>
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
