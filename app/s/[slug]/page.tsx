import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadDiary, sharedSagaOwner } from "@/lib/diary";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { SagaSection } from "../../diary/saga";
import { LogProvider } from "../../diary/store";
import { OpeningDiary } from "../../(app)/loading-page";
import { SharedFrame, SharedHeading } from "./frame";

/* Someone's saga, opened from the link they shared: read-only, and only the saga. Shared links are kept
   out of search engines; only people who are given one can open it. */

const description = "A tennis saga, shared from CourtSaga.";

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const owner = await sharedSagaOwner((await params).slug);
  const title = owner ? `${owner.name}'s saga · CourtSaga` : "CourtSaga";
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, siteName: "CourtSaga", type: "website" } };
}

export default function SharedSagaPage({ params }: PageProps<"/s/[slug]">) {
  return (
    <SharedFrame
      heading={
        <Suspense fallback={<SharedHeading title="A saga" />}>
          <Heading params={params} />
        </Suspense>
      }
    >
      <Suspense fallback={<OpeningDiary />}>
        <Shared params={params} />
      </Suspense>
    </SharedFrame>
  );
}

async function Heading({ params }: Pick<PageProps<"/s/[slug]">, "params">) {
  const owner = await sharedSagaOwner((await params).slug);
  if (!owner) return <SharedHeading title="A saga" />;
  return (
    <SharedHeading
      title={`${owner.name}'s saga`}
      body={
        <>
          {owner.name}&apos;s tennis, read back: their rivalries, five-setters, calls and the meetings they missed. &ldquo;You&rdquo; here is {owner.name}.
        </>
      }
    />
  );
}

async function Shared({ params }: Pick<PageProps<"/s/[slug]">, "params">) {
  const owner = await sharedSagaOwner((await params).slug);
  if (!owner) notFound();
  const diary = await loadDiary(owner.id, { records: true });
  if (diary.order.length < SAGA_MIN_MATCHES)
    return (
      <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg font-medium text-muted">
        This saga starts once {owner.name} has logged {SAGA_MIN_MATCHES} matches.
      </p>
    );
  return (
    <LogProvider mode="shared" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records}>
      <SagaSection />
    </LogProvider>
  );
}
