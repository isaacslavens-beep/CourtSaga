"use server";

import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { quizzes } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { questionBank } from "@/lib/quiz";
import { check, drawQuiz, nameForms, type QuestionBank } from "../../diary/quiz";
import { OWNER_COOKIE, type QuizAnswer, type StoredQuestion, type Turn } from "./shared";

// Taking a quiz. A quiz is drawn and kept on the server with its answers, and each answer is checked
// here as it's typed, so a results page shows what was really known. Only the browser that started a
// quiz can answer it.

const settings = z.strictObject({
  tours: z.array(z.enum(["atp", "wta"])).min(1).max(2),
  difficulty: z.enum(["easy", "medium", "hard", "extreme"]),
  topics: z.array(z.enum(["slams", "titles", "rivalries", "careers", "records", "oddities"])).min(1),
  from: z.number().int().min(1990).max(2100),
  to: z.number().int().min(1990).max(2100),
  player: z.string().max(40).nullable(),
  count: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
});
export type QuizRequest = z.infer<typeof settings>;

/** This browser's quiz cookie, made the first time it's needed */
async function owner(make: boolean) {
  const jar = await cookies();
  const have = jar.get(OWNER_COOKIE)?.value;
  if (have || !make) return have ?? null;
  const key = randomBytes(18).toString("base64url");
  jar.set(OWNER_COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 400, path: "/" });
  return key;
}

const newId = () => randomBytes(9).toString("base64url");

async function whoIs() {
  const session = await getSession().catch(() => null);
  return session?.user ?? null;
}

/** Draw a new quiz and keep it. Returns its id, or why there isn't one. */
export async function startQuiz(input: QuizRequest): Promise<{ id: string } | { error: string }> {
  const s = settings.parse(input);
  if (s.from > s.to) return { error: "The first year is after the last one." };
  const banks = (await Promise.all(s.tours.map((t) => questionBank(t)))).filter((b): b is QuestionBank => b !== null);
  if (!banks.length) return { error: "The quiz isn't available right now. Try again in a little while." };
  const db = getDb();
  const me = await owner(true);
  // Questions this browser was asked in its last few quizzes come up again only once the rest run out
  const recent = await db.select({ questions: quizzes.questions }).from(quizzes).where(eq(quizzes.owner, me!)).orderBy(desc(quizzes.createdAt)).limit(8);
  const avoid = new Set(recent.flatMap((r) => (r.questions as StoredQuestion[]).map((q) => q.id)));
  const drawn = drawQuiz(banks, { ...s, player: s.player || null }, avoid);
  if (!drawn.length) return { error: "No questions fit those settings. Try more topics, more years or another player." };
  const questions: StoredQuestion[] = drawn.map((q) => ({
    ...q,
    forms: q.answer.kind === "name" ? nameForms(banks.find((b) => b.tour === q.tour)!.players, q.answer.key) : null,
  }));
  const user = await whoIs();
  const id = newId();
  await db.insert(quizzes).values({ id, owner: me!, userId: user?.id ?? null, name: user?.name ?? null, difficulty: s.difficulty, settings: s, questions });
  // Quizzes left unfinished for a week are cleared away
  await db.delete(quizzes).where(and(isNull(quizzes.finishedAt), lt(quizzes.createdAt, sql`now() - interval '7 days'`)));
  return { id };
}

/** Answer the next question of a quiz this browser is taking. Typed "" means "don't know". */
export async function answerQuestion(id: string, index: number, typed: string): Promise<Turn> {
  const text = String(typed).slice(0, 80);
  const me = await owner(false);
  const db = getDb();
  return db.transaction(async (tx) => {
    const [quiz] = await tx.select().from(quizzes).where(eq(quizzes.id, String(id))).for("update");
    if (!quiz || !me || quiz.owner !== me) return { status: "closed" };
    const questions = quiz.questions as StoredQuestion[];
    const answers = quiz.answers as QuizAnswer[];
    if (quiz.finishedAt || index !== answers.length || !questions[index]) return { status: "closed" };
    const q = questions[index];
    const verdict = check(q.answer, q.forms, text);
    if (verdict === "again" && text.trim()) return { status: "again", hint: `More than one ${q.forms?.shared ? title(q.forms.shared) : "player"} played. Add the first name.` };
    const right = verdict === "right";
    const next = [...answers, { typed: text.trim(), right }];
    const done = next.length === questions.length;
    await tx
      .update(quizzes)
      .set({ answers: next, ...(done && { finishedAt: new Date(), correct: next.filter((a) => a.right).length }) })
      .where(eq(quizzes.id, quiz.id));
    return { status: "answered", right, answer: q.answer.kind === "name" ? q.answer.text : String(q.answer.value), fact: q.fact, go: q.go, done };
  });
}

const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Put a name on finished results, so the page says whose they are */
export async function nameResults(id: string, name: string) {
  const me = await owner(false);
  const clean = String(name).replace(/\s+/g, " ").trim().slice(0, 40);
  if (!me) return;
  await getDb()
    .update(quizzes)
    .set({ name: clean || null })
    .where(and(eq(quizzes.id, String(id)), eq(quizzes.owner, me)));
}

/** The same questions as someone else's quiz, as a new quiz for this browser: to see who knows more */
export async function sameQuestions(id: string): Promise<{ id: string } | { error: string }> {
  const db = getDb();
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, String(id)));
  if (!quiz?.finishedAt) return { error: "That quiz can't be taken again." };
  const me = await owner(true);
  const user = await whoIs();
  const fresh = newId();
  await db.insert(quizzes).values({
    id: fresh,
    owner: me!,
    userId: user?.id ?? null,
    name: user?.name ?? null,
    difficulty: quiz.difficulty,
    settings: { ...(quiz.settings as object), challenge: quiz.id },
    questions: quiz.questions,
  });
  return { id: fresh };
}
