"use client";

import { useMemo, useState } from "react";
import { SlamLogo, TournamentLabel, slamColours } from "../match-ui";
import { Avatar, BallScore } from "./fun";
import { eventLabel, monthLabel, roundOrder, scoreText, slams, watched, type Match } from "./library";
import { useLog } from "./store";

/* Below the books: every match you've starred, both tours together, in the order they were played. The
   four Slams sit on top as tiles to pick, like Explore's, and a search over them is always there. Each
   match opens its story in Explore, where it's rated and noted. */

// Lower case without accents, so "djokovic" finds Đoković and "monfils" Monfils
const fold = (t: string) => t.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slamOf = (m: Match) => slams.find((s) => m.event.startsWith(s)) ?? null;

export function AllMatches() {
  const { matches, entries, openInLog } = useLog();
  const [newestFirst, setNewestFirst] = useState(true);
  const [query, setQuery] = useState("");
  const [slam, setSlam] = useState<string | null>(null);
  const starred = useMemo(() => Object.values(matches).filter((m) => entries[m.id]), [matches, entries]);
  const perSlam = useMemo(() => Object.fromEntries(slams.map((s) => [s, starred.filter((m) => slamOf(m) === s).length])), [starred]);
  const years = useMemo(() => {
    // Every word typed must appear somewhere: a player, the event, the round, the year, the score
    const words = fold(query).split(/\s+/).filter(Boolean);
    const shown = starred
      .filter((m) => !slam || slamOf(m) === slam)
      .filter((m) => {
        if (!words.length) return true;
        const text = fold(`${m.winner} ${m.loser} ${eventLabel(m)} ${m.date.slice(0, 4)} ${m.score}`);
        return words.every((w) => text.includes(w));
      })
      .sort((a, b) => a.date.localeCompare(b.date) || roundOrder(a) - roundOrder(b) || a.id.localeCompare(b.id));
    if (newestFirst) shown.reverse();
    const byYear = new Map<string, typeof shown>();
    for (const m of shown) byYear.set(m.date.slice(0, 4), [...(byYear.get(m.date.slice(0, 4)) ?? []), m]);
    return [...byYear.entries()];
  }, [starred, newestFirst, query, slam]);
  const total = years.reduce((n, [, ms]) => n + ms.length, 0);
  if (!starred.length) return null;

  return (
    <section aria-labelledby="all-matches">
      <h2 id="all-matches" className="font-display text-2xl font-bold tracking-tight">
        All your matches
      </h2>
      <p className="text-muted">
        {starred.length === 1 ? "The match you've starred" : `All ${starred.length} you've starred`}, men&apos;s and women&apos;s. Pick a Slam, search, or scroll; any match opens its story.
      </p>

      {/* The Slams, as on Explore: each with how many of your matches were played there */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {slams.map((s) => {
          const n = perSlam[s];
          const on = slam === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              disabled={!n}
              onClick={() => setSlam(on ? null : s)}
              style={{ background: slamColours[s] }}
              className={`group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left font-semibold text-white shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0 sm:px-4 ${
                on ? "-translate-y-1 shadow-xl ring-4 ring-ball ring-offset-2 ring-offset-[var(--background)]" : slam ? "opacity-70 hover:opacity-100" : ""
              }`}
            >
              <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <SlamLogo event={s} size="h-11 w-11 sm:h-12 sm:w-12" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block font-display text-base sm:text-lg">{s}</span>
                <span className="block text-xs text-white/80">{n === 1 ? "1 match" : `${n} matches`}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-3xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          {/* Always here: search your own matches, or scroll through them below */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 basis-full sm:basis-0 sm:flex-1">
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
            <div className="flex rounded-full bg-background p-1 ring-1 ring-line" role="group" aria-label="Order">
              {[true, false].map((newest) => (
                <button
                  key={String(newest)}
                  type="button"
                  aria-pressed={newestFirst === newest}
                  onClick={() => setNewestFirst(newest)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-sm font-bold transition ${newestFirst === newest ? "bg-court text-court-ink shadow-sm" : "text-muted hover:text-foreground"}`}
                >
                  {newest ? "Newest" : "Oldest"}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 px-1 text-sm text-muted" aria-live="polite">
            {query.trim() || slam
              ? total
                ? `${total} of your ${starred.length} ${starred.length === 1 ? "match" : "matches"}${slam ? ` at ${slam === "US Open" || slam === "Australian Open" ? "the " : ""}${slam}` : ""}.`
                : `None of your matches fit${query.trim() ? ` “${query.trim()}”` : ""}. Try a surname or a year.`
              : `Scroll through them below, or search.`}
            {slam && (
              <>
                {" "}
                <button type="button" onClick={() => setSlam(null)} className="cursor-pointer font-semibold text-court underline-offset-4 hover:underline">
                  Show every event
                </button>
              </>
            )}
          </p>
        </div>
        <div className="max-h-[32rem] overflow-y-auto px-2 py-2 sm:px-3">
          {years.map(([year, ms]) => (
            <div key={year}>
              <p className="sticky top-0 z-10 flex items-baseline gap-2 bg-surface/95 px-3 pb-1 pt-3 backdrop-blur-sm">
                <span className="font-display text-xl font-bold">{year}</span>
                <span className="text-xs font-semibold text-muted">{ms.length === 1 ? "1 match" : `${ms.length} matches`}</span>
              </p>
              <ul className="divide-y divide-line">
                {ms.map((m) => {
                  const fan = entries[m.id];
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => openInLog(m.id)}
                        className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-court/5"
                      >
                        <span className="w-9 shrink-0 text-xs font-semibold text-muted">{monthLabel(m.date.slice(0, 7)).slice(0, 3)}</span>
                        <span className="flex shrink-0 -space-x-2 max-sm:hidden">
                          <Avatar name={m.winner} size="h-9 w-9 text-xs ring-2 ring-surface" />
                          <Avatar name={m.loser} size="h-9 w-9 text-xs ring-2 ring-surface" />
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
                        <span aria-hidden className="shrink-0 text-court transition-transform group-hover:translate-x-1 max-sm:hidden">
                          →
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
