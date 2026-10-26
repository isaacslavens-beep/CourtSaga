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
import { SearchIcon, SectionHead } from "../ui";
import { Avatar } from "./fun";
import { chapters, type Board, type BoardRow, type ChapterId, type RecordBooks } from "./records";

/* The record books on screen: find a player or pick a chapter, and read its boards. Every row opens its
   match in Explore. The boards themselves come from records.ts. */

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const exploreHref = (id: string) => `/explore?m=${encodeURIComponent(id)}`;

// Each chapter's tile photo, and the part of it to keep in frame
/** A photo across a board's top: the picture, what it shows, and where to centre it */
export type Cover = { src: StaticImageData; alt: string; position: string };

const chapterPhotos: Record<ChapterId, Cover> = {
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
  { tour: "atp", label: "Men", examples: ["Federer", "Nadal", "Alcaraz"] },
  { tour: "wta", label: "Women", examples: ["Serena", "Swiatek", "Sabalenka"] },
] as const;

// What a board's middle column holds, by what its rows are about
const subjects = { player: "Player", pair: "Head-to-head", match: "Match" } as const;

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
      <span className={`rank ${row.rank === 1 ? "rank-first" : ""}`}>{row.rank}</span>
      <span className={`flex shrink-0 -space-x-2 max-sm:hidden ${still ? "lg:hidden" : ""}`}>
        {row.players.map((k) => (
          <Avatar key={k} name={names[k] ?? "?"} size="h-8 w-8 text-sm ring-2 ring-surface" />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-snug" title={row.players.map((k) => full[k]).join(" and ")}>
          <RowTitle row={row} names={names} />
          {tag && <span className="ml-2 rounded-[3px] bg-sunk px-1.5 py-px align-middle text-[11px] font-bold text-muted ring-1 ring-inset ring-line">{tag}</span>}
        </span>
        <span className="block text-sm leading-snug text-muted">{row.note}</span>
        {row.go && (
          <span className={`block text-sm leading-snug ${still ? "text-muted" : "font-semibold text-court group-hover:underline group-hover:underline-offset-4"}`}>{row.go.text}</span>
        )}
      </span>
      <span className="stat shrink-0 pl-1 text-right text-2xl leading-none">{row.stat}</span>
    </>
  );
  const shape = "group flex w-full items-center gap-3 px-4 py-2.5 text-left sm:px-5";
  if (!row.go || still) return <div className={shape}>{body}</div>;
  return (
    <Link href={exploreHref(row.go.id)} prefetch={false} className={`${shape} transition-colors hover:bg-sunk`}>
      {body}
    </Link>
  );
}

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
  cover?: ChapterId | Cover; // a chapter's photo (or one of its own) across the top
  label?: string; // on the photo's corner, e.g. which tour
}) {
  const chapter = chapters.find((c) => c.id === board.chapter)!;
  const photo = typeof cover === "string" ? chapterPhotos[cover] : cover;
  const [viewId, setViewId] = useState(board.views[0].id);
  const [open, setOpen] = useState(false);
  const view = board.views.find((v) => v.id === viewId) ?? board.views[0];
  const found = only
    ? board.views.flatMap((v) => v.rows.filter((r) => r.players.some((k) => only.has(k))).map((r) => ({ r, tag: board.views.length > 1 ? v.label : undefined })))
    : null;
  const rows = found ?? (open ? view.rows : view.rows.slice(0, top)).map((r) => ({ r, tag: undefined }));

  return (
    <section aria-labelledby={`board-${board.id}`} className="panel overflow-hidden">
      {photo && (
        <div className="relative h-32 border-b border-line sm:h-36">
          <Image src={photo.src} alt={photo.alt} fill placeholder="blur" sizes="(min-width: 1024px) 36rem, 100vw" className={`object-cover ${photo.position}`} />
          {label && <span className="absolute left-3 top-3 rounded-[3px] bg-white px-1.5 py-0.5 text-xs font-bold ring-1 ring-black/10 sm:left-4">{label}</span>}
        </div>
      )}
      <header className="panel-head">
        <div className="min-w-0">
          {/* A search mixes the chapters, so each board says which it's from */}
          {only && <p className="text-xs font-semibold text-muted">{chapter.title}</p>}
          <h3 id={`board-${board.id}`} className="panel-title">
            {board.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted">{board.rule}</p>
        </div>
      </header>
      {!found && board.views.length > 1 && (
        <div className="border-b border-line bg-sunk px-4 py-2 sm:px-5">
          <div className="seg" role="group" aria-label={`${board.title}: show`}>
            {board.views.map((v) => (
              <button key={v.id} type="button" aria-pressed={v.id === view.id} onClick={() => setViewId(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* The columns, as a stats table heads them */}
      <div aria-hidden className="flex items-center gap-3 border-b border-line px-4 py-1.5 text-xs font-semibold text-muted sm:px-5">
        <span className="w-7 text-center">#</span>
        <span className="flex-1">{subjects[rows[0]?.r.kind ?? "player"]}</span>
        <span className="text-right">{board.unit}</span>
      </div>
      <ol className="divide-y divide-line">
        {rows.map(({ r, tag }, i) => (
          <li key={`${tag ?? view.id}-${i}`}>
            <RowLine row={r} names={books.names} full={books.full} tag={tag} still={still} />
          </li>
        ))}
      </ol>
      {/* On the landing page the rest waits for an account */}
      {!found && still && view.rows.length > top && (
        <p className="border-t border-line px-4 py-2.5 text-sm font-semibold text-muted sm:px-5">Sign up for the full list of {view.rows.length}.</p>
      )}
      {!found && !still && view.rows.length > top && (
        <div className="border-t border-line px-4 py-2.5 sm:px-5">
          <button type="button" onClick={() => setOpen(!open)} className="tag">
            {open ? `Show the top ${top}` : `Show all ${view.rows.length}`}
          </button>
        </div>
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
      {/* Find a player */}
      <div className="panel">
        <div className="panel-head">
          <label htmlFor="find-a-player" className="panel-title">
            Find a player
          </label>
          <span className="panel-meta">In every one of the {here.label.toLowerCase()}&apos;s {books.boards.length} lists</span>
        </div>
        <div className="panel-body">
          <div className="relative">
            <SearchIcon className="left-3.5" />
            <input
              id="find-a-player"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a player"
              autoComplete="off"
              spellCheck={false}
              className="field py-2.5 pl-10 text-lg"
            />
          </div>
          {!typed ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              See where a player shows up, for example:
              {here.examples.map((q) => (
                <button key={q} type="button" onClick={() => setQuery(q)} className="tag">
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
                    <button key={k} type="button" onClick={() => setQuery(books.full[k])} className="tag pl-0.5">
                      <Avatar name={books.names[k]} size="h-5 w-5 text-[10px]" />
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
            <p className="well mt-3 px-4 py-3 text-sm text-muted" aria-live="polite">
              No one called &ldquo;{typed}&rdquo; is in the {here.label.toLowerCase()}&apos;s lists. Each list keeps its top 20, so a player has to rank there to show up.
            </p>
          )}
        </div>
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
          {/* The chapters, as tiles: a photo over a strip with the name, the open one's strip in ink */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {chapters.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={chapter === c.id}
                onClick={() => setChapter(c.id)}
                className={`group flex cursor-pointer flex-col overflow-hidden rounded-md border bg-surface text-left transition-colors ${
                  chapter === c.id ? "border-foreground" : "border-line hover:border-foreground/45"
                }`}
              >
                <span className="relative block aspect-[16/10] w-full">
                  <Image src={chapterPhotos[c.id].src} alt={chapterPhotos[c.id].alt} fill placeholder="blur" sizes="(min-width: 640px) 12rem, 33vw" className={`object-cover ${chapterPhotos[c.id].position}`} />
                </span>
                <span className={`block px-2.5 py-1.5 transition-colors sm:px-3 ${chapter === c.id ? "bg-foreground text-white" : ""}`}>
                  <span className="block font-display text-sm font-bold leading-tight sm:text-base">{c.title}</span>
                  <span className={`block text-[11px] tabular-nums ${chapter === c.id ? "text-white/70" : "text-muted"}`}>
                    {books.boards.filter((b) => b.chapter === c.id).length} lists
                  </span>
                </span>
              </button>
            ))}
          </div>

          <section aria-labelledby="chapter-title" key={chapter} className="fade-in">
            <SectionHead id="chapter-title" title={current.title} body={`${current.blurb} Every line opens its match in Explore.`} />
            <div className="grid items-start gap-5 lg:grid-cols-2">
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
