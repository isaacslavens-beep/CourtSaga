"use client";

import { useMemo, useState } from "react";
import { TournamentLabel } from "../match-ui";
import { Avatar, BallScore } from "./fun";
import { eventLabel, monthLabel, roundOrder, scoreText, watched } from "./library";
import { useLog } from "./store";

/* At the top of the saga: every match you've starred, both tours together, in the order they were played,
   with a search over them that's always there. Each opens its story in Explore, where it's rated and noted. */

// Lower case without accents, so "djokovic" finds Đoković and "monfils" Monfils
const fold = (t: string) => t.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function AllMatches() {
  const { matches, entries, openInLog } = useLog();
  const [newestFirst, setNewestFirst] = useState(false);
  const [query, setQuery] = useState("");
  const all = useMemo(() => Object.values(matches).filter((m) => entries[m.id]).length, [matches, entries]);
  const years = useMemo(() => {
    // Every word typed must appear somewhere: a player, the event, the round, the year, the score
    const words = fold(query).split(/\s+/).filter(Boolean);
    const starred = Object.values(matches)
      .filter((m) => entries[m.id])
      .filter((m) => {
        if (!words.length) return true;
        const text = fold(`${m.winner} ${m.loser} ${eventLabel(m)} ${m.date.slice(0, 4)} ${m.score}`);
        return words.every((w) => text.includes(w));
      })
      .sort((a, b) => a.date.localeCompare(b.date) || roundOrder(a) - roundOrder(b) || a.id.localeCompare(b.id));
    if (newestFirst) starred.reverse();
    const byYear = new Map<string, typeof starred>();
    for (const m of starred) byYear.set(m.date.slice(0, 4), [...(byYear.get(m.date.slice(0, 4)) ?? []), m]);
    return [...byYear.entries()];
  }, [matches, entries, newestFirst, query]);
  const total = years.reduce((n, [, ms]) => n + ms.length, 0);
  if (!all) return null;

  return (
    <section aria-label="All your matches" className="rounded-3xl border border-line bg-surface shadow-sm">
      <header className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-xl font-bold tracking-tight">
            All your matches <span className="font-sans text-base font-normal text-muted">· {all}, men&apos;s and women&apos;s, as they happened</span>
          </h2>
          <button type="button" onClick={() => setNewestFirst((v) => !v)} className="cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline">
            {newestFirst ? "Oldest first" : "Newest first"}
          </button>
        </div>
        {/* Always here: search your own matches, or scroll through them below */}
        <div className="relative mt-3">
          <svg viewBox="0 0 20 20" aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-current stroke-2 text-muted" strokeLinecap="round">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your matches: a player, a tournament, a year"
            aria-label="Search your matches"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-full border-2 border-line bg-background py-2.5 pl-12 pr-4 font-medium placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-4 focus:ring-court/15"
          />
        </div>
        <p className="mt-2 px-1 text-sm text-muted">
          {query.trim()
            ? total
              ? `${total} of your ${all} ${all === 1 ? "match" : "matches"} fit.`
              : `None of your matches fit \u201c${query.trim()}\u201d. Try a surname or a year.`
            : `Scroll through your ${all === 1 ? "match" : `${all} matches`} below, or search them. Pick one to open its story.`}
        </p>
      </header>
      <div className="max-h-[28rem] overflow-y-auto px-2 py-2 sm:px-3">
        {years.map(([year, ms]) => (
          <div key={year}>
            <p className="sticky top-0 z-10 bg-surface/95 px-3 pb-1 pt-3 font-display text-lg font-bold backdrop-blur-sm">{year}</p>
            <ul className="divide-y divide-line">
              {ms.map((m) => {
                const fan = entries[m.id];
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openInLog(m.id)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-court/5"
                    >
                      <span className="w-9 shrink-0 text-xs font-semibold text-muted">{monthLabel(m.date.slice(0, 7)).slice(0, 3)}</span>
                      <span className="flex shrink-0 -space-x-2 max-sm:hidden">
                        <Avatar name={m.winner} size="h-8 w-8 text-xs ring-2 ring-surface" />
                        <Avatar name={m.loser} size="h-8 w-8 text-xs ring-2 ring-surface" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <TournamentLabel event={eventLabel(m)} surface={m.surface} className="max-w-full text-sm" />
                        <span className="mt-0.5 block truncate text-sm">
                          <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>{" "}
                          <span className="whitespace-nowrap font-mono text-xs text-muted">{scoreText(m.score)}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {watched(fan) ? (
                          <span className="rounded-full bg-ball px-2 py-0.5 text-[11px] font-bold text-[#0b0d12]">★ Watched</span>
                        ) : (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">☆ Starred</span>
                        )}
                        <BallScore value={fan.rating} size="xs" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
