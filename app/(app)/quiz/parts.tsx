import { levelNames, topics, type Level, type TopicId } from "../../diary/quiz";
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

// The big tournaments' colours, for a question about one: a panel's top rule and a faint wash, nothing louder
const eventColours: [RegExp, string][] = [
  [/^Wimbledon/, "#2e6b3f"],
  [/^Roland Garros/, "#7a1f35"],
  [/^Australian Open/, "#3a9ad9"],
  [/^US Open/, "#1d3f94"],
  [/^Olympics/, "#b08a2e"],
];
export const eventColour = (event: string | null | undefined) => (event ? (eventColours.find(([re]) => re.test(event))?.[1] ?? null) : null);

export const topicName = (id: TopicId) => topics.find((t) => t.id === id)?.label ?? id;
export const tourName = (t: Tour) => (t === "atp" ? "Men" : "Women");
// Quizzes from before 27 Oct 2026's simplification had a difficulty of their own; since then it's a mix ("auto")
const difficulties: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard", extreme: "Extreme" };
export const difficultyName = (d: string) => difficulties[d] ?? null;

/** A quiz in words: "Hard · Men", or just "Men and women" */
export function describe(s: { tours: Tour[] }, difficulty: string) {
  return [difficultyName(difficulty), s.tours.length === 2 ? "Men and women" : tourName(s.tours[0])].filter(Boolean).join(" · ");
}
