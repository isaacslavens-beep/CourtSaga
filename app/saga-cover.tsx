import type { ReactNode } from "react";

/* The saga's own look. The log and the ranking are played on courts; the saga is what they add up to, so it
   isn't a court but a book: bound in a tennis ball's optic-yellow felt, its spine stitched like the ball's
   seam, the seam itself sweeping across the cover, a ribbon to keep your place, and the edges of the pages
   showing beneath. */
export function SagaCover({ kicker, title, body, lines }: { kicker: ReactNode; title: string; body: ReactNode; lines?: string[] | null }) {
  return (
    <div className="relative pb-6 pr-3">
      <div className="saga-cover relative overflow-hidden rounded-r-[1.75rem] rounded-l-lg text-[#0f1b2d]">
        {/* The spine, stitched */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-6 bg-[#b5c23a] shadow-[inset_-8px_0_12px_-8px_rgb(0_0_0/0.35)] sm:w-8">
          <span className="absolute inset-y-4 left-1/2 border-l-2 border-dashed border-white/85" />
        </span>
        {/* The ball's seam, sweeping across the felt */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute -right-[18%] top-1/2 h-[230%] -translate-y-1/2 opacity-90 max-sm:-right-[62%] max-sm:h-[150%]"
        >
          <path d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8" fill="none" stroke="rgb(73 92 0 / 0.18)" strokeWidth="0.95" strokeLinecap="round" />
          <path d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8" fill="none" stroke="white" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
        <div className="relative max-w-2xl py-10 pl-12 pr-16 sm:py-12 sm:pl-20 sm:pr-10 lg:py-14">
          {kicker}
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-4 text-xl font-medium leading-relaxed text-[#2c3810]">{body}</p>
          {lines && lines.length > 0 && (
            <p className="mt-6 flex flex-wrap gap-2">
              {lines.map((line) => (
                <span key={line} className="rounded-full bg-white/75 px-3 py-1 text-sm font-semibold ring-1 ring-black/5">
                  {line}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
      {/* A ribbon to keep your place, hanging below the cover */}
      <span aria-hidden className="absolute right-8 top-0 h-[calc(100%-0.25rem)] w-5 bg-fault shadow-sm sm:right-24" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 10px), 0 100%)" }} />
    </div>
  );
}

/** The cover's kicker: the step's number and its verb, as on the landing page */
export function SagaKicker({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#3d4a06]">{children}</p>;
}
