import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { loadQuiz, standing, takenBy, type KeptQuiz } from "@/lib/quiz";
import { levelNames, type Level } from "../../../diary/quiz";
import type { Tour } from "../../../diary/library";
import { Chevron, PageBar, StatBox } from "../../../ui";
import { OpeningDiary } from "../../loading-page";
import { describe, difficultyName, eventColour, LevelTag, QuizCredit } from "../parts";
import { asked, OWNER_COOKIE, tourQuery, type QuizAnswer, type StoredQuestion } from "../shared";
import { PlayQuiz } from "./play";
import { ShareResults, TakeSame } from "./share";

/* One quiz: while it's being taken, the questions one at a time (for the browser taking it); once it's
   finished, the results for anyone with the link: the score, how it compares, and every question with
   what was typed and the answer. */

type Kept = { tours: Tour[]; challenge?: string };

const score = (q: KeptQuiz) => `${q.correct ?? 0}/${(q.questions as unknown[]).length}`;
/** What a shared link says: "Results: 6/10", with whose they are if there's a name on them */
const headline = (q: KeptQuiz) => `Results: ${q.name ? `${q.name}, ` : ""}${score(q)}`;

export async function generateMetadata({ params }: PageProps<"/quiz/[id]">): Promise<Metadata> {
  const quiz = await loadQuiz((await params).id).catch(() => null);
  const title = quiz?.finishedAt ? headline(quiz) : "Quiz · CourtSaga";
  // What a link preview says under the card, which already shows the score
  const preview = "Quiz | Results Committee";
  return {
    title,
    description: preview,
    robots: { index: false, follow: false },
    openGraph: { title: preview, description: preview, siteName: "CourtSaga", type: "website" },
    twitter: { card: "summary_large_image", title: preview, description: preview },
  };
}

export default function QuizRun({ params, searchParams }: PageProps<"/quiz/[id]">) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <>
            <PageBar n={5} title="Quiz" />
            <OpeningDiary />
          </>
        }
      >
        <Run params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Run({ params, searchParams }: PageProps<"/quiz/[id]">) {
  const [{ id }, { answers }, jar] = await Promise.all([params, searchParams, cookies()]);
  const quiz = await loadQuiz(id);
  if (!quiz) notFound();
  const mine = jar.get(OWNER_COOKIE)?.value === quiz.owner;
  const settings = quiz.settings as Kept;
  const about = describe(settings, quiz.difficulty);
  const questions = quiz.questions as StoredQuestion[];

  if (!quiz.finishedAt) {
    if (mine) return <PlayQuiz id={quiz.id} questions={questions.map(asked)} answered={quiz.answers as QuizAnswer[]} about={about} />;
    return (
      <>
        <PageBar n={5} title="Quiz" />
        <section className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-8">
          <div className="panel panel-body">
            <p className="text-lg font-medium">This quiz is still being played. Its results show here once it&apos;s finished.</p>
            <Link href="/quiz" className="btn btn-primary mt-4">
              Make a quiz of your own
            </Link>
          </div>
          <QuizCredit />
        </section>
      </>
    );
  }
  // Someone else's results from a shared link: the same questions to take first, and the answers only once
  // they're taken (or asked for)
  if (!mine && answers === undefined) {
    const own = await takenBy(jar.get(OWNER_COOKIE)?.value, quiz.id);
    if (!own) return <Challenge quiz={quiz} about={about} />;
    if (!own.finishedAt) redirect(`/quiz/${own.id}`);
  }
  return <Results quiz={quiz} mine={mine} about={about} settings={settings} />;
}

/** A shared quiz before it's been taken: the score to beat, and the same questions, with no answers shown */
function Challenge({ quiz, about }: { quiz: KeptQuiz; about: string }) {
  const n = (quiz.questions as unknown[]).length;
  return (
    <>
      <PageBar n={5} title={`Results: ${score(quiz)}`}>
        <span className="text-sm text-muted">
          {quiz.name && <strong className="font-semibold text-foreground">{quiz.name} · </strong>}
          {about}
        </span>
      </PageBar>
      <section className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-8">
        <div className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Can you beat {score(quiz)}?</h2>
            <span className="panel-meta">The same {n} questions</span>
          </div>
          <div className="panel-body space-y-4">
            <p className="text-[0.9375rem] leading-snug">
              {quiz.name ? `${quiz.name} got ${quiz.correct ?? 0} of ${n}.` : `This quiz scored ${quiz.correct ?? 0} of ${n}.`} Take the same questions first: the answers show once
              they&apos;re done, side by side with this score. No account needed.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <TakeSame id={quiz.id} />
              <Link href={`/quiz/${quiz.id}?answers`} className="text-sm font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline">
                Just show the answers
              </Link>
            </div>
          </div>
        </div>
        <QuizCredit />
      </section>
    </>
  );
}

async function Results({ quiz, mine, about, settings }: { quiz: KeptQuiz; mine: boolean; about: string; settings: Kept }) {
  const questions = quiz.questions as StoredQuestion[];
  const answers = quiz.answers as QuizAnswer[];
  const [better, rival, request] = await Promise.all([standing(quiz), settings.challenge ? loadQuiz(settings.challenge) : null, headers()]);
  const origin = `${request.get("x-forwarded-proto") ?? "https"}://${request.get("x-forwarded-host") ?? request.get("host")}`;
  // Right answers at each level, for the levels the quiz had
  const byLevel = ([1, 2, 3, 4] as Level[])
    .map((l) => ({ l, n: questions.filter((q) => q.level === l).length, right: questions.filter((q, i) => q.level === l && answers[i]?.right).length }))
    .filter((x) => x.n);
  const again = `/quiz?${tourQuery(settings.tours)}`;
  const rivalDone = rival?.finishedAt ? rival : null;

  return (
    <>
      <PageBar
        n={5}
        title={`Results: ${score(quiz)}`}
        foot={
          <div className="flex flex-wrap gap-2">
            <StatBox label="Score" value={score(quiz)} className="min-w-24" />
            {difficultyName(quiz.difficulty) && <StatBox label="Difficulty" value={difficultyName(quiz.difficulty)} className="min-w-24" />}
            {better !== null && <StatBox label={`Better than, of ${difficultyName(quiz.difficulty)?.toLowerCase() ?? "all"} quizzes`} value={`${better}%`} className="min-w-24" />}
            {byLevel.map((x) => (
              <StatBox key={x.l} label={levelNames[x.l]} value={`${x.right}/${x.n}`} className="min-w-20" />
            ))}
          </div>
        }
      >
        <span className="text-sm text-muted">
          {quiz.name && <strong className="font-semibold text-foreground">{quiz.name} · </strong>}
          {about}
        </span>
      </PageBar>

      <section className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="panel lg:order-1">
            <div className="panel-head">
              <h2 className="panel-title">Every question</h2>
              <span className="panel-meta">What was typed, and the answer</span>
            </div>
            <ol>
              {questions.map((q, i) => {
                const a = answers[i];
                const answer = q.answer.kind === "name" ? q.answer.text : String(q.answer.value);
                const colour = eventColour(q.events?.[0]);
                return (
                  <li key={q.id} className="flex gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:px-5" style={colour ? { boxShadow: `inset 3px 0 0 ${colour}` } : undefined}>
                    <span className={`stat mt-0.5 w-7 shrink-0 text-lg ${a?.right ? "text-grass" : "text-fault"}`} aria-label={a?.right ? "Right" : "Wrong"}>
                      {a?.right ? "✓" : "✗"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="stat text-sm text-muted">{i + 1}</span>
                        <LevelTag level={q.level} />
                      </div>
                      <p className="mt-1 font-semibold leading-snug">{q.prompt}</p>
                      <p className="mt-1">
                        {a?.right ? (
                          <strong className="text-grass">{answer}</strong>
                        ) : (
                          <>
                            {a?.typed ? <span className="text-muted line-through">{a.typed}</span> : <span className="text-muted">Didn&apos;t know</span>}
                            <span className="text-muted"> · </span>
                            <strong>{answer}</strong>
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-sm leading-snug text-muted">
                        {q.fact}{" "}
                        {q.go && (
                          <Link href={`/explore?m=${encodeURIComponent(q.go)}`} className="font-semibold text-court underline-offset-4 hover:underline">
                            The match
                          </Link>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="space-y-6 lg:order-2">
            {rivalDone && (
              <div className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Head to head</h2>
                  <span className="panel-meta">The same questions</span>
                </div>
                <div className="panel-body grid grid-cols-2 gap-2">
                  <StatBox label={quiz.name ?? "This quiz"} value={score(quiz)} />
                  <Link href={`/quiz/${rivalDone.id}?answers`} className="block">
                    <StatBox label={rivalDone.name ?? "The original"} value={score(rivalDone)} className="hover:border-foreground" />
                  </Link>
                </div>
              </div>
            )}
            {mine ? (
              <div className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Share it</h2>
                </div>
                <div className="panel-body space-y-4">
                  <p className="text-sm leading-snug text-muted">Anyone with the link sees the score and every answer, and can take the same questions to see who knows more.</p>
                  <ShareResults id={quiz.id} origin={origin} name={quiz.name} text={headline(quiz)} />
                  <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-sm font-semibold">
                    <Link href={again} className="inline-flex items-center gap-1 text-court underline-offset-4 hover:underline">
                      Another quiz <Chevron />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Know more?</h2>
                </div>
                <div className="panel-body space-y-4">
                  <p className="text-sm leading-snug text-muted">Take the same {questions.length} questions and compare, or make a quiz of your own. No account needed.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <TakeSame id={quiz.id} />
                    <Link href={again} className="btn btn-secondary">
                      A new quiz
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
        <QuizCredit />
      </section>
    </>
  );
}
