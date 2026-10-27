import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { coverLines, loadDiary, shareSlugOf } from "@/lib/diary";
import { sampleLog, sampleMatches } from "../../demos/sample";
import { TournamentLabel } from "../../match-ui";
import { SAGA_MIN_MATCHES } from "../../diary/books";
import { Avatar, BallScore } from "../../diary/fun";
import { eventLabel, scoreText, toMatches, watched } from "../../diary/library";
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

// Two matches from the sample log, as a saga lists them once starred
const examples = ["wim23", "uso22"].map((id) => ({ m: sampleMatches[id], fan: sampleLog[id] }));

const steps = [
  ["Star a match", "Find any match since 2003 in Explore and star it, then mark it watched if it was."],
  ["Rate it and note it", "One to five balls, and a line on how it felt: where, who with, what stuck."],
  [`At ${SAGA_MIN_MATCHES} matches, books`, "The saga sorts the matches into books: each rivalry followed, every final seen, each season, with the story of how they connect."],
];

/** Signed out: two sample matches the way a saga keeps them, and how starring builds one */
function GuestSaga() {
  return (
    <>
      <SagaHero title="Your saga" lines={[]} players={[]} share={null} have={0} need={SAGA_MIN_MATCHES} />
      <section className="flex-1 pb-20 pt-8 sm:pt-10">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="panel self-start">
            <div className="panel-head">
              <h2 className="panel-title">Two logged matches</h2>
              <span className="panel-meta">A sample</span>
            </div>
            <ul className="divide-y divide-line">
              {examples.map(({ m, fan }) => (
                <li key={m.id} className="flex gap-3 px-4 py-4 sm:px-5">
                  <span className="flex shrink-0 -space-x-2 max-sm:hidden">
                    <Avatar name={m.winner} size="h-9 w-9 text-xs ring-2 ring-surface" />
                    <Avatar name={m.loser} size="h-9 w-9 text-xs ring-2 ring-surface" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TournamentLabel event={eventLabel(m)} surface={m.surface} logo="h-5 w-5" className="text-sm" />
                      <BallScore value={fan.rating} size="xs" />
                    </div>
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>{" "}
                      <span className="whitespace-nowrap text-xs tabular-nums text-muted">{scoreText(m.score)}</span>
                    </p>
                    <p className="mt-2 border-l-2 border-line pl-3 text-[0.9375rem] leading-snug">{fan.note}</p>
                    <p className="mt-1 text-xs text-muted">
                      Watched on {fan.watchedOn}
                      {fan.cheering && ` · cheering for ${fan.cheering}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="panel self-start">
            <div className="panel-head">
              <h2 className="panel-title">How a saga builds</h2>
            </div>
            <ol className="panel-body space-y-4">
              {steps.map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="step h-6 w-6 shrink-0 text-xs">{i + 1}</span>
                  <p className="text-sm leading-snug text-muted">
                    <strong className="block text-foreground">{title}</strong>
                    {body}
                  </p>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-3 sm:px-5">
              <Link href="/signup" className="btn btn-primary">
                Sign up, free
              </Link>
              <Link href="/login?next=%2Fsaga" className="font-semibold text-court underline-offset-4 hover:underline">
                Log in
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
