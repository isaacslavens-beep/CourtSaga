import type { ReactNode } from "react";

// Small visual pieces shared by the hero cards and the step demos.

export function Stars({
  rating,
  filled = "text-court",
  empty = "text-line",
}: {
  rating: number;
  filled?: string;
  empty?: string;
}) {
  return (
    <span className={`whitespace-nowrap ${filled}`} aria-label={`Rated ${rating} out of 5`}>
      {"★".repeat(rating)}
      <span className={empty}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`fill-none stroke-current stroke-2 ${className}`}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** A ✓ or ✗ disc for whether a prediction came off. */
export function CallMark({ correct, size = "h-7 w-7 text-sm" }: { correct: boolean; size?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${size} ${
        correct ? "bg-grass" : "bg-fault"
      }`}
    >
      {correct ? "✓" : "✗"}
    </span>
  );
}

/** Head-to-head record as two totals over a split bar. */
export function HeadToHead({
  left,
  right,
  size = "lg",
}: {
  left: { name: string; wins: number };
  right: { name: string; wins: number };
  size?: "sm" | "lg";
}) {
  const leftShare = (left.wins / (left.wins + right.wins)) * 100;

  return (
    <div>
      <p className="sr-only">
        Head-to-head: {left.name} {left.wins}, {right.name} {right.wins}
      </p>
      <p
        aria-hidden
        className={`flex items-baseline justify-between font-display font-bold tabular-nums ${
          size === "lg" ? "text-2xl leading-7" : "text-lg leading-6"
        }`}
      >
        <span>{left.wins}</span>
        <span className="text-muted">{right.wins}</span>
      </p>
      <p aria-hidden className={`flex gap-0.5 overflow-hidden rounded-full ${size === "lg" ? "mt-3 h-2" : "mt-1.5 h-1.5"}`}>
        <span className="bg-court" style={{ width: `${leftShare}%` }} />
        <span className="flex-1 bg-line" />
      </p>
      <p aria-hidden className="mt-1.5 flex justify-between text-sm font-semibold">
        <span>{left.name}</span>
        <span className="text-muted">{right.name}</span>
      </p>
    </div>
  );
}

/** A plain count from the user's own log. */
export function LogFact({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-sm text-muted ${className}`}>
      <EyeIcon className="h-4 w-4 shrink-0 text-court" />
      <span>{children}</span>
    </p>
  );
}

type Surface = "clay" | "hard" | "grass" | "olympics";

// Tournament name prefixes by surface: the Slams, the Masters 1000s and the ATP Finals.
const surfaceByEvent: [string, Surface][] = [
  ["Olympics", "olympics"],
  ["Roland Garros", "clay"],
  ["Monte Carlo", "clay"],
  ["Madrid", "clay"],
  ["Rome", "clay"],
  ["Wimbledon", "grass"],
  ["Australian Open", "hard"],
  ["US Open", "hard"],
  ["Indian Wells", "hard"],
  ["Miami", "hard"],
  ["Canada", "hard"],
  ["Cincinnati", "hard"],
  ["Shanghai", "hard"],
  ["Paris Masters", "hard"],
  ["ATP Finals", "hard"],
];

// Class names are spelled out for Tailwind.
const surfaceStyles: Record<Surface, { text: string; dot: string }> = {
  clay: { text: "text-clay", dot: "bg-clay" },
  hard: { text: "text-hard", dot: "bg-hard" },
  grass: { text: "text-lawn", dot: "bg-lawn" },
  // The five ring colours, as a swirl rather than the rings themselves
  olympics: {
    text: "",
    dot: "bg-[conic-gradient(#0081c8,#fcb131,#000000,#00a651,#ee334e,#0081c8)]",
  },
};

/** An event name tagged with the colour of the surface it's played on. */
export function TournamentLabel({
  event,
  onPhoto = false,
  className = "",
}: {
  event: string;
  onPhoto?: boolean;
  className?: string;
}) {
  const surface = surfaceByEvent.find(([prefix]) => event.startsWith(prefix))?.[1];
  const style = surface ? surfaceStyles[surface] : { text: "", dot: "bg-muted" };

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 font-semibold ${onPhoto ? "text-white" : style.text} ${className}`}>
      <span aria-hidden className={`h-3.5 w-3.5 shrink-0 rounded-full ${style.dot}`} />
      <span className="truncate">{event}</span>
    </span>
  );
}
