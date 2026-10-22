import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { coverLines, loadDiary, sharedSagaOwner } from "@/lib/diary";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { SagaSection } from "../../diary/saga";
import { LogProvider } from "../../diary/store";
import { OpeningDiary } from "../../(app)/loading-page";
import { SagaHeader } from "../../saga-header";
import { SharedFrame } from "./frame";

/* Someone's saga, opened from a shared link: read-only, and only the saga. Shared links are kept
   out of search engines; only people who are given one can open it. */

const description = "A tennis saga, shared from CourtSaga.";

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const owner = await sharedSagaOwner((await params).slug);
  const title = owner ? `${owner.name}'s saga · CourtSaga` : "CourtSaga";
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, siteName: "CourtSaga", type: "website" } };
}

export default function SharedSagaPage({ params }: PageProps<"/s/[slug]">) {
  return (
    <SharedFrame>
      <Suspense
        fallback={
          <>
            <SagaHeader kicker="A saga, shared" title="A saga" body="Someone's tennis, read back." />
            <OpeningDiary />
          </>
        }
      >
        <Shared params={params} />
      </Suspense>
    </SharedFrame>
  );
}

async function Shared({ params }: Pick<PageProps<"/s/[slug]">, "params">) {
  const owner = await sharedSagaOwner((await params).slug);
  if (!owner) notFound();
  const diary = await loadDiary(owner.id, { records: true });
  const body = (
    <>
      {owner.name}&apos;s tennis, read back: rivalries, five-setters, calls and missed meetings. &ldquo;You&rdquo; here is {owner.name}.
    </>
  );
  return (
    <>
      <SagaHeader kicker="A saga, shared" title={`${owner.name}'s saga`} body={body} lines={coverLines(diary)} />
      <div className="mt-10">
        {diary.order.length < SAGA_MIN_MATCHES ? (
          <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg font-medium text-muted">
            This saga starts once {owner.name} has logged {SAGA_MIN_MATCHES} matches.
          </p>
        ) : (
          <LogProvider mode="shared" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records}>
            <SagaSection />
          </LogProvider>
        )}
      </div>
    </>
  );
}
