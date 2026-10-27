import { difficulties, levelNames, topics, type Level, type QuizSettings, type TopicId } from "../../diary/quiz";
import type { Tour } from "../../diary/library";

/* The small pieces the quiz's pages share: how hard a question is, what it's about, and a quiz's settings in words */

const levelInk: Record<Level, string> = { 1: "text-grass", 2: "text-court", 3: "text-clay", 4: "text-fault" };

/** "Hard", in its own colour: green, blue, clay, red as it gets harder */
export function LevelTag({ level }: { level: Level }) {
  return <span className={`rounded-[3px] bg-sunk px-1.5 py-px text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ring-line ${levelInk[level]}`}>{levelNames[level]}</span>;
}

/** The quiz's credit, in small letters at the foot of its pages */
export function QuizCredit() {
  return <p className="mt-10 text-center text-xs text-muted">Brought to you by Results Committee</p>;
}

export const topicName = (id: TopicId) => topics.find((t) => t.id === id)?.label ?? id;
export const tourName = (t: Tour) => (t === "atp" ? "Men" : "Women");
export const difficultyName = (d: string) => difficulties.find((x) => x.id === d)?.label ?? d;

/** A quiz's settings as one line: "Wimbledon · Hard · Men · 2010–2026 · Grand Slams, Records" */
export function describe(s: Pick<QuizSettings, "difficulty" | "tours" | "topics" | "from" | "to"> & { events?: string[] }, player: string | null) {
  const events = [...new Set(s.events ?? [])];
  return [
    ...(events.length ? [events.length > 3 ? `${events.slice(0, 3).join(", ")} and ${events.length - 3} more` : events.join(", ")] : []),
    difficultyName(s.difficulty),
    player ? `All about ${player}` : s.tours.length === 2 ? "Men and women" : tourName(s.tours[0]),
    s.from === s.to ? String(s.from) : `${s.from}–${s.to}`,
    s.topics.length === topics.length ? "Every category" : s.topics.map(topicName).join(", "),
  ].join(" · ");
}
