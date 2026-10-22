import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadDiary, sharedSagaOwner } from "@/lib/diary";
import { DataCredit } from "../../credits";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { SagaSection } from "../../diary/saga";
import { LogProvider } from "../../diary/store";

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
    <div className="flex flex-1 flex-col">
      <header className="hero-court bg-[var(--hc-surround)] text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden className="text-2xl leading-none">
              🎾
            </span>
            <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
          </Link>
          <Link href="/signup" className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/25 transition hover:bg-white/20">
            Sign up
          </Link>
        </div>
      </header>
      <main className="stage flex-1 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<p className="rounded-3xl border-2 border-dashed border-line p-10 text-center text-lg font-medium text-muted">Opening the saga…</p>}>
            <Shared params={params} />
          </Suspense>
        </div>
      </main>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-8">
          <DataCredit />
        </p>
      </footer>
    </div>
  );
}

async function Shared({ params }: Pick<PageProps<"/s/[slug]">, "params">) {
  const owner = await sharedSagaOwner((await params).slug);
  if (!owner) notFound();
  const diary = await loadDiary(owner.id, { records: true });
  return (
    <>
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">A saga, shared</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{owner.name}&apos;s saga</h1>
        <p className="mt-4 text-xl font-medium leading-relaxed text-muted">
          {owner.name}&apos;s tennis, read back: their rivalries, five-setters, calls and the meetings they missed. &ldquo;You&rdquo; here is {owner.name}.
        </p>
      </div>
      {diary.order.length < SAGA_MIN_MATCHES ? (
        <p className="mt-10 rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg font-medium text-muted">
          This saga starts once {owner.name} has logged {SAGA_MIN_MATCHES} matches.
        </p>
      ) : (
        <LogProvider mode="shared" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records}>
          <div className="mt-10">
            <SagaSection />
          </div>
        </LogProvider>
      )}
    </>
  );
}
