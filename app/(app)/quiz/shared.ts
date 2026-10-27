import type { Tour } from "../../diary/library";
import type { Question } from "../../diary/quiz";

// What the quiz's server and its pages pass between them

export const OWNER_COOKIE = "courtsaga-quiz";

/** A question as it's kept (quizzes from before this change also kept what a typed name answer would take) */
export type StoredQuestion = Question;

/** What was typed for a question, and whether it was right */
export type QuizAnswer = { typed: string; right: boolean };

/** A question as the player sees it before answering: no answer, nothing that gives it away */
export type AskedQuestion = Pick<Question, "prompt" | "level" | "topic" | "tour" | "choices"> & { kind: Question["answer"]["kind"]; event: string | null };

/** What answering a question gives back */
export type Turn =
  | { status: "answered"; right: boolean; answer: string; fact: string; go: string | null; done: boolean }
  | { status: "again"; hint: string } // a name typed but no player picked from the list
  | { status: "closed" }; // not this browser's quiz, or already answered

export const asked = (q: StoredQuestion): AskedQuestion => ({
  prompt: q.prompt,
  level: q.level,
  topic: q.topic,
  tour: q.tour,
  kind: q.answer.kind,
  choices: q.choices,
  event: q.events?.[0] ?? null,
});

/** A quiz's tours as a link to /quiz: "t=atp", "t=wta" or "t=both" */
export const tourQuery = (tours: Tour[]) => `t=${tours.length === 2 ? "both" : tours[0]}`;
