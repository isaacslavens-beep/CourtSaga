import type { ReactNode } from "react";

/* The diary's three parts, each with its number, its verb and a plain line about it: write it (the log),
   explore around it, read it back (the saga). Used on the landing page and on the diary's pages. */

const DownArrow = ({ className }: { className: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden className={`fill-none stroke-current ${className}`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v10M4 9l4 4 4-4" />
  </svg>
);

export function StepHeading({
  n,
  verb,
  title,
  body,
  hint,
  id,
  as: Heading = "h2",
  onCourt = false,
  compact = false,
}: {
  n: number;
  verb: string;
  title: string;
  body: ReactNode;
  hint?: ReactNode;
  id?: string;
  as?: "h1" | "h2";
  onCourt?: boolean; // white words on a court (see CourtBand)
  compact?: boolean; // a smaller heading, for a page that wants its content higher up
}) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ball font-bold text-[#0b0d12] ring-1 ring-black/10">{n}</span>
        <span className={`text-sm font-semibold uppercase tracking-[0.16em] ${onCourt ? "text-white/80" : "text-muted"}`}>{verb}</span>
      </p>
      <Heading id={id} className={`font-display font-bold tracking-tight ${compact ? "mt-3 text-3xl sm:text-4xl" : "mt-5 text-4xl sm:text-5xl"}`}>
        {title}
      </Heading>
      <p className={`font-medium leading-relaxed ${compact ? "mt-2 text-lg" : "mt-4 text-xl"} ${onCourt ? "text-white/90" : "text-muted"}`}>{body}</p>
      {hint && (
        <p className="mt-4 inline-flex items-center gap-2.5 text-lg font-semibold text-court">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ball text-[#0b0d12] ring-1 ring-black/10">
            <DownArrow className="h-4 w-4 stroke-2 motion-safe:animate-bounce" />
          </span>
          {hint}
        </p>
      )}
    </div>
  );
}
