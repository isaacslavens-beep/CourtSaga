"use client";

import { Avatar } from "./fun";
import { endingOf, finished, parseScore, setWinner, type Match } from "./library";

/** A TV-style scorebug: both players, games per set, tiebreak points on the set's loser. */
export function Scoreboard({ match }: { match: Match }) {
  const { sets: parsed } = parseScore(match.score);
  const done = finished(match.score);
  const sets = parsed.map((set, i) => ({ ...set, took: setWinner(parsed, i, done) }));
  const ending = endingOf(match);
  return (
    <div className="overflow-hidden rounded-2xl bg-[#0a1220]/90 text-white shadow-xl ring-1 ring-white/15 backdrop-blur-md">
      {[match.winner, match.loser].map((name, row) => (
        <div key={name} className={`flex items-center gap-2.5 px-3.5 py-2 ${row ? "border-t border-white/10" : ""}`}>
          <Avatar name={name} size="h-7 w-7 text-xs" />
          <span className={`min-w-0 flex-1 truncate font-display text-lg font-bold ${row ? "text-white/65" : ""}`}>{name}</span>
          {!row && <span className="rounded-full bg-ball px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-black max-sm:hidden">Won</span>}
          <span className="flex">
            {sets.map((set, i) => {
              const games = row ? set.l : set.w;
              const tookSet = set.took === (row ? "l" : "w");
              return (
                <span
                  key={i}
                  className={`relative w-6 text-center font-mono text-lg tabular-nums sm:w-7 ${tookSet ? "font-bold text-white" : "text-white/55"}`}
                >
                  {games}
                  {set.tb !== null && set.took && !tookSet && <sup className="absolute -right-0.5 top-0.5 text-[9px] text-white/70">{set.tb}</sup>}
                </span>
              );
            })}
          </span>
        </div>
      ))}
      {ending && <p className="border-t border-white/10 px-3.5 py-1.5 text-xs text-white/60">{ending}</p>}
    </div>
  );
}
