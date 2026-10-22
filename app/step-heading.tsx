import type { ReactNode } from "react";

/* The diary's three parts, each with its number, its verb and a plain line about it: write it (the log),
   sort it (the ranking), read it back (the saga). Used on the landing page and on the diary's pages. */

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
}: {
  n: number;
  verb: string;
  title: string;
  body: ReactNode;
  hint?: ReactNode;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ball font-bold text-[#0b0d12] ring-1 ring-black/10">{n}</span>
        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{verb}</span>
      </p>
      <Heading id={id} className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {title}
      </Heading>
      <p className="mt-4 text-xl font-medium leading-relaxed text-muted">{body}</p>
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
