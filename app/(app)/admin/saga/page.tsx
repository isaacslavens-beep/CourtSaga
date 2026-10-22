import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { accountName, isAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { coverLines, loadDiary } from "@/lib/diary";
import { SAGA_MIN_MATCHES } from "../../../diary/books";
import { SagaSection } from "../../../diary/saga";
import { LogProvider } from "../../../diary/store";
import { SagaHeader } from "../../../saga-header";
import { OpeningDiary } from "../../loading-page";

export const metadata: Metadata = { title: "A saga · CourtSaga", robots: { index: false } };

// Anyone's saga, shared or not, read-only as a share link shows it. A 404 for everyone but the admin.
// Every saga is the same route, so the provider is keyed by account or it keeps the last one it showed.
export default function AdminSagaPage({ searchParams }: PageProps<"/admin/saga">) {
  return (
    <div className="court-saga saga-room flex flex-1 flex-col">
      <section className="flex-1 pb-20 pt-10 sm:pt-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <Saga searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Saga({ searchParams }: Pick<PageProps<"/admin/saga">, "searchParams">) {
  const me = await requireUser();
  if (!isAdmin(me.email)) notFound();
  const { id } = await searchParams;
  const owner = typeof id === "string" ? await accountName(id) : null;
  if (!owner) notFound();
  const diary = await loadDiary(owner.id, { records: true });
  return (
    <>
      <SagaHeader kicker="Admin" title={`${owner.name}'s saga`} body={<>&ldquo;You&rdquo; here is {owner.name}.</>} lines={coverLines(diary)} />
      <div className="mt-10">
        {diary.order.length < SAGA_MIN_MATCHES ? (
          <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg font-medium text-muted">
            {diary.order.length === 1 ? "1 match" : `${diary.order.length} matches`} logged. The saga starts at {SAGA_MIN_MATCHES}.
          </p>
        ) : (
          <LogProvider key={owner.id} mode="shared" rows={diary.rows} entries={diary.entries} order={diary.order} records={diary.records}>
            <SagaSection />
          </LogProvider>
        )}
      </div>
    </>
  );
}
