"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import rivalriesPhoto from "@/public/photos/statistics/rivalries.jpg";
import eventsPhoto from "@/public/photos/statistics/events.jpg";
import streaksPhoto from "@/public/photos/statistics/streaks.jpg";
import seasonsPhoto from "@/public/photos/statistics/seasons.jpg";
import matchesPhoto from "@/public/photos/statistics/matches.jpg";
import specialistsPhoto from "@/public/photos/statistics/specialists.jpg";
import { Avatar } from "./fun";
import { chapters, type Board, type BoardRow, type ChapterId, type RecordBooks } from "./records";

/* The record books on screen: find a player or pick a chapter, and read its boards. Every row opens its
   match in Explore. The boards themselves come from records.ts. */

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const exploreHref = (id: string) => `/explore?m=${encodeURIComponent(id)}`;

// Each chapter's tile photo, and the part of it to keep in frame
const chapterPhotos: Record<ChapterId, { src: StaticImageData; alt: string; position: string }> = {
  rivalries: { src: rivalriesPhoto, alt: "Nadal and Federer side by side with their trophies", position: "object-[50%_30%]" },
  events: { src: eventsPhoto, alt: "Centre Court at Wimbledon from the stands", position: "object-center" },
  streaks: { src: streaksPhoto, alt: "Djokovic with the Australian Open trophy, fist clenched", position: "object-[45%_30%]" },
  seasons: { src: seasonsPhoto, alt: "Alcaraz smiling with the Wimbledon trophy", position: "object-[25%_25%]" },
  matches: { src: matchesPhoto, alt: "Serena Williams roaring with a raised fist at the US Open", position: "object-[40%_30%]" },
  specialists: { src: specialistsPhoto, alt: "Nadal hitting a forehand on clay at Roland Garros", position: "object-[55%_20%]" },
};

// How many rows a board shows before "Show all"
const TOP = 5;

const tours = [
  { tour: "atp", label: "Men", href: "/statistics", examples: ["Nadal", "Murray", "Alcaraz"] },
  { tour: "wta", label: "Women", href: "/statistics/women", examples: ["Serena", "Swiatek", "Sabalenka"] },
] as const;

/** Who a row is about: a player, a pair (the leader first) or a match (the winner first) */
function RowTitle({ row, names }: { row: BoardRow; names: Record<string, string> }) {
  const [a, b] = row.players.map((k) => names[k] ?? "");
  if (!b) return <span className="font-semibold">{a}</span>;
  return (
    <>
      <span className="font-semibold">{a}</span> <span className="text-muted">{row.kind === "match" ? "beat" : "v"}</span> <span className="font-semibold">{b}</span>
    </>
  );
}

function RowLine({ row, names, full, tag, still }: { row: BoardRow; names: Record<string, string>; full: Record<string, string>; tag?: string; still?: boolean }) {
  const body = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-base font-bold tabular-nums ${
          row.rank === 1 ? "bg-ball text-[#0b0d12] ring-1 ring-black/10" : "text-muted"
        }`}
      >
        {row.rank}
      </span>
      <span className={`flex shrink-0 -space-x-2 max-sm:hidden ${still ? "lg:hidden" : ""}`}>
        {row.players.map((k) => (
          <Avatar key={k} name={names[k] ?? "?"} size="h-9 w-9 text-sm ring-2 ring-surface" />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-snug" title={row.players.map((k) => full[k]).join(" and ")}>
          <RowTitle row={row} names={names} />
          {tag && <span className="ml-2 rounded-full bg-line/70 px-2 py-0.5 align-middle text-[11px] font-bold text-muted">{tag}</span>}
        </span>
        <span className="block text-sm leading-snug text-muted">{row.note}</span>
        {row.go && (
          <span className={`mt-0.5 block text-sm leading-snug ${still ? "text-muted" : "font-semibold text-court"}`}>
            {row.go.text} {!still && <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span>}
          </span>
        )}
      </span>
      <span className="shrink-0 pl-1 text-right font-display text-xl font-bold tabular-nums sm:text-2xl">{row.stat}</span>
    </>
  );
  const shape = "group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left";
  if (!row.go || still) return <div className={shape}>{body}</div>;
  return (
    <Link href={exploreHref(row.go.id)} prefetch={false} className={`${shape} transition hover:bg-court/5`}>
      {body}
    </Link>
  );
}

const chip = (on: boolean) =>
  `cursor-pointer rounded-full border-2 px-3 py-1 text-sm font-semibold transition ${on ? "border-court bg-court text-court-ink" : "border-line bg-surface text-court hover:border-court"}`;

/**
 * One board: its title and rule, a choice of views where it has several (clay, grass, hard), and its top
 * rows with the rest a click away. Given `only`, it shows just the rows about those players, from every view.
 */
export function BoardCard({
  board,
  books,
  only,
  top = TOP,
  still = false,
  cover,
  label,
}: {
  board: Board;
  books: RecordBooks;
  only?: Set<string>;
  top?: number;
  still?: boolean;
  cover?: ChapterId; // a chapter's photo across the top, with the title over it
  label?: string; // on the photo's corner, e.g. which tour
}) {
  const chapter = chapters.find((c) => c.id === board.chapter)!;
  const [viewId, setViewId] = useState(board.views[0].id);
  const [open, setOpen] = useState(false);
  const view = board.views.find((v) => v.id === viewId) ?? board.views[0];
  const found = only
    ? board.views.flatMap((v) => v.rows.filter((r) => r.players.some((k) => only.has(k))).map((r) => ({ r, tag: board.views.length > 1 ? v.label : undefined })))
    : null;
  const rows = found ?? (open ? view.rows : view.rows.slice(0, top)).map((r) => ({ r, tag: undefined }));

  return (
    <section aria-labelledby={`board-${board.id}`} className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-6">
      {cover && (
        <div className="relative -mx-4 -mt-4 mb-4 h-40 sm:-mx-6 sm:-mt-6 sm:h-44">
          <Image src={chapterPhotos[cover].src} alt={chapterPhotos[cover].alt} fill placeholder="blur" sizes="(min-width: 1024px) 24rem, 100vw" className={`object-cover ${chapterPhotos[cover].position}`} />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          {label && <span className="absolute left-4 top-3 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold tracking-wide text-[#0b0d12] shadow sm:left-6">{label}</span>}
          <h3 id={`board-${board.id}`} className="absolute inset-x-4 bottom-3 font-display text-2xl font-bold tracking-tight text-white sm:inset-x-6">
            {board.title}
          </h3>
        </div>
      )}
      <header className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          {/* A search mixes the chapters, so each board says which it's from */}
          {only && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {chapter.title}
            </p>
          )}
          {!cover && (
            <h3 id={`board-${board.id}`} className="font-display text-xl font-bold tracking-tight">
              {board.title}
            </h3>
          )}
          <p className="mt-0.5 text-sm text-muted">{board.rule}</p>
        </div>
        <span className="mt-1.5 shrink-0 text-right text-xs font-semibold uppercase tracking-wide text-muted max-sm:hidden">{board.unit}</span>
      </header>
      {!found && board.views.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2 px-1" role="group" aria-label={`${board.title}: show`}>
          {board.views.map((v) => (
            <button key={v.id} type="button" aria-pressed={v.id === view.id} onClick={() => setViewId(v.id)} className={chip(v.id === view.id)}>
              {v.label}
            </button>
          ))}
        </div>
      )}
      <ol className="mt-3 divide-y divide-line">
        {rows.map(({ r, tag }, i) => (
          <li key={`${tag ?? view.id}-${i}`}>
            <RowLine row={r} names={books.names} full={books.full} tag={tag} still={still} />
          </li>
        ))}
      </ol>
      {/* On the landing page the rest waits for an account */}
      {!found && still && view.rows.length > top && <p className="mt-2 px-2 text-sm font-semibold text-muted">Sign up for the full list of {view.rows.length}.</p>}
      {!found && !still && view.rows.length > top && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-2 cursor-pointer px-2 text-sm font-semibold text-court underline-offset-4 hover:underline">
          {open ? `Show the top ${top}` : `Show all ${view.rows.length}`}
        </button>
      )}
    </section>
  );
}

/** Players whose names start with what was typed, word by word: "rafa nad", "serena", "williams" */
function playersMatching(books: RecordBooks, query: string) {
  const words = fold(query).split(/[\s'-]+/).filter(Boolean);
  if (!words.length) return [];
  return Object.keys(books.full).filter((k) => {
    const name = fold(`${books.full[k]} ${books.names[k]}`).split(/[\s'-]+/);
    return words.every((w) => name.some((n) => n.startsWith(w)));
  });
}

/* The chapter open or the player searched for lives in the address, so a link opens the same list:
   #streaks, #find=nadal. Changing it replaces the address rather than adding to the history. */
const hashEvent = "courtsaga-hash";
const subscribeHash = (on: () => void) => {
  window.addEventListener("hashchange", on);
  window.addEventListener(hashEvent, on);
  return () => {
    window.removeEventListener("hashchange", on);
    window.removeEventListener(hashEvent, on);
  };
};
const setHash = (hash: string) => {
  history.replaceState(history.state, "", hash);
  window.dispatchEvent(new Event(hashEvent));
};
function readHash(hash: string): { chapter: ChapterId; query: string } {
  const value = decodeURIComponent(hash.slice(1));
  const chapter = chapters.find((c) => c.id === value)?.id ?? "rivalries";
  return value.startsWith("find=") ? { chapter, query: value.slice(5) } : { chapter, query: "" };
}

export function RecordsView({ books }: { books: RecordBooks }) {
  const { chapter, query } = readHash(useSyncExternalStore(subscribeHash, () => location.hash, () => ""));
  const setChapter = (c: ChapterId) => setHash(`#${c}`);
  const setQuery = (q: string) => setHash(q ? `#find=${encodeURIComponent(q)}` : `#${chapter}`);
  const typed = query.trim();
  const here = tours.find((t) => t.tour === books.tour)!;

  const matching = useMemo(() => playersMatching(books, typed), [books, typed]);
  const only = useMemo(() => new Set(matching), [matching]);
  const found = typed ? books.boards.filter((b) => b.views.some((v) => v.rows.some((r) => r.players.some((k) => only.has(k))))) : [];
  // The players a search found who are in at least one row, most rows first
  const inRows = useMemo(() => {
    const count = new Map<string, number>();
    for (const b of books.boards) for (const v of b.views) for (const r of v.rows) for (const k of r.players) if (only.has(k)) count.set(k, (count.get(k) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [books, only]);
  const shown = books.boards.filter((b) => b.chapter === chapter);
  const current = chapters.find((c) => c.id === chapter)!;

  return (
    <div className="space-y-8">
      {/* Find a player, and which tour */}
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-xl shadow-court/5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="find-a-player" className="font-display text-lg font-bold">
            Find a player <span className="font-sans text-sm font-normal text-muted">· in every list below</span>
          </label>
          <div className="flex rounded-full bg-background p-1 ring-1 ring-line" role="group" aria-label="Tour">
            {tours.map((t) => (
              <Link
                key={t.tour}
                href={`${t.href}${typed ? "" : `#${chapter}`}`}
                aria-current={t.tour === books.tour ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${t.tour === books.tour ? "bg-court text-court-ink shadow-sm" : "text-court hover:bg-court/10"}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="relative mt-3">
          <svg viewBox="0 0 20 20" aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-current stroke-2 text-muted" strokeLinecap="round">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
          <input
            id="find-a-player"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Try "${here.examples[0]}" or "${here.examples[1]}"`}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-full border-2 border-line bg-background py-3 pl-12 pr-4 text-lg font-medium placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-4 focus:ring-court/15"
          />
        </div>
        {!typed ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            See where a player shows up, for example:
            {here.examples.map((q) => (
              <button key={q} type="button" onClick={() => setQuery(q)} className="cursor-pointer rounded-full border border-line px-2.5 py-0.5 font-semibold text-court transition hover:border-court hover:bg-court/5">
                {q}
              </button>
            ))}
          </p>
        ) : inRows.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted" aria-live="polite">
            {inRows.length === 1 ? (
              <span>
                <span className="font-semibold text-foreground">{books.full[inRows[0]]}</span> is in {found.length === 1 ? "1 list" : `${found.length} lists`}.
              </span>
            ) : (
              <>
                <span>{inRows.length} players. Pick one:</span>
                {inRows.slice(0, 8).map((k) => (
                  <button key={k} type="button" onClick={() => setQuery(books.full[k])} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 font-semibold text-court transition hover:border-court hover:bg-court/5">
                    <Avatar name={books.names[k]} size="h-6 w-6 text-[10px]" />
                    {books.full[k]}
                  </button>
                ))}
              </>
            )}
            <button type="button" onClick={() => setQuery("")} className="cursor-pointer font-semibold text-court underline-offset-4 hover:underline">
              Clear
            </button>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm text-muted" aria-live="polite">
            No one called &ldquo;{typed}&rdquo; is in the {here.label.toLowerCase()}&apos;s lists. Each list keeps its top 20, so a player has to rank there to show up.
          </p>
        )}
      </div>

      {typed ? (
        // A search shows every board the players are on, with only their rows
        found.length > 0 && (
          <div className="grid items-start gap-5 lg:grid-cols-2">
            {found.map((b) => (
              <BoardCard key={b.id} board={b} books={books} only={only} />
            ))}
          </div>
        )
      ) : (
        <>
          {/* The chapters, as tiles */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={chapter === c.id}
                onClick={() => setChapter(c.id)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={`rise-in group relative flex aspect-[4/3] cursor-pointer flex-col justify-end overflow-hidden rounded-2xl text-left text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${
                  chapter === c.id ? "-translate-y-1 shadow-md ring-4 ring-ball" : "ring-1 ring-black/10"
                }`}
              >
                <Image
                  src={chapterPhotos[c.id].src}
                  alt={chapterPhotos[c.id].alt}
                  fill
                  placeholder="blur"
                  sizes="(min-width: 640px) 12rem, 33vw"
                  className={`object-cover transition-transform duration-500 group-hover:scale-105 ${chapterPhotos[c.id].position}`}
                />
                {/* A shade at the foot of the photo, so the words read on any picture */}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                <span className="relative px-2.5 pb-2 sm:px-3 sm:pb-2.5">
                  <span className="block font-display text-sm font-bold leading-tight sm:text-base">{c.title}</span>
                  <span className="block text-[11px] text-white/80">{books.boards.filter((b) => b.chapter === c.id).length} lists</span>
                </span>
              </button>
            ))}
          </div>

          <section aria-labelledby="chapter-title" key={chapter} className="fade-in">
            <h2 id="chapter-title" className="font-display text-2xl font-bold tracking-tight">
              {current.title}
            </h2>
            <p className="text-muted">{current.blurb} Every line opens its match in Explore.</p>
            <div className="mt-4 grid items-start gap-5 lg:grid-cols-2">
              {shown.map((b) => (
                <BoardCard key={`${b.id}`} board={b} books={books} />
              ))}
            </div>
          </section>
        </>
      )}

      <p className="text-sm text-muted">
        Every list counts {here.label.toLowerCase()}&apos;s tour-level singles from {books.from} to{" "}
        {new Date(`${books.last}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}, team cups and the Olympics included. Walkovers don&apos;t count
        {books.tour === "atp" ? ", and nor do the Laver Cup and the Next Gen Finals" : ""}.
      </p>
    </div>
  );
}
