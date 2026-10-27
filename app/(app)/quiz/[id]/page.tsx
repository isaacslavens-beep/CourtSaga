import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadQuiz, standing, type KeptQuiz } from "@/lib/quiz";
import { levelNames, type Level } from "../../../diary/quiz";
import type { Tour } from "../../../diary/library";
import { Chevron, PageBar, StatBox } from "../../../ui";
import { OpeningDiary } from "../../loading-page";
import { describe, difficultyName, LevelTag, QuizCredit } from "../parts";
import { asked, OWNER_COOKIE, tourQuery, type QuizAnswer, type StoredQuestion } from "../shared";
import { PlayQuiz } from "./play";
import { ShareResults, TakeSame } from "./share";

/* One quiz: while it's being taken, the questions one at a time (for the browser taking it); once it's
   finished, the results for anyone with the link: the score, how it compares, and every question with
   what was typed and the answer. */

type Kept = { tours: Tour[]; challenge?: string };

const score = (q: KeptQuiz) => `${q.correct ?? 0}/${(q.questions as unknown[]).length}`;
const headline = (q: KeptQuiz) => {
  const level = difficultyName(q.difficulty);
  return `${q.name ? `${q.name}: ` : ""}${score(q)} on a ${level ? `${level.toLowerCase()} ` : ""}tennis quiz`;
};

export async function generateMetadata({ params }: PageProps<"/quiz/[id]">): Promise<Metadata> {
  const quiz = await loadQuiz((await params).id).catch(() => null);
  const title = quiz?.finishedAt ? `${headline(quiz)} · CourtSaga` : "Quiz · CourtSaga";
  const description = "A tennis quiz from every tour-level match since 2003. Typed answers only: think you can beat it?";
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, siteName: "CourtSaga", type: "website" } };
}

export default function QuizRun({ params }: PageProps<"/quiz/[id]">) {
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
        <Run params={params} />
      </Suspense>
    </div>
  );
}

async function Run({ params }: Pick<PageProps<"/quiz/[id]">, "params">) {
  const [{ id }, jar] = await Promise.all([params, cookies()]);
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
  return <Results quiz={quiz} mine={mine} about={about} settings={settings} />;
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
        title={quiz.name ? `${quiz.name}'s quiz` : "Quiz results"}
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
        <span className="text-sm text-muted">{about}</span>
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
                return (
                  <li key={q.id} className="flex gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
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
                  <Link href={`/quiz/${rivalDone.id}`} className="block">
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
