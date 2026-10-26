"use client";

import { Avatar } from "./fun";
import { endingOf, finished, parseScore, setWinner, type Match } from "./library";

/** A TV-style scorebug: both players, games per set (the set's winner's in a lit cell), tiebreak points on the set's loser. */
export function Scoreboard({ match }: { match: Match }) {
  const { sets: parsed } = parseScore(match.score);
  const done = finished(match.score);
  const sets = parsed.map((set, i) => ({ ...set, took: setWinner(parsed, i, done) }));
  const ending = endingOf(match);
  return (
    <div className="overflow-hidden rounded-md bg-header text-white shadow-md ring-1 ring-black/10">
      {[match.winner, match.loser].map((name, row) => (
        <div key={name} className={`flex items-center gap-2.5 py-1.5 pl-3 pr-1.5 ${row ? "border-t border-white/10" : ""}`}>
          <Avatar name={name} size="h-7 w-7 text-xs" />
          <span className={`min-w-0 flex-1 truncate font-display text-lg font-bold ${row ? "text-white/65" : ""}`}>{name}</span>
          {!row && <span className="rounded-[3px] bg-ball px-1.5 py-px text-[11px] font-bold text-foreground max-sm:hidden">Won</span>}
          <span className="flex gap-0.5">
            {sets.map((set, i) => {
              const games = row ? set.l : set.w;
              const tookSet = set.took === (row ? "l" : "w");
              return (
                <span
                  key={i}
                  className={`stat relative w-7 rounded-[3px] py-0.5 text-center text-xl sm:w-8 ${tookSet ? "bg-court text-white" : "font-medium text-white/55"}`}
                >
                  {games}
                  {set.tb !== null && set.took && !tookSet && <sup className="absolute right-0.5 top-1 text-[9px] font-semibold text-white/70">{set.tb}</sup>}
                </span>
              );
            })}
          </span>
        </div>
      ))}
      {ending && <p className="border-t border-white/10 px-3 py-1.5 text-xs text-white/65">{ending}</p>}
    </div>
  );
}
