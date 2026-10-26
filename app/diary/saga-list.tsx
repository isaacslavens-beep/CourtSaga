"use client";

import { useMemo, useState } from "react";
import { SlamLogo, TournamentLabel, slamColours } from "../match-ui";
import { Chevron, SearchIcon, SectionHead, Segmented } from "../ui";
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
      <SectionHead
        id="all-matches"
        title="All your matches"
        body={
          <>
            {starred.length === 1 ? "The match you've starred" : `All ${starred.length} you've starred`}, men&apos;s and women&apos;s. Pick a Slam, search, or scroll; any match opens its story.
          </>
        }
      />

      {/* The Slams, as on Explore: each with how many of your matches were played there */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              style={{ borderTopColor: slamColours[s] }}
              className={`flex cursor-pointer items-center gap-3 rounded-md border border-t-4 bg-surface px-3 py-3 text-left transition-colors disabled:cursor-default disabled:opacity-45 sm:px-4 ${
                on ? "border-x-foreground border-b-foreground bg-sunk" : "border-x-line border-b-line enabled:hover:bg-sunk"
              }`}
            >
              <SlamLogo event={s} size="h-10 w-10 sm:h-12 sm:w-12" />
              <span className="min-w-0 leading-tight">
                <span className="block font-display text-base font-bold sm:text-lg">{s}</span>
                <span className="block text-sm tabular-nums text-muted">{n === 1 ? "1 match" : `${n} matches`}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="panel mt-4">
        <div className="border-b border-line px-4 py-3 sm:px-5">
          {/* Always here: search your own matches, or scroll through them below */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 basis-full sm:basis-0 sm:flex-1">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your matches: a player, a tournament, a year"
                aria-label="Search your matches"
                autoComplete="off"
                spellCheck={false}
                className="field py-2 pl-10"
              />
            </div>
            <Segmented
              label="Order"
              options={[
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
              ]}
              value={newestFirst ? "newest" : "oldest"}
              onChange={(v) => setNewestFirst(v === "newest")}
            />
          </div>
          <p className="mt-2 text-sm text-muted" aria-live="polite">
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
        <div className="max-h-[32rem] overflow-y-auto">
          {years.map(([year, ms]) => (
            <div key={year}>
              <p className="sticky top-0 z-10 flex items-baseline gap-2 border-y border-line bg-sunk px-4 py-1 sm:px-5">
                <span className="stat text-lg">{year}</span>
                <span className="text-xs font-semibold tabular-nums text-muted">{ms.length === 1 ? "1 match" : `${ms.length} matches`}</span>
              </p>
              <ul className="divide-y divide-line">
                {ms.map((m) => {
                  const fan = entries[m.id];
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => openInLog(m.id)}
                        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-sunk sm:px-5"
                      >
                        <span className="w-9 shrink-0 text-xs font-semibold text-muted">{monthLabel(m.date.slice(0, 7)).slice(0, 3)}</span>
                        <span className="flex shrink-0 -space-x-2 max-sm:hidden">
                          <Avatar name={m.winner} size="h-8 w-8 text-xs ring-2 ring-surface" />
                          <Avatar name={m.loser} size="h-8 w-8 text-xs ring-2 ring-surface" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <TournamentLabel event={eventLabel(m)} surface={m.surface} logo="h-5 w-5" className="max-w-full text-sm" />
                          <span className="mt-0.5 block truncate text-sm">
                            <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>{" "}
                            <span className="whitespace-nowrap text-xs tabular-nums text-muted">{scoreText(m.score)}</span>
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {watched(fan) ? (
                            <span className="rounded-[3px] bg-ball px-1.5 py-px text-[11px] font-bold">★ Watched</span>
                          ) : (
                            <span className="rounded-[3px] px-1.5 py-px text-[11px] font-semibold text-muted ring-1 ring-inset ring-line">☆ Starred</span>
                          )}
                          <BallScore value={fan.rating} size="xs" />
                        </span>
                        <Chevron className="h-3.5 w-3.5 text-muted transition-colors group-hover:text-court max-sm:hidden" />
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
