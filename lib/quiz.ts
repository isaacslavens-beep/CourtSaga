import "server-only";
import { and, count, eq, isNotNull, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { quizzes } from "@/db/schema";
import { buildQuestions, findPlayers, type QuestionBank } from "@/app/diary/quiz";
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

/* ---------- Quizzes that have been drawn ---------- */

export type KeptQuiz = typeof quizzes.$inferSelect;

/** A quiz by its id, or null */
export async function loadQuiz(id: string): Promise<KeptQuiz | null> {
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  const [quiz] = await getDb().select().from(quizzes).where(eq(quizzes.id, id));
  return quiz ?? null;
}

/**
 * How a finished quiz did against every other finished quiz at the same difficulty (since quizzes stopped
 * having one, the mix every quiz has), by the share of questions right: the share of them it beat, or null while there are too few to say.
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
