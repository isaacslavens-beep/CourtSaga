"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { TournamentLabel } from "../match-ui";
import { SearchIcon } from "../ui";
import { Avatar } from "./fun";
import { diaryPages, eventLabel, scoreText, toMatches, type MatchRow } from "./library";
import { useLog } from "./store";

/* Finding a match: players, tournament, year and round, in any order. Picking one opens its story in
   Explore, where it can be starred, rated and noted. */

type Results = { results: MatchRow[]; total: number; page: number; pages: number; size: number; query: string; corrected: string | null };

const examples = ["alcaraz sinner", "wimbledon 2008 final", "sabalenka ao 2023"];

// Phones get a placeholder short enough to fit the bar
const narrow = "(max-width: 639px)";
const subscribeNarrow = (on: () => void) => {
  const q = matchMedia(narrow);
  q.addEventListener("change", on);
  return () => q.removeEventListener("change", on);
};

/** A search for a season after the last one in the data */
const notInYet = (query: string, last: number) => (query.match(/\b(19|20)\d{2}\b/g) ?? []).some((y) => Number(y) > last);
/** A search for a season before the first one in the data */
const tooEarly = (query: string, first: number) => (query.match(/\b(19|20)\d{2}\b/g) ?? []).some((y) => Number(y) < first);

export function MatchFinder({ seasons, onPick, inside }: { seasons: [number, number] | null; onPick: (row: MatchRow) => void; inside?: ReactNode }) {
  const { matches, entries } = useLog();
  const pages = diaryPages(entries, matches);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [found, setFound] = useState<Results | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const typed = query.trim();
  const isNarrow = useSyncExternalStore(subscribeNarrow, () => matchMedia(narrow).matches, () => false);

  // Search once typing pauses; a newer search cancels an older one
  useEffect(() => {
    if (!typed) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(typed)}&page=${page}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        setFound(await res.json());
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typed, page]);

  const shown = typed && found ? found : null;
  const named = useMemo(() => (shown ? toMatches(shown.results) : {}), [shown]);
  const search = (q: string) => {
    setQuery(q);
    setPage(1);
  };
  const open = (row: MatchRow) => {
    setQuery("");
    onPick(row);
  };
  const first = shown ? (shown.page - 1) * shown.size + 1 : 0;

  return (
    <div className="panel">
      <div className="panel-head">
        <label htmlFor="find-a-match" className="panel-title">
          Find a match
        </label>
        {seasons && (
          <span className="panel-meta">
            Any tour-level singles match, {seasons[0]}–{seasons[1]}. {seasons[1]} matches may not be fully up to date.
          </span>
        )}
      </div>
      <div className="panel-body">
        <div className="relative">
          <SearchIcon className="left-3.5" />
          <input
            id="find-a-match"
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder={isNarrow ? `Try "${examples[0]}"` : `Try "${examples[0]}" or "${examples[1]}"`}
            autoComplete="off"
            spellCheck={false}
            className={`field py-2.5 pl-10 text-lg ${inside ? "sm:pr-40" : ""}`}
          />
          {/* Something to press at the bar's right end: Surprise me (under it on phones, where the bar is narrow) */}
          {inside && <span className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 sm:inline">{inside}</span>}
        </div>
        {inside && <div className="mt-3 sm:hidden">{inside}</div>}

        {!typed && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            Players, a tournament, a year, a round, in any order. For example:
            {examples.map((q) => (
              <button key={q} type="button" onClick={() => search(q)} className="tag">
                {q}
              </button>
            ))}
          </p>
        )}

        {typed && (
          <div className="mt-4" aria-live="polite" aria-busy={loading}>
            {failed ? (
              <p className="rounded border border-fault/30 bg-fault/5 px-4 py-3 font-medium text-fault">Search isn&apos;t working right now. Check your connection and try again.</p>
            ) : !shown ? (
              <p className="px-1 text-muted">Searching…</p>
            ) : !shown.total ? (
              <p className="well px-4 py-3 text-muted">
                No matches for &ldquo;{shown.query}&rdquo;.{" "}
                {seasons && notInYet(shown.query, seasons[1])
                  ? `Matches from ${seasons[1] + 1} aren't in yet.`
                  : seasons && tooEarly(shown.query, seasons[0])
                    ? `The match data goes back to ${seasons[0]}, so earlier matches can't be found yet.`
                    : "Try a player's surname, a tournament and a year, like \u201cfederer wimbledon 2007\u201d."}
              </p>
            ) : (
              <>
                <p className={`px-1 text-sm text-muted transition-opacity ${loading ? "opacity-50" : ""}`}>
                  {shown.corrected && (
                    <>
                      Showing matches for <span className="font-semibold text-foreground">&ldquo;{shown.corrected}&rdquo;</span>.{" "}
                    </>
                  )}
                  {shown.total === 1 ? "1 match" : `${first}–${first + shown.results.length - 1} of ${shown.total.toLocaleString()} matches`}, newest first
                </p>
                <ol className={`mt-2 divide-y divide-line border-y border-line transition-opacity ${loading ? "opacity-50" : ""}`}>
                  {shown.results.map((row) => {
                    const m = named[row.id];
                    const page = pages.get(row.id);
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => open(row)}
                          className="group flex w-full cursor-pointer items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-sunk sm:px-3"
                        >
                          <span className="flex shrink-0 -space-x-2 max-sm:hidden">
                            <Avatar name={m.winner} size="h-9 w-9 text-sm ring-2 ring-surface" />
                            <Avatar name={m.loser} size="h-9 w-9 text-sm ring-2 ring-surface" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <TournamentLabel event={eventLabel(m)} surface={m.surface} logo="h-5 w-5" className="max-w-full text-[0.9375rem]" />
                            <span className="mt-0.5 block truncate text-sm">
                              <span className="font-semibold">{row.winner.name}</span> <span className="text-muted">beat {row.loser.name}</span>{" "}
                              <span className="whitespace-nowrap tabular-nums text-muted">{scoreText(row.score)}</span>
                            </span>
                          </span>
                          {page ? (
                            <span className="shrink-0 rounded-[3px] bg-ball px-2 py-0.5 text-sm font-bold">★ In your saga</span>
                          ) : (
                            <span className="tag shrink-0 group-hover:border-court">Explore</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {shown.pages > 1 && (
                  <div className="mt-3 flex items-center justify-between gap-3 px-1">
                    <button
                      type="button"
                      disabled={shown.page <= 1}
                      onClick={() => setPage(shown.page - 1)}
                      className="btn btn-secondary btn-sm disabled:invisible"
                    >
                      ← Newer
                    </button>
                    <span className="text-sm tabular-nums text-muted">
                      Page {shown.page} of {shown.pages}
                    </span>
                    <button
                      type="button"
                      disabled={shown.page >= shown.pages}
                      onClick={() => setPage(shown.page + 1)}
                      className="btn btn-secondary btn-sm disabled:invisible"
                    >
                      Older →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
