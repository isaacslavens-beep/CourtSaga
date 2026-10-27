import type { Question, QuizSettings } from "../../diary/quiz";

// What the quiz's server and its pages pass between them

export const OWNER_COOKIE = "courtsaga-quiz";

/** A question as it's kept (quizzes from before 28 Oct 2026 also kept what a typed name answer would take) */
export type StoredQuestion = Question;

/** What was typed for a question, and whether it was right */
export type QuizAnswer = { typed: string; right: boolean };

/** A question as the player sees it before answering: no answer, nothing that gives it away */
export type AskedQuestion = Pick<Question, "prompt" | "level" | "topic" | "tour"> & { kind: Question["answer"]["kind"] };

/** What answering a question gives back */
export type Turn =
  | { status: "answered"; right: boolean; answer: string; fact: string; go: string | null; done: boolean }
  | { status: "again"; hint: string } // a name typed but no player picked from the list
  | { status: "closed" }; // not this browser's quiz, or already answered

export const asked = (q: StoredQuestion): AskedQuestion => ({ prompt: q.prompt, level: q.level, topic: q.topic, tour: q.tour, kind: q.answer.kind });

/** Settings from a link, e.g. ?d=hard&t=atp&topics=slams,records&from=2010&to=2026&n=10&p=atp:N409&ev=Wimbledon */
export const settingsQuery = (s: Pick<QuizSettings, "difficulty" | "tours" | "topics" | "from" | "to" | "count" | "player"> & { events?: string[] }) =>
  new URLSearchParams({
    d: s.difficulty,
    t: s.tours.length === 2 ? "both" : s.tours[0],
    topics: s.topics.join(","),
    from: String(s.from),
    to: String(s.to),
    n: String(s.count),
    ...(s.player && { p: s.player }),
    ...(s.events?.length && { ev: s.events.join("|") }),
  }).toString();
