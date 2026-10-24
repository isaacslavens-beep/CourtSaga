"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, TennisBall } from "../../diary/fun";
import { PageTitle } from "../../page-title";

/* The top of the saga page, drawn like Explore's and Statistics': a band in the saga's ink, with the
   heading, what's in the saga, a way to share it, and the players who turn up in it most. Before the saga has enough matches, it counts the way there instead. */

/** One of the players you star most: a big face, a name, and how many of your matches they're in */
function PlayerCard({ name, count, className = "" }: { name: string; count: number; className?: string }) {
  return (
    <span className={`flex w-28 shrink-0 flex-col items-center rounded-2xl bg-white/10 px-3 pb-3 pt-4 text-center ring-1 ring-white/15 sm:w-32 ${className}`}>
      <Avatar name={name} size="h-16 w-16 text-2xl ring-4 ring-white/20 sm:h-20 sm:w-20" />
      <span className="mt-2 block w-full truncate font-display text-base font-bold">{name}</span>
      <span className="block text-xs text-white/75">{count === 1 ? "1 match" : `${count} matches`}</span>
    </span>
  );
}

export function SagaHero({
  title,
  lines,
  players,
  share,
  have,
  need,
}: {
  title: string;
  lines: string[];
  players: { name: string; count: number }[]; // the players in most of your matches, most first
  share: ReactNode;
  have: number;
  need: number;
}) {
  return (
    <div className="bg-[var(--header)] text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-8 px-4 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <PageTitle n={3} onDark>
            {title}
          </PageTitle>
          {lines.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {lines.map((line) => (
                <span key={line} className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ring-1 ring-white/20">
                  {line}
                </span>
              ))}
            </p>
          )}
          <div className="mt-6">
            {have >= need ? (
              share
            ) : (
              // Not enough yet: a ball for each match the saga needs, filled as they're starred
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <span className="flex items-center gap-1.5" aria-label={`${have} of ${need} matches starred`}>
                  {Array.from({ length: need }, (_, i) => (
                    <TennisBall key={i} filled={i < have} className="h-7 w-7" />
                  ))}
                </span>
                <span className="text-white/85">
                  {have} of {need} matches. Star {need - have} more to open your saga.
                </span>
                <Link href="/explore" className="rounded-full bg-ball px-5 py-2.5 font-display font-bold text-[#0b0d12] shadow-lg shadow-black/25 transition hover:-translate-y-0.5">
                  Find a match to star →
                </Link>
              </div>
            )}
          </div>
        </div>
        {players.length > 0 && (
          <div className="max-sm:hidden">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-white/70 lg:text-right">Your players</p>
            <div className="flex justify-center gap-3 lg:justify-end">
              {players.slice(0, 3).map((p, i) => (
                <PlayerCard key={p.name} name={p.name} count={p.count} className={["-rotate-3", "z-[1] -translate-y-2", "rotate-3"][i]} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
