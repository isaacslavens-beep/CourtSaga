"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { glideTo } from "../glide";
import { TournamentLabel } from "../match-ui";
import { Avatar } from "./fun";
import { diaryPages, eventLabel, scoreText, toMatches, type MatchRow } from "./library";
import { useLog } from "./store";

/* Finding a match: players, tournament, year and round, in any order. In the log, picking one opens its
   page below, logged or not; when exploring, it opens the story around it. */

type Results = { results: MatchRow[]; total: number; page: number; pages: number; size: number; query: string; corrected: string | null };

const examples = ["alcaraz sinner", "wimbledon 2008 final", "sabalenka ao 2023"];

/** A search for a season after the last one in the data */
const notInYet = (query: string, last: number) => (query.match(/\b(19|20)\d{2}\b/g) ?? []).some((y) => Number(y) > last);

export function MatchFinder({ seasons, explore = false, aside }: { seasons: [number, number] | null; explore?: boolean; aside?: ReactNode }) {
  const { matches, entries, view } = useLog();
  const router = useRouter();
  const pages = diaryPages(entries, matches);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [found, setFound] = useState<Results | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const typed = query.trim();

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
    if (explore) {
      setQuery("");
      return router.push(`/explore?m=${encodeURIComponent(row.id)}`, { scroll: false });
    }
    view(row);
    glideTo(document.getElementById("your-log"), "start", 0);
  };
  const first = shown ? (shown.page - 1) * shown.size + 1 : 0;

  return (
    <div className="rounded-3xl border border-line bg-surface p-4 shadow-xl shadow-court/5 sm:p-6">
      <label htmlFor="find-a-match" className="font-display text-lg font-bold">
        Find a match
        {seasons && (
          <span className="font-sans text-sm font-normal text-muted">
            {" "}
            · any tour-level singles match, {seasons[0]} to {seasons[1]}
          </span>
        )}
      </label>
      {seasons && <p className="mt-0.5 text-sm text-muted">{seasons[1]} matches may not be fully up to date.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3 sm:flex-nowrap">
        <div className="relative min-w-0 flex-1">
          <svg viewBox="0 0 20 20" aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-current stroke-2 text-muted" strokeLinecap="round">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
          <input
            id="find-a-match"
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder={`Try "${examples[0]}" or "${examples[1]}"`}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-full border-2 border-line bg-background py-3 pl-12 pr-4 text-lg font-medium placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-4 focus:ring-court/15"
          />
        </div>
        {aside}
      </div>

      {!typed && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
          Players, a tournament, a year, a round, in any order. For example:
          {examples.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => search(q)}
              className="cursor-pointer rounded-full border border-line px-2.5 py-0.5 font-semibold text-court transition hover:border-court hover:bg-court/5"
            >
              {q}
            </button>
          ))}
        </p>
      )}

      {typed && (
        <div className="mt-4" aria-live="polite" aria-busy={loading}>
          {failed ? (
            <p className="rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">Search isn&apos;t working right now. Check your connection and try again.</p>
          ) : !shown ? (
            <p className="px-1 text-muted">Searching…</p>
          ) : !shown.total ? (
            <p className="rounded-2xl bg-background px-4 py-3 text-muted">
              No matches for &ldquo;{shown.query}&rdquo;.{" "}
              {seasons && notInYet(shown.query, seasons[1])
                ? `Matches from ${seasons[1] + 1} aren't in yet.`
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
              <ol className={`mt-2 divide-y divide-line transition-opacity ${loading ? "opacity-50" : ""}`}>
                {shown.results.map((row) => {
                  const m = named[row.id];
                  const page = pages.get(row.id);
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => open(row)}
                        className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-court/5 sm:px-3"
                      >
                        <span className="flex shrink-0 -space-x-2 max-sm:hidden">
                          <Avatar name={m.winner} size="h-10 w-10 text-sm ring-2 ring-surface" />
                          <Avatar name={m.loser} size="h-10 w-10 text-sm ring-2 ring-surface" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <TournamentLabel event={eventLabel(m)} surface={m.surface} className="max-w-full text-[0.95rem]" />
                          <span className="mt-0.5 block truncate text-sm">
                            <span className="font-semibold">{row.winner.name}</span> <span className="text-muted">beat {row.loser.name}</span>{" "}
                            <span className="whitespace-nowrap font-mono text-muted">{scoreText(row.score)}</span>
                          </span>
                        </span>
                        {page && !explore ? (
                          <span className="shrink-0 rounded-full bg-ball/40 px-2.5 py-1 text-sm font-semibold">Page {page}</span>
                        ) : (
                          <span className="shrink-0 rounded-full border-2 border-line px-2.5 py-0.5 text-sm font-semibold text-court transition group-hover:border-court">
                            {explore ? "Explore" : "Open"}
                          </span>
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
                    className="cursor-pointer rounded-full border-2 border-line px-3 py-1 text-sm font-semibold transition hover:border-court hover:text-court disabled:invisible"
                  >
                    ← Newer
                  </button>
                  <span className="text-sm text-muted">
                    Page {shown.page} of {shown.pages}
                  </span>
                  <button
                    type="button"
                    disabled={shown.page >= shown.pages}
                    onClick={() => setPage(shown.page + 1)}
                    className="cursor-pointer rounded-full border-2 border-line px-3 py-1 text-sm font-semibold transition hover:border-court hover:text-court disabled:invisible"
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
  );
}
