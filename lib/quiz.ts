import "server-only";
import { and, count, eq, isNotNull, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { quizzes } from "@/db/schema";
import { answeredBy, buildQuestions, findPlayers, type QuestionBank } from "@/app/diary/quiz";
import { bigEvents, slams } from "@/app/diary/library";
import type { Tour } from "@/app/diary/library";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { recordBooks } from "./records";
import { readTour } from "./tour-data";

// The quiz's questions (app/diary/quiz.ts), from the same matches as the record books, and from the
// books themselves. Each build writes them to a file (scripts/quiz-bank.ts), so a new server reads them
// in a moment; without the file they're worked out from the database. Like the books, they only change
// when matches are imported, so they're cached for days.

/** Every question for one tour, or null if the match data can't be read. */
export async function questionBank(tour: Tour): Promise<QuestionBank | null> {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const built = await readFile(join(process.cwd(), "assets", "quiz", `${tour}.json`), "utf8").catch(() => null);
  if (built) return JSON.parse(built) as QuestionBank;
  const [data, books] = await Promise.all([readTour(getDb(), tour), recordBooks(tour)]);
  return data && buildQuestions({ ...data, books });
}

export type QuizPick = { key: string; name: string; tour: Tour; questions: number };
/** A tournament a quiz can be on: the Slams, the big events (one choice may cover a few of the data's names), then the rest */
export type QuizEvent = { key: string; label: string; events: string[]; group: "slam" | "big" | "other"; questions: number; tours: Tour[] };

/** What a quiz can be about: the players with enough questions to fill one, and the tournaments, most first */
export async function quizPlayers(): Promise<{ players: QuizPick[]; tournaments: QuizEvent[]; from: number; to: number } | null> {
  "use cache";
  cacheLife("days");
  cacheTag("matches");
  const banks = (await Promise.all((["atp", "wta"] as const).map(questionBank))).filter((b) => b !== null);
  if (!banks.length) return null;
  const players = banks.flatMap((bank) => {
    const count = new Map<string, number>();
    for (const q of bank.questions) for (const key of new Set(q.about)) if (!answeredBy(q, key)) count.set(key, (count.get(key) ?? 0) + 1);
    return bank.players.filter((p) => (count.get(p.key) ?? 0) >= 5).map((p) => ({ key: p.key, name: p.name, tour: bank.tour, questions: count.get(p.key)! }));
  });
  const perEvent = new Map<string, number>();
  const toursOf = new Map<string, Set<Tour>>();
  for (const q of banks.flatMap((b) => b.questions))
    for (const e of q.events) {
      perEvent.set(e, (perEvent.get(e) ?? 0) + 1);
      toursOf.set(e, (toursOf.get(e) ?? new Set<Tour>()).add(q.tour));
    }
  const count = (events: string[]) => events.reduce((n, e) => n + (perEvent.get(e) ?? 0), 0);
  // The tours that have questions about an event
  const tours = (events: string[]) => (["atp", "wta"] as const).filter((t) => events.some((e) => toursOf.get(e)?.has(t)));
  const taken = new Set<string>(slams);
  const big = new Map<string, QuizEvent>();
  for (const b of bigEvents) {
    const cur = big.get(b.label) ?? { key: b.key, label: b.label, events: [], group: "big" as const, questions: 0, tours: [] };
    cur.events = [...new Set([...cur.events, ...b.events])];
    big.set(b.label, cur);
    b.events.forEach((e) => taken.add(e));
  }
  const tournaments: QuizEvent[] = [
    ...slams.map((e) => ({ key: e, label: e, events: [e], group: "slam" as const, questions: count([e]), tours: tours([e]) })),
    ...[...big.values()].map((t) => ({ ...t, questions: count(t.events), tours: tours(t.events) })).filter((t) => t.questions),
    ...[...perEvent]
      .filter(([e, n]) => !taken.has(e) && n >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([e, n]) => ({ key: e, label: e, events: [e], group: "other" as const, questions: n, tours: tours([e]) })),
  ];
  return { players: players.sort((a, b) => b.questions - a.questions), tournaments, from: Math.min(...banks.map((b) => b.from)), to: Math.max(...banks.map((b) => b.to)) };
}

/* ---------- Quizzes that have been drawn ---------- */

export type KeptQuiz = typeof quizzes.$inferSelect;

/** A quiz by its id, or null */
export async function loadQuiz(id: string): Promise<KeptQuiz | null> {
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  const [quiz] = await getDb().select().from(quizzes).where(eq(quizzes.id, id));
  return quiz ?? null;
}

/**
 * How a finished quiz did against every other finished quiz at the same difficulty, by the share of
 * questions right: the share of them it beat, or null while there are too few to say.
 */
export async function standing(quiz: KeptQuiz): Promise<number | null> {
  const share = sql<number>`${quizzes.correct}::float / jsonb_array_length(${quizzes.questions})`;
  const mine = (quiz.correct ?? 0) / (quiz.questions as unknown[]).length;
  const [row] = await getDb()
    .select({ total: count(), below: sql<number>`count(*) filter (where ${share} < ${mine})` })
    .from(quizzes)
    .where(and(eq(quizzes.difficulty, quiz.difficulty), isNotNull(quizzes.finishedAt), ne(quizzes.id, quiz.id)));
  return row && row.total >= 10 ? Math.round((Number(row.below) / row.total) * 100) : null;
}

/** The players a typed answer could be, for the list an answer is picked from */
export async function answerPlayers(tour: Tour, typed: string) {
  const bank = await questionBank(tour);
  return bank ? findPlayers(bank.players, typed).map((p) => ({ key: p.key, name: p.name })) : [];
}
