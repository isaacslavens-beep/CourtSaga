"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { starMatch } from "../(app)/actions";
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
/** A search for a season before the first one in the data */
const tooEarly = (query: string, first: number) => (query.match(/\b(19|20)\d{2}\b/g) ?? []).some((y) => Number(y) < first);

/** Star a search result without opening it */
function QuickStar({ id, starred }: { id: string; starred: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={starred || pending}
      title={starred ? "Starred" : "Star this match"}
      aria-label={starred ? "Starred" : "Star this match"}
      onClick={() =>
        start(async () => {
          await starMatch(id);
          router.refresh();
        })
      }
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl transition ${
        starred ? "text-[#b08d00]" : "cursor-pointer text-muted hover:scale-110 hover:bg-ball/30 hover:text-foreground"
      } ${pending ? "animate-pulse" : ""}`}
    >
      {starred || pending ? "★" : "☆"}
    </button>
  );
}

export function MatchFinder({ seasons, explore = false, inside }: { seasons: [number, number] | null; explore?: boolean; inside?: ReactNode }) {
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
            · any tour-level singles match
          </span>
        )}
      </label>
      {seasons && <p className="mt-0.5 text-sm text-muted">{seasons[1]} matches may not be fully up to date.</p>}
      <div className="mt-3">
        <div className="relative">
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
            className={`w-full rounded-full border-2 border-line bg-background py-3 pl-12 text-lg font-medium placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-4 focus:ring-court/15 ${inside ? "pr-40 sm:pr-48" : "pr-4"}`}
          />
          {/* Something to press inside the bar's right end, e.g. Surprise me */}
          {inside && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{inside}</span>}
        </div>
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
              <ol className={`mt-2 divide-y divide-line transition-opacity ${loading ? "opacity-50" : ""}`}>
                {shown.results.map((row) => {
                  const m = named[row.id];
                  const page = pages.get(row.id);
                  return (
                    <li key={row.id} className="flex items-center gap-1">
                      {explore && <QuickStar id={row.id} starred={!!page} />}
                      <button
                        type="button"
                        onClick={() => open(row)}
                        className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-court/5 sm:px-3"
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
