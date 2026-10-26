"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, TennisBall } from "../../diary/fun";
import { CoverStats, PageBar } from "../../ui";

/* The top of the saga page, drawn like every other page's: its bar, with a way to share the saga on the
   right, and under it what's in the saga and the players who turn up in it most, as figures in boxes.
   Before the saga has enough matches, it counts the way there instead. */

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
  const ready = have >= need;
  const foot = ready ? (
    (lines.length > 0 || players.length > 0) && (
      <CoverStats lines={lines}>
        {players.length > 0 && (
          <div className="min-w-0 rounded border border-line bg-surface px-3 py-1.5">
            <p className="text-xs font-medium text-muted">Your players</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 py-0.5">
              {players.slice(0, 3).map((p) => (
                <span key={p.name} className="inline-flex items-center gap-1.5 text-sm font-semibold">
                  <Avatar name={p.name} size="h-6 w-6 text-[10px]" />
                  {p.name}
                  <span className="font-normal tabular-nums text-muted">{p.count}</span>
                </span>
              ))}
            </p>
          </div>
        )}
      </CoverStats>
    )
  ) : (
    // Not enough yet: a ball for each match the saga needs, filled as they're starred
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <span className="flex items-center gap-1" aria-label={`${have} of ${need} matches starred`}>
        {Array.from({ length: need }, (_, i) => (
          <TennisBall key={i} filled={i < have} className="h-6 w-6" />
        ))}
      </span>
      <span className="text-muted">
        <span className="font-semibold tabular-nums text-foreground">
          {have} of {need}
        </span>{" "}
        matches. Star {need - have} more to open your saga.
      </span>
      <Link href="/explore" className="btn btn-primary">
        Find a match to star
      </Link>
    </div>
  );
  return (
    <PageBar n={4} title={title} foot={foot}>
      {ready && share}
    </PageBar>
  );
}
