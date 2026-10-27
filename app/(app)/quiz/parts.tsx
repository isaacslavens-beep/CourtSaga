import { difficulties, levelNames, topics, type Level, type QuizSettings, type TopicId } from "../../diary/quiz";
import type { Tour } from "../../diary/library";

/* The small pieces the quiz's pages share: how hard a question is, what it's about, and a quiz's settings in words */

const levelInk: Record<Level, string> = { 1: "text-grass", 2: "text-court", 3: "text-clay", 4: "text-fault" };

/** "Hard", in its own colour: green, blue, clay, red as it gets harder */
export function LevelTag({ level }: { level: Level }) {
  return <span className={`rounded-[3px] bg-sunk px-1.5 py-px text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ring-line ${levelInk[level]}`}>{levelNames[level]}</span>;
}

export const topicName = (id: TopicId) => topics.find((t) => t.id === id)?.label ?? id;
export const tourName = (t: Tour) => (t === "atp" ? "Men" : "Women");
export const difficultyName = (d: string) => difficulties.find((x) => x.id === d)?.label ?? d;

/** A quiz's settings as one line: "Hard · Men · 2010–2026 · Grand Slams, Records" */
export function describe(s: Pick<QuizSettings, "difficulty" | "tours" | "topics" | "from" | "to">, player: string | null) {
  return [
    difficultyName(s.difficulty),
    player ? `All about ${player}` : s.tours.length === 2 ? "Men and women" : tourName(s.tours[0]),
    s.from === s.to ? String(s.from) : `${s.from}–${s.to}`,
    s.topics.length === topics.length ? "Every topic" : s.topics.map(topicName).join(", "),
  ].join(" · ");
}
