"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  SAGA_MIN_MATCHES,
  bookFor,
  buildBook,
  buildShelf,
  missedMeetings,
  shelfCount,
  type BookChapter,
  type BookData,
  type Diary,
  type Entry,
  type ShelfBook,
  type StripItem,
} from "./books";
import { Avatar, BallScore, CollectionIcon, IconArrowUp, PageArrow, chartStyles } from "./fun";
import { diaryPages, endingOf, eventLabel, monthLabel, roundName, scoreText, watched, watchedHow } from "./library";
import { HighlightsLink, SlamLogo } from "../match-ui";
import { useLog } from "./store";
import { glideTo } from "../glide";
import { ShapeChart, coverPhotoOf, coverPhotos, roman, tintVars, tintsOf } from "./saga-ui";

/* Step 3: the log read back as books. They float in a reading room; pick one and it opens like a real
   book, its cover swinging round the spine onto a spread of two pages, and every page turning over to
   the next, by itself or pulled round by hand.
   A rivalry tells the whole rivalry with your meetings marked in; a collection tells your log another
   way. See books.ts for the rules: every line here comes from them, and the only free text is yours. */

type Pages = ReturnType<typeof diaryPages>;
type Tones = ReturnType<typeof chartStyles>;
type CatchUp = ReturnType<typeof missedMeetings>;
type Photo = (typeof coverPhotos)[string] | undefined;
type Flash = { key: string; n: number } | null;

// How long a page takes to turn by itself; the same as .turn-layer in globals.css
const TURN_MS = 750;

/* ---------- Covers ---------- */

/** A book's cover: its two colours or its photo, and its title on a band of its colour. The shelf shows it small. */
function CoverArt({ id, kind, title, faces, photo, big = false }: { id: string; kind: ShelfBook["kind"]; title: string; faces: string[]; photo: Photo; big?: boolean }) {
  const tones = chartStyles(faces);
  return (
    <span className={`relative flex h-full w-full grow flex-col overflow-hidden bg-[var(--tint-a)] text-left text-white ${big ? "rounded-l-md rounded-r-2xl" : "rounded-l-sm rounded-r-lg"}`}>
      {photo ? (
        // The photo fills the cover above its title band, so a landscape photo is cropped (and enlarged) as
        // little as it can be. The shelf's covers load straight away: off to the side of the strip, lazy
        // ones would wait for a scroll.
        <span className="relative block min-h-0 flex-1">
          <Image
            src={photo.src}
            alt=""
            fill
            placeholder="blur"
            sizes={big ? "(min-width: 1024px) 46rem, 125vw" : "18rem"}
            loading={big ? undefined : "eager"}
            fetchPriority={big ? undefined : "low"}
            className={`object-cover ${photo.position}`}
          />
        </span>
      ) : (
        <span aria-hidden className="absolute inset-x-0 top-[38%] h-[18%] bg-[var(--tint-b)]" />
      )}
      {/* The hinge, where the cover meets the spine */}
      <span aria-hidden className={`absolute inset-y-0 left-0 bg-black/25 ${big ? "w-4" : "w-1.5"}`} />
      <span aria-hidden className={`absolute inset-y-0 w-px bg-white/30 ${big ? "left-4" : "left-1.5"}`} />
      <span className={`relative mt-auto block bg-[color-mix(in_srgb,var(--tint-a)_42%,#0e1520)] ${big ? "px-10 pb-10 pt-8 sm:px-12" : "px-2.5 pb-2.5 pl-3.5 pt-2"}`}>
        {faces.length > 0 ? (
          <span className={`flex ${big ? "-space-x-3 pb-5" : "-space-x-2 pb-1.5"}`}>
            {faces.map((p) => (
              <Avatar key={p} name={p} tone={tones.get(p)} size={big ? "h-14 w-14 text-lg ring-2 ring-white/80" : "h-6 w-6 text-[9px] ring-1 ring-white/80"} />
            ))}
          </span>
        ) : (
          <CollectionIcon id={id} className={`text-white/90 ${big ? "mb-5 h-12 w-12" : "mb-1.5 h-5 w-5"}`} />
        )}
        <span className={`block font-semibold uppercase text-white/75 ${big ? "text-xs tracking-[0.2em]" : "text-[8px] tracking-[0.14em]"}`}>
          {kind === "rivalry" ? "A rivalry" : "A collection"}
        </span>
        <span className={`mt-1 block font-display font-bold leading-[1.02] tracking-tight ${big ? "text-5xl sm:text-6xl" : "text-[0.95rem]"}`}>{title}</span>
      </span>
    </span>
  );
}

/** The books, floating in the reading room, each bobbing to its own beat. Point at one and it turns to
    follow the pointer; the one you're reading lifts out with its ribbon hanging down. Under each, how
    much of it you've read. */
function Shelf({ shelf, bookId, counts, progress, onOpen }: { shelf: ShelfBook[]; bookId: string; counts: Map<string, number>; progress: Map<string, number>; onOpen: (id: string) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  // Whether the strip is scrolled to its start and its end
  const [ends, setEnds] = useState<[boolean, boolean]>([true, true]);
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setEnds([el.scrollLeft < 4, el.scrollLeft + el.clientWidth > el.scrollWidth - 4]);
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      watch.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, []);
  // Keep the book you're reading in sight
  useEffect(() => {
    const el = strip.current;
    const on = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !on || (on.offsetLeft >= el.scrollLeft && on.offsetLeft + on.offsetWidth <= el.scrollLeft + el.clientWidth)) return;
    el.scrollTo({ left: on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2, behavior: "smooth" });
  }, [bookId]);

  const tilt = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const book = e.currentTarget.querySelector<HTMLElement>(".lib-3d");
    if (e.pointerType !== "mouse" || !book) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    book.classList.add("tilting");
    book.style.setProperty("--ry", `${(0.5 - x) * 34 - 4}deg`);
    book.style.setProperty("--rx", `${(y - 0.5) * 16}deg`);
    book.style.setProperty("--sx", `${x * 100}%`);
    book.style.setProperty("--sy", `${y * 100}%`);
  };
  const untilt = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const book = e.currentTarget.querySelector<HTMLElement>(".lib-3d");
    book?.classList.remove("tilting");
    for (const v of ["--ry", "--rx", "--sx", "--sy"]) book?.style.removeProperty(v);
  };
  const fade = `linear-gradient(to right, ${ends[0] ? "#000" : "transparent"}, #000 3rem, #000 calc(100% - 3rem), ${ends[1] ? "#000" : "transparent"})`;

  return (
    <div className="relative">
      <div
        ref={strip}
        role="tablist"
        aria-label="Your books"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
        className="relative -mx-4 flex snap-x gap-8 overflow-x-auto px-6 pb-3 pt-9 [scrollbar-width:none] sm:mx-0 sm:gap-11 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {shelf.map((b, i) => {
          const on = b.id === bookId;
          const share = progress.get(b.id);
          return (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${b.title}: ${counts.get(b.id)} ${b.blurb}`}
              onClick={() => onOpen(b.id)}
              onPointerMove={tilt}
              onPointerLeave={untilt}
              style={{ ...tintVars(tintsOf(b.id, b.players)), "--d": `${(i * -1.3).toFixed(1)}s`, "--dur": `${5.4 + (i % 3) * 0.9}s` } as CSSProperties}
              className="lib-book group flex w-[7.25rem] shrink-0 snap-center cursor-pointer flex-col items-center text-center outline-none sm:w-36"
            >
              <span className="lib-float block">
                <span className="lib-3d relative block h-[10.5rem] w-[7.25rem] sm:h-48 sm:w-36">
                  <span aria-hidden className="lib-back" />
                  <span aria-hidden className="lib-spine" />
                  <span aria-hidden className="lib-top" />
                  <span aria-hidden className="lib-pages" />
                  {on && <span aria-hidden className="lib-ribbon" />}
                  <span aria-hidden className="lib-face">
                    <CoverArt id={b.id} kind={b.kind} title={b.title} faces={b.players} photo={coverPhotoOf(b)} />
                  </span>
                </span>
              </span>
              <span aria-hidden className="lib-shadow mt-5 block h-3 w-24 rounded-[50%] blur-[5px]" />
              <span className={`mt-2 block w-full truncate text-sm font-semibold transition-colors ${on ? "text-foreground" : "text-muted group-hover:text-foreground"}`}>{b.title}</span>
              <span className="block text-xs text-muted">
                {counts.get(b.id)} {b.blurb}
              </span>
              {share !== undefined &&
                (share >= 1 ? (
                  <span className="mt-1 text-xs font-semibold text-grass">✓ Read</span>
                ) : (
                  <span title={`${Math.round(share * 100)}% read`} className="mt-2 block h-1 w-14 overflow-hidden rounded-full bg-black/10">
                    <span className="block h-full rounded-full bg-[var(--tint-a)] transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
                  </span>
                ))}
            </button>
          );
        })}
      </div>
      {/* More books along the strip */}
      {([-1, 1] as const).map((dir) =>
        ends[dir < 0 ? 0 : 1] ? null : (
          <button
            key={dir}
            type="button"
            aria-label={dir < 0 ? "Earlier books" : "More books"}
            onClick={() => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.7, behavior: "smooth" })}
            className={`absolute top-[6.5rem] z-10 hidden h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-surface text-foreground shadow-lg ring-1 ring-black/10 transition hover:scale-110 sm:flex ${dir < 0 ? "-left-3" : "-right-3"}`}
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d={dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
            </svg>
          </button>
        ),
      )}
    </div>
  );
}

/* ---------- Paper ---------- */

/** One page: warm paper, a running head, a page number, and the spine's shade along its inner edge. */
function Paper({ side, number, head, children }: { side: "left" | "right"; number: number | null; head: string; children: ReactNode }) {
  const left = side === "left";
  return (
    <div className={`relative flex h-full flex-col bg-[var(--paper)] px-7 pb-7 pt-6 text-[var(--ink)] sm:px-10 lg:h-[40rem] lg:px-12 ${left ? "rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none" : "max-lg:border-t max-lg:border-[var(--paper-edge)] lg:rounded-r-2xl"}`}>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 w-14 max-lg:hidden ${left ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"} from-black/[0.08] to-transparent`}
      />
      {/* Title pages go without, as in a printed book */}
      <p className={`relative truncate text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted ${left ? "" : "lg:text-right"}`}>{head || "\u00a0"}</p>
      {/* Every page is the same size on wider screens: a long one scrolls within itself */}
      <div className="relative isolate mt-7 flex flex-1 lg:mt-4 flex-col [scrollbar-width:thin] lg:-mx-3 lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:px-3 lg:pt-3">{children}</div>
      {number !== null && <p className={`relative mt-8 font-mono text-xs text-muted ${left ? "" : "text-right"}`}>{number}</p>}
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--tint-a)_60%,var(--ink))]">{children}</p>;
}

function Heading({ children, big = false }: { children: ReactNode; big?: boolean }) {
  return <h3 className={`mt-3 font-display font-bold leading-[1.04] tracking-tight ${big ? "text-5xl sm:text-6xl" : "text-4xl sm:text-[2.6rem]"}`}>{children}</h3>;
}

function Faces({ names, size, tones }: { names: string[]; size: string; tones?: Tones }) {
  const t = tones ?? chartStyles(names);
  return names.map((p) => <Avatar key={p} name={p} size={size} tone={t.get(p)} />);
}

/** Back to a match's page in the log, to read or change it. In a shared saga, just where it is. */
function PageLink({ page, onClick }: { page: number | undefined; onClick?: () => void }) {
  if (!onClick) return <span className="whitespace-nowrap text-xs font-semibold text-muted">p. {page}</span>;
  const label = `Open page ${page} in the log`;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-[color-mix(in_srgb,var(--tint-a)_60%,var(--ink))] transition hover:bg-black/5"
    >
      <IconArrowUp className="h-3 w-3" />
      p. {page}
    </button>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--tint-a)_14%,transparent)] px-2 py-0.5 text-xs font-semibold">{children}</span>;
}

/** The fan's words, set as a pull quote, always saying which match they're about */
function Quote({ note, id, date, pages, big = false }: { note: string; id: string; date: string; pages: Pages; big?: boolean }) {
  const { matches } = useLog();
  const m = matches[id];
  return (
    <figure className="relative">
      <span aria-hidden className="absolute -left-1 -top-6 font-display text-7xl leading-none text-[color-mix(in_srgb,var(--tint-a)_55%,transparent)]">
        &ldquo;
      </span>
      <blockquote className={`relative pt-4 font-display font-semibold leading-snug tracking-tight ${big ? "text-3xl" : "text-2xl"}`}>{note}</blockquote>
      {m && (
        <figcaption className="mt-3 text-sm text-muted">
          Your words, page {pages.get(id)} · <span className="font-semibold text-[var(--ink)]">{eventLabel(m)}</span> · {monthLabel(date)}
        </figcaption>
      )}
    </figure>
  );
}

/* ---------- The pages of a book ---------- */

/** Facing the title page: the book's photo, and the best thing you wrote in it */
function Frontispiece({ book, photo, best, pages }: { book: BookData; photo: Photo; best: { note: string; id: string; date: string } | null; pages: Pages }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-8">
      {photo && (
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-black/10">
            <Image src={photo.src} alt={photo.alt} fill placeholder="blur" sizes="(min-width: 1024px) 38rem, 135vw" className={`object-cover ${photo.position}`} />
          </div>
          <figcaption className="mt-2 text-xs italic text-muted">{photo.alt}</figcaption>
        </figure>
      )}
      {best ? (
        <Quote note={best.note} id={best.id} date={best.date} pages={pages} big={!photo} />
      ) : (
        !photo && (
          <div className="flex flex-col items-center gap-4 text-center text-muted">
            {book.faces.length > 0 ? (
              <span className="flex -space-x-4">
                <Faces names={book.faces} size="h-20 w-20 text-2xl ring-4 ring-[var(--paper)]" />
              </span>
            ) : null}
            <p className="text-sm">Every page in this book comes from your log.</p>
          </div>
        )
      )}
    </div>
  );
}

type Contents = { label: string; title: string; page: number; spread: number }[];

function TitlePage({ book, contents, catchUp, onJump }: { book: BookData; contents: Contents; catchUp: CatchUp | null; onJump: (spread: number) => void }) {
  const missed = catchUp?.missed.length ?? 0;
  return (
    <>
      <Kicker>{book.kind === "rivalry" ? "A rivalry" : "A collection"}</Kicker>
      <Heading big>{book.title}</Heading>
      <p className="mt-4 text-lg leading-relaxed text-muted">{book.subtitle}</p>
      <nav aria-label="Contents" className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Contents</p>
        <ol className="mt-3 space-y-1">
          {contents.map((c) => (
            <li key={c.page}>
              <button type="button" onClick={() => onJump(c.spread)} className="group flex w-full cursor-pointer items-baseline gap-3 rounded-lg py-1 text-left">
                <span className="w-12 shrink-0 text-sm tabular-nums text-muted">{c.label}</span>
                <span className="min-w-0 font-medium group-hover:underline group-hover:underline-offset-4">{c.title}</span>
                <span aria-hidden className="mx-1 flex-1 translate-y-[-0.2rem] border-b border-dotted border-black/20" />
                <span className="font-mono text-sm tabular-nums text-muted">{c.page}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {missed > 0 && (
        <button
          type="button"
          onClick={() => onJump(1)}
          className="mt-auto inline-flex w-fit cursor-pointer items-center gap-2 pt-6 text-sm font-semibold text-[color-mix(in_srgb,var(--tint-a)_60%,var(--ink))] hover:underline hover:underline-offset-4"
        >
          {missed === 1 ? "1 meeting you missed" : `${missed} meetings you missed`}: where to catch up →
        </button>
      )}
    </>
  );
}

function GlanceFigure({ book, spotId, onYear, onMark }: { book: BookData; spotId: string | null; onYear: ((year: string) => void) | null; onMark: (item: StripItem) => void }) {
  return (
    <>
      <Kicker>At a glance</Kicker>
      <Heading>{book.kind === "rivalry" ? "The head-to-head" : "Every match"}</Heading>
      <div className="mt-8">
        <ShapeChart
          book={book}
          caption={`${book.stripCaption} ${onYear ? "Pick a meeting or a year" : "Pick a match"} to turn to its chapter.`}
          spotId={spotId}
          onGroup={onYear ?? undefined}
          onMark={onMark}
        />
      </div>
    </>
  );
}

/** Facts as a book sets them: a small label, then the thing itself */
function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-black/10 border-y border-black/10">
      {rows.map(([label, value]) => (
        <div key={label} className="py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</dt>
          <dd className="mt-1 text-xl font-semibold leading-snug">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function GlanceNumbers({ book, catchUp }: { book: BookData; catchUp: CatchUp | null }) {
  return (
    <>
      <Kicker>In numbers</Kicker>
      <div className="mt-5">
        <Facts rows={book.facts} />
      </div>
      {catchUp && catchUp.missed.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Still to watch</p>
          <p className="mt-1 text-sm text-muted">
            {catchUp.missed.length} of {catchUp.total} meetings aren&apos;t in your log. Start with:
          </p>
          <ol className="mt-3 space-y-3">
            {catchUp.missed.slice(0, 3).map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {x.event} {x.year}
                  </span>
                  <span className="block text-sm text-muted">{x.round}</span>
                </span>
                <HighlightsLink players={catchUp.players} event={`${x.event} ${x.year} · ${x.round}`} className="shrink-0" />
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
  );
}

/** A chapter's story: where it starts, what happened, and what you said about it */
function ChapterStory({ chapter, index, book, pages }: { chapter: BookChapter; index: number; book: BookData; pages: Pages }) {
  const tones = chartStyles(book.faces);
  const score = book.kind === "rivalry" ? chapter.footer.score : undefined;
  const year = /^\d{4}$/.test(chapter.year);
  return (
    <>
      {/* The chapter's year, large and faint behind it */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 right-0 -z-10 select-none font-display text-[8.5rem] font-bold leading-none tracking-tighter text-[color-mix(in_srgb,var(--tint-a)_10%,transparent)]"
      >
        {year ? `\u2019${chapter.year.slice(2)}` : roman(index + 1)}
      </span>
      <Kicker>
        Chapter {roman(index + 1)} · {chapter.year}
      </Kicker>
      <Heading>{chapter.title}</Heading>
      {chapter.previously && <p className="mt-3 text-sm italic text-muted">Previously: {chapter.previously}</p>}
      <p className="mt-5 text-lg leading-relaxed">{chapter.side}</p>
      {chapter.notes.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm font-semibold text-muted">
          {chapter.notes.map((n) => (
            <li key={n}>— {n}</li>
          ))}
        </ul>
      )}
      {chapter.epigraph && (
        <div className="mt-9">
          <Quote note={chapter.epigraph.note} id={chapter.epigraph.id} date={chapter.epigraph.date} pages={pages} />
        </div>
      )}
      <div className="mt-auto pt-10">
        {score ? (
          <div className="flex items-center gap-3" aria-hidden>
            <Avatar name={book.faces[0]} size="h-8 w-8 text-xs" tone={tones.get(book.faces[0])} />
            <span className="font-display text-2xl font-bold tabular-nums">{score[0]}</span>
            <span className="flex h-1.5 flex-1 gap-[2px]">
              <span className="rounded-l-full bg-[var(--tint-a)]" style={{ width: `${(score[0] / (score[0] + score[1])) * 100}%` }} />
              <span className="flex-1 rounded-r-full bg-[var(--tint-b)]" />
            </span>
            <span className="font-display text-2xl font-bold tabular-nums">{score[1]}</span>
            <Avatar name={book.faces[1]} size="h-8 w-8 text-xs" tone={tones.get(book.faces[1])} />
          </div>
        ) : (
          chapter.footer.share !== null && (
            <div className="flex h-1.5 gap-[2px]" aria-hidden>
              <span className="rounded-l-full bg-[var(--tint-a)]" style={{ width: `${chapter.footer.share * 100}%` }} />
              <span className="flex-1 rounded-r-full bg-black/10" />
            </div>
          )
        )}
        <p className="mt-2.5 text-sm text-muted">
          {chapter.footer.label} <span className="font-semibold text-[var(--ink)]">{chapter.footer.value}</span>
        </p>
      </div>
    </>
  );
}

/** One match in a chapter: where and what, then what you made of it. A meeting you didn't log is quieter. */
function MatchLine({ entry, pages, compact, isEpigraph, flash, onEdit }: { entry: Entry; pages: Pages; compact: boolean; isEpigraph: boolean; flash: boolean; onEdit?: (id: string) => void }) {
  const glow = flash ? "spot-flash" : "";
  if (entry.kind === "other") {
    const { meet } = entry;
    const ending = meet.score ? endingOf({ score: meet.score, loser: entry.loser }) : null;
    return (
      <li data-focus={`other-${entry.key}`} className={`rounded-lg py-3 ${glow}`}>
        <p className="flex items-baseline justify-between gap-3 text-sm text-muted">
          <span className="truncate">
            {meet.event} {meet.date.slice(0, 4)} · {roundName(meet)}
          </span>
          <span className="shrink-0 text-xs">Not starred</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted">
          <span>
            <span className="font-semibold">{meet.winner}</span> beat {entry.loser}
          </span>
          {meet.score && <span className="font-mono text-xs">{scoreText(meet.score)}</span>}
          {ending && <span className="text-xs">· {ending}</span>}
          {entry.marks.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          <span className="ml-auto">
            <HighlightsLink players={[meet.winner, entry.loser]} event={`${meet.event} ${meet.date.slice(0, 4)} · ${roundName(meet)}`} />
          </span>
        </div>
      </li>
    );
  }

  const { m, fan } = entry;
  const side = fan.cheering ?? fan.pick?.winner ?? null;
  const page = pages.get(m.id);
  const edit = onEdit && (() => onEdit(m.id));
  if (compact) {
    return (
      <li data-beat={m.id} className={`flex items-center gap-3 rounded-lg py-2 ${glow}`}>
        <SlamLogo event={m.event} size="h-6 w-6" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{eventLabel(m)}</span>
          <span className="block truncate text-xs text-muted">
            {m.winner} beat {m.loser}
            {!watched(fan) && " · starred, not watched"}
            {entry.marks.length > 0 && <span className="font-semibold text-[var(--ink)]"> · {entry.marks.join(" · ")}</span>}
          </span>
        </span>
        <BallScore value={fan.rating} size="xs" />
        <PageLink page={page} onClick={edit} />
      </li>
    );
  }
  return (
    <li data-beat={m.id} className={`rounded-lg py-3.5 ${glow}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 font-semibold">
          <SlamLogo event={m.event} size="h-6 w-6" />
          <span className="truncate">{eventLabel(m)}</span>
        </p>
        <BallScore value={fan.rating} size="xs" />
      </div>
      <p className="mt-1 text-sm">
        <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>{" "}
        <span className="whitespace-nowrap font-mono text-xs text-muted">{scoreText(m.score)}</span>
      </p>
      {entry.detail && <p className="mt-0.5 text-sm text-muted">{entry.detail}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* Watched, or starred to remember without watching */}
        {watched(fan) ? (
          <span className="whitespace-nowrap rounded-full bg-[var(--ink)] px-2 py-0.5 text-xs font-semibold text-white">Watched {watchedHow(fan.watchedOn)}</span>
        ) : (
          <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">☆ Starred, not watched</span>
        )}
        {entry.marks.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
        {side && (
          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${side === m.winner ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
            {side === m.winner ? "✓" : "✗"} Backed {side}
          </span>
        )}
        <span className="ml-auto">
          <PageLink page={page} onClick={edit} />
        </span>
      </div>
      {fan.note && !isEpigraph && <p className="mt-2 text-sm italic text-muted">&ldquo;{fan.note}&rdquo;</p>}
    </li>
  );
}

function ChapterMatches({ chapter, book, pages, spot, focus, onEdit }: { chapter: BookChapter; book: BookData; pages: Pages; spot: Flash; focus: Flash; onEdit?: (id: string) => void }) {
  const n = chapter.entries.length;
  return (
    <>
      <Kicker>{book.kind === "rivalry" ? (n === 1 ? "The meeting" : `The ${n} meetings`) : n === 1 ? "The match" : `The ${n} matches`}</Kicker>
      <ol className="mt-3 divide-y divide-black/10">
        {chapter.entries.map((e) => {
          const key = e.kind === "logged" ? e.id : `other-${e.key}`;
          const flash = (e.kind === "logged" && spot?.key === e.id) || focus?.key === key;
          return (
            <MatchLine
              // A fresh key replays the flash
              key={flash ? `${key}-${spot?.n ?? 0}-${focus?.n ?? 0}` : key}
              entry={e}
              pages={pages}
              compact={chapter.compact}
              isEpigraph={e.kind === "logged" && chapter.epigraph?.id === e.id}
              flash={flash}
              onEdit={onEdit}
            />
          );
        })}
      </ol>
    </>
  );
}

function Stands({ book }: { book: BookData }) {
  const { big } = book.epilogue;
  const [a, b] = big;
  const tones = chartStyles(book.faces);
  return (
    <>
      <Kicker>So far</Kicker>
      <Heading>Where it stands</Heading>
      {book.kind === "rivalry" ? (
        <div className="mt-auto pb-4 pt-10">
          <div className="flex items-end justify-between gap-4">
            {[a, b].map((s, k) => (
              <div key={s.label} className={`flex flex-col gap-3 ${k ? "items-end" : ""}`}>
                <Avatar name={s.label} size="h-14 w-14 text-lg" tone={tones.get(s.label)} />
                <span className="font-display text-8xl font-bold leading-none tabular-nums">{s.n}</span>
                <span className="text-sm font-semibold text-muted">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex h-2 gap-[2px]" aria-hidden>
            <span className="rounded-l-full bg-[var(--tint-a)]" style={{ width: `${(a.n / (a.n + b.n)) * 100}%` }} />
            <span className="flex-1 rounded-r-full bg-[var(--tint-b)]" />
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap gap-x-12 gap-y-8 pb-4 pt-10">
          {big.map(({ label, n }) => (
            <div key={label}>
              <p className="font-display text-8xl font-bold leading-none tabular-nums">{n}</p>
              <p className="mt-2 font-semibold text-muted">{label}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Afterword({ book, next, coda }: { book: BookData; next: { title: string; open: () => void }; coda: string }) {
  const { facts, favourite } = book.epilogue;
  return (
    <>
      <Facts rows={facts} />
      {favourite && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Your favourite</p>
          <p className="mt-1 text-xl font-semibold">{favourite.label}</p>
          {favourite.note && <p className="mt-1 italic text-muted">&ldquo;{favourite.note}&rdquo;</p>}
        </div>
      )}
      <div className="mt-auto pt-10">
        <p className="font-display text-2xl font-semibold tracking-tight">{coda}</p>
        <button
          type="button"
          onClick={next.open}
          className="mt-4 cursor-pointer rounded-full bg-[var(--ink)] px-5 py-2.5 font-semibold text-white shadow-md transition hover:brightness-125"
        >
          Read next: {next.title} →
        </button>
      </div>
    </>
  );
}

/* ---------- The saga ---------- */

type Page = { key: string; head: string; node: ReactNode };
// A page on its way over: turned by a click (it swings by itself) or by hand (it follows the pointer)
type Turn = { from: number; to: number; by: "click" | "hand" };
// A page held by its edge: where it was picked up, how far over it is, and how fast it's moving
type Pull = { to: number; dir: 1 | -1; spine: number; grab: number; t: number; moved: boolean; x: number; at: number; v: number };

// Somewhere from 0 to n - 1, for the random page
const anyOf = (n: number) => Math.floor(Math.random() * n);

// Phones and reduced motion turn straight to the next spread, with no leaf
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(min-width: 1024px)").matches;

const Dice = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={`fill-none stroke-current stroke-2 ${className}`} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export function SagaSection() {
  const { mode, matches, entries, order, records, spotlight, openInLog } = useLog();
  const log: Diary = useMemo(() => ({ matches, entries, order, records }), [matches, entries, order, records]);
  const diary = diaryPages(entries, matches); // each match's page number in the log
  const shelf = buildShelf(log);
  const counts = new Map(shelf.map((b) => [b.id, shelfCount(b.id, log)]));
  const [bookId, setBookId] = useState(shelf[0]?.id ?? "seasons");
  // Which spread of two pages is open: -1 is the closed book, showing its cover
  const [spread, setSpread] = useState(-1);
  const [turn, setTurn] = useState<Turn | null>(null);
  // A match picked in the chart: its chapter opens and its line flashes
  const [focus, setFocus] = useState<Flash>(null);
  // The spreads of each book you've had open, for the shelf to show how far you've read
  const [read, setRead] = useState<Record<string, number[]>>({});

  // Arriving from the ranking: open the match's book straight at its chapter
  const [seenSpot, setSeenSpot] = useState(0);
  if (spotlight?.target === "story" && spotlight.n !== seenSpot) {
    setSeenSpot(spotlight.n);
    const target = matches[spotlight.id] ? bookFor(spotlight.id, log) : (shelf[0]?.id ?? "seasons");
    const chapterIdx = buildBook(target, log).chapters.findIndex((c) => c.entries.some((e) => e.kind === "logged" && e.id === spotlight.id));
    setBookId(target);
    setTurn(null);
    setSpread(chapterIdx < 0 ? 0 : 2 + chapterIdx);
  }
  const spot: Flash = spotlight?.target === "story" ? { key: spotlight.id, n: spotlight.n } : null;

  const bookRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const pull = useRef<Pull | null>(null);
  const release = useRef(0);
  useEffect(() => {
    if (spotlight?.target !== "story") return;
    const line = bookRef.current?.querySelector(`[data-beat="${spotlight.id}"]`);
    glideTo(line ?? bookRef.current, line ? "center" : "start");
  }, [spotlight]);
  useEffect(() => {
    if (!focus) return;
    const line = bookRef.current?.querySelector(`[data-focus="${focus.key}"], [data-beat="${focus.key}"]`);
    if (line && line.getBoundingClientRect().bottom > innerHeight) glideTo(line, "center");
  }, [focus]);

  // A clicked page swings over by itself, then the book settles on its new spread
  useEffect(() => {
    if (turn?.by !== "click") return;
    const to = turn.to;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => layerRef.current?.style.setProperty("--turn", "1"));
    });
    const done = setTimeout(() => {
      setSpread(to);
      setTurn(null);
    }, TURN_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [turn]);
  useEffect(() => {
    const pending = release;
    return () => clearTimeout(pending.current);
  }, []);

  const swipeX = useRef<number | null>(null);

  if (!shelf.length) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg font-medium text-muted">
        Log {SAGA_MIN_MATCHES} matches to start your saga.
      </p>
    );
  }

  const shelfBook = shelf.find((b) => b.id === bookId) ?? shelf[0];
  const book = buildBook(shelfBook.id, log);
  const rivalry = book.kind === "rivalry";
  const photo = coverPhotoOf(shelfBook);
  const tints = tintsOf(shelfBook.id, shelfBook.players);
  const catchUp = rivalry ? missedMeetings(shelfBook.id, log) : null;
  const nextBook = shelf[(shelf.findIndex((b) => b.id === shelfBook.id) + 1) % shelf.length];
  const spotId = spot && book.chapters.some((c) => c.entries.some((e) => e.kind === "logged" && e.id === spot.key)) ? spot.key : null;
  // Back to the match's page in the log: further up the demo, or the log page of a diary. A shared saga is read-only.
  const editInLog =
    mode === "shared"
      ? undefined
      : (id: string) => {
          openInLog(id);
          if (mode === "demo") glideTo(document.getElementById("star"), "start", 0);
        };

  // The best thing you wrote anywhere in the book, for the page facing its title
  const best =
    book.chapters
      .flatMap((c) => c.entries)
      .flatMap((e) => (e.kind === "logged" && e.fan.note ? [e] : []))
      .sort((a, b) => (b.fan.rating ?? 0) - (a.fan.rating ?? 0) || b.fan.watchedDate.localeCompare(a.fan.watchedDate))
      .map((e) => ({ note: e.fan.note, id: e.id, date: e.fan.watchedDate }))[0] ?? null;

  /* Every turn goes through here. On a phone the spread just changes; on wider screens a leaf turns over. */
  const turnTo = (from: number, to: number) => {
    if (still()) {
      // A phone shows both pages one above the other, so start the new ones from the top
      const top = bookRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) glideTo(bookRef.current, "start", 72);
      return setSpread(to);
    }
    setTurn({ from, to, by: "click" });
  };

  // Two spreads to open the book, one per chapter, and one to end it
  const spreads = book.chapters.length + 3;
  const current = Math.min(spread, spreads - 1);
  const spreadsOf = (id: string) => (id === shelfBook.id ? book : buildBook(id, log)).chapters.length + 3;

  // Note each spread as it's read
  if (current >= 0 && !turn && !read[shelfBook.id]?.includes(current)) {
    setRead((r) => ({ ...r, [shelfBook.id]: [...(r[shelfBook.id] ?? []), current] }));
  }
  const progress = new Map(Object.entries(read).map(([id, seen]) => [id, seen.length / spreadsOf(id)]));

  function go(to: number) {
    const target = Math.max(-1, Math.min(spreads - 1, to));
    if (turn || target === current) return;
    // Whatever was clicked on the page is about to be turned away, so keep the keys turning pages
    if (bookRef.current?.contains(document.activeElement)) bookRef.current.focus({ preventScroll: true });
    turnTo(current, target);
  }
  // Picking a book takes it off the shelf, closed, and opens it: at its title page, or wherever asked
  function openBook(id: string, at = 0) {
    if (id === shelfBook.id && current >= 0) return go(at);
    setBookId(id);
    setTurn(null);
    setSpread(-1);
    setFocus(null);
    turnTo(-1, at);
  }
  // A random chapter of a random book
  function surprise() {
    const pick = shelf[anyOf(shelf.length)];
    const chapters = spreadsOf(pick.id) - 3;
    let at = 2 + anyOf(chapters);
    if (pick.id === shelfBook.id && at === current) at = 2 + ((at - 1) % chapters);
    openBook(pick.id, at);
  }

  /* Pulling a page by its edge. The leaf's edge follows the pointer round the spine; let go past the
     middle, or with a flick, and it turns over; otherwise it falls back. A press without a pull turns it. */
  function grab(e: ReactPointerEvent, dir: 1 | -1) {
    const to = shown + dir;
    if (e.button !== 0 || turn || to < 0 || to > spreads - 1) return;
    if (still()) return go(to);
    const slide = slideRef.current?.getBoundingClientRect();
    if (!slide) return;
    e.preventDefault();
    pull.current = { to, dir, spine: slide.left + slide.width / 2, grab: e.clientX, t: 0, moved: false, x: e.clientX, at: e.timeStamp, v: 0 };
    setTurn({ from: current, to, by: "hand" });
    const move = (ev: PointerEvent) => {
      const p = pull.current;
      if (!p) return;
      // How far the leaf's edge is from the spine, as a share of where it was picked up
      const reach = (ev.clientX - p.spine) / (p.grab - p.spine);
      p.t = Math.acos(Math.max(-1, Math.min(1, reach))) / Math.PI;
      p.moved ||= Math.abs(ev.clientX - p.grab) > 4;
      p.v = (ev.clientX - p.x) / Math.max(1, ev.timeStamp - p.at);
      p.x = ev.clientX;
      p.at = ev.timeStamp;
      layerRef.current?.style.setProperty("--turn", String(p.t));
    };
    const drop = () => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", drop);
      removeEventListener("pointercancel", drop);
      const p = pull.current;
      pull.current = null;
      if (!p) return;
      // Towards the spine is leftwards for a forward turn and rightwards for a back one
      const flick = -p.dir * p.v > 0.35;
      const over = !p.moved || p.t > 0.4 || (flick && p.t > 0.04);
      const ms = Math.round(Math.max(220, TURN_MS * (over ? 1 - p.t : p.t)));
      const layer = layerRef.current;
      if (layer) {
        layer.classList.remove("held");
        layer.style.transitionDuration = `${ms}ms`;
        layer.style.setProperty("--turn", over ? "1" : "0");
      }
      release.current = window.setTimeout(() => {
        if (over) setSpread(p.to);
        setTurn(null);
      }, ms);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", drop);
    addEventListener("pointercancel", drop);
  }

  // The book's pages, in pairs: frontispiece and title, the chart and its numbers, a spread per chapter, the ending
  const chapterSpread = (i: number) => 2 + i;
  const chapterLabel = (c: BookChapter, i: number) => (/^\d{4}$/.test(c.year) ? c.year : roman(i + 1));
  const pages: Page[] = [
    { key: "front", head: book.title, node: <Frontispiece book={book} photo={photo} best={best} pages={diary} /> },
    {
      key: "title",
      head: "",
      node: (
        <TitlePage
          book={book}
          catchUp={catchUp}
          onJump={(s) => go(s)}
          contents={[
            { label: "", title: "At a glance", page: 3, spread: 1 },
            ...book.chapters.map((c, i) => ({ label: chapterLabel(c, i), title: c.title, page: 5 + i * 2, spread: chapterSpread(i) })),
            { label: "", title: "Where it stands", page: 5 + book.chapters.length * 2, spread: chapterSpread(book.chapters.length) },
          ]}
        />
      ),
    },
    {
      key: "glance",
      head: book.title,
      node: (
        <GlanceFigure
          book={book}
          spotId={spotId}
          onYear={rivalry ? (year) => go(chapterSpread(book.chapters.findIndex((c) => c.year === year))) : null}
          onMark={(x) => {
            const at = book.chapters.findIndex((c) => c.entries.some((e) => (e.kind === "logged" ? e.id === x.logId : e.key === x.key)));
            if (at < 0) return;
            setFocus((f) => ({ key: x.logId ?? `other-${x.key}`, n: (f?.n ?? 0) + 1 }));
            go(chapterSpread(at));
          }}
        />
      ),
    },
    { key: "numbers", head: "At a glance", node: <GlanceNumbers book={book} catchUp={catchUp} /> },
    ...book.chapters.flatMap((c, i): Page[] => [
      { key: `${c.key}-story`, head: book.title, node: <ChapterStory chapter={c} index={i} book={book} pages={diary} /> },
      {
        key: `${c.key}-matches`,
        head: `Chapter ${roman(i + 1)} · ${c.year}`,
        node: <ChapterMatches chapter={c} book={book} pages={diary} spot={spotId ? spot : null} focus={focus} onEdit={editInLog} />,
      },
    ]),
    { key: "stands", head: book.title, node: <Stands book={book} /> },
    {
      key: "next",
      head: "The end, for now",
      node: <Afterword book={book} next={{ title: nextBook.title, open: () => openBook(nextBook.id) }} coda={mode === "demo" ? "To be continued in 2027." : "To be continued."} />,
    },
  ];
  // The stops along the chapter bar under the book
  const stops = [
    { short: "Title", long: "Title page and contents" },
    { short: "Glance", long: "At a glance" },
    ...book.chapters.map((c, i) => ({ short: chapterLabel(c, i), long: `Chapter ${roman(i + 1)}: ${c.title}` })),
    { short: "End", long: "Where it stands" },
  ];

  const coverArt = <CoverArt id={shelfBook.id} kind={book.kind} title={book.title} faces={book.faces} photo={photo} big />;
  const cover = (
    <button type="button" onClick={() => go(0)} aria-label={`Open ${book.title}`} className="cover-peek relative flex h-full min-h-[26rem] w-full cursor-pointer flex-col text-left lg:min-h-[40rem]">
      {coverArt}
      <span aria-hidden className="nudge absolute right-5 top-5 rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-[#0e1520] shadow-lg">
        Open the book ›
      </span>
    </button>
  );
  const page = (i: number, side: "left" | "right") =>
    i >= 0 && i < pages.length ? (
      <Paper side={side} number={i === 0 ? null : i + 1} head={pages[i].head}>
        {pages[i].node}
      </Paper>
    ) : null;

  // What lies open, and what's on the two faces of a leaf mid-turn
  let left: ReactNode = null;
  let right: ReactNode = null;
  let leaf: { forward: boolean; front: ReactNode; back: ReactNode } | null = null;
  if (turn && turn.to > turn.from) {
    left = page(2 * turn.from, "left");
    right = page(2 * turn.to + 1, "right");
    leaf = { forward: true, front: turn.from < 0 ? coverArt : page(2 * turn.from + 1, "right"), back: page(2 * turn.to, "left") };
  } else if (turn) {
    left = turn.to < 0 ? null : page(2 * turn.to, "left");
    right = page(2 * turn.from + 1, "right");
    leaf = { forward: false, front: page(2 * turn.from, "left"), back: turn.to < 0 ? coverArt : page(2 * turn.to + 1, "right") };
  } else if (current >= 0) {
    left = page(2 * current, "left");
    right = page(2 * current + 1, "right");
  }
  const closed = current < 0 && !turn;
  const closing = !!turn && turn.to < 0;
  const opening = !!turn && turn.from < 0;
  const opened = current >= 0 || !!turn;
  const shown = turn ? turn.to : current;
  const backLabel = shown <= 0 ? "Close the book" : "Turn back a page";
  const forwardLabel = shown < 0 ? "Open the book" : shown === spreads - 1 ? `Next book: ${nextBook.title}` : "Turn the page";
  const forward = () => (shown === spreads - 1 ? openBook(nextBook.id) : go(shown + 1));
  const where =
    shown < 0
      ? "Closed"
      : shown === 0
        ? "Contents"
        : shown === 1
          ? "At a glance"
          : shown === spreads - 1
            ? "Where it stands"
            : `Chapter ${roman(shown - 1)} of ${roman(book.chapters.length)}`;
  const readHere = read[shelfBook.id] ?? [];
  const toolButton = "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-muted transition hover:bg-black/5 hover:text-foreground";

  return (
    <div>
      <Shelf shelf={shelf} bookId={shelfBook.id} counts={counts} progress={progress} onOpen={openBook} />
      {/* How the saga grows. Not on someone else's shared saga. */}
      {mode !== "shared" && (
        <p className="mt-3 flex items-start gap-2.5 text-sm text-muted sm:items-center">
          <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ball text-xs font-bold text-[#0b0d12]">
            +
          </span>
          <span>
            The more matches you star, the more your saga grows.{" "}
            {mode === "diary" && (
              <Link href="/star" className="font-semibold text-foreground underline underline-offset-4">
                Star a match
              </Link>
            )}
          </span>
        </p>
      )}

      <div
        style={tintVars(tints)}
        className="book mt-8"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") forward();
          if (e.key === "ArrowLeft") go(shown - 1);
        }}
      >
        {/* Where you are in the book */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <p className="text-muted">
            <span className="font-semibold text-foreground">{book.title}</span> · {where}
          </p>
          <p className="flex flex-wrap gap-1">
            <button type="button" onClick={surprise} className={toolButton}>
              <Dice className="h-4 w-4" />
              Random page
            </button>
            {opened && (
              <>
                <button type="button" onClick={() => go(0)} className={toolButton}>
                  Contents
                </button>
                <button type="button" onClick={() => go(-1)} className={toolButton}>
                  Close
                </button>
              </>
            )}
          </p>
        </div>

        <div className="relative mt-4">
          <div
            ref={bookRef}
            tabIndex={0}
            aria-label={`${book.title}. Use the arrow keys to turn the pages.`}
            onPointerDown={(e) => {
              if (e.pointerType === "touch") swipeX.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (swipeX.current === null) return;
              const dx = e.clientX - swipeX.current;
              swipeX.current = null;
              if (Math.abs(dx) > 60) (dx < 0 ? forward : () => go(shown - 1))();
            }}
            className="touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-4"
          >
            <div
              ref={slideRef}
              className={`book-slide relative mx-auto grid max-w-5xl grid-cols-1 lg:grid-cols-2 ${turn?.by === "hand" ? "select-none" : ""} ${closed || closing ? "lg:-translate-x-1/4" : ""}`}
            >
              {closed ? (
                <>
                  <div className="max-lg:hidden" />
                  {/* The closed book: its cover, with the title page waiting beneath for when it lifts */}
                  <div className="relative">
                    <div aria-hidden inert className="max-lg:hidden">
                      {page(1, "right")}
                    </div>
                    <div className="flex h-full flex-col shadow-[0_30px_50px_-24px_rgb(15_20_30/0.55)] lg:absolute lg:inset-0">{cover}</div>
                  </div>
                </>
              ) : (
                /* The pages beneath: the edges of the rest of the book show along the bottom */
                (["left", "right"] as const).map((side) => {
                  const node = side === "left" ? left : right;
                  if (!node) return <div key={side} className="max-lg:hidden" />;
                  const dir = side === "right" ? 1 : -1;
                  // A page can be pulled over by its outer edge, if there's a page to turn to
                  const grip = !turn && (side === "right" ? shown < spreads - 1 : shown > 0);
                  return (
                    <div key={`${side}-${shown}`} className="phone-turn relative">
                      <span aria-hidden className={`absolute inset-x-1 -bottom-1.5 top-2 -z-10 bg-[var(--paper-edge)] ${side === "left" ? "rounded-l-2xl max-lg:rounded-2xl" : "rounded-r-2xl max-lg:rounded-2xl"}`} />
                      <span aria-hidden className={`absolute inset-x-2.5 -bottom-3 top-4 -z-20 bg-[#e0d8c5] ${side === "left" ? "rounded-l-2xl max-lg:rounded-2xl" : "rounded-r-2xl max-lg:rounded-2xl"}`} />
                      <div className={`relative h-full shadow-[0_24px_40px_-26px_rgb(15_20_30/0.45)] ${side === "left" ? "rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none" : "lg:rounded-r-2xl"}`}>{node}</div>
                      {grip && (
                        <div
                          aria-hidden
                          title={side === "right" ? "Pull the page over, or click to turn it" : "Pull the page back, or click to turn back"}
                          onPointerDown={(e) => grab(e, dir)}
                          className={`group absolute inset-y-0 z-10 hidden w-11 cursor-grab touch-none lg:block ${side === "right" ? "right-0" : "left-0"}`}
                        >
                          <span
                            className={`page-corner absolute bottom-0 h-6 w-6 group-hover:h-12 group-hover:w-12 ${side === "right" ? "right-0 rounded-tl-lg" : "left-0 rotate-90 rounded-tr-lg"}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {/* A ribbon to keep your place, from the spine down past the bottom of the book */}
              {opened && !opening && !closing && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-9 left-[calc(50%+1.25rem)] top-0 z-10 w-2.5 bg-[color-mix(in_srgb,var(--tint-a)_80%,#0e1520)] shadow-[1px_0_2px_rgb(0_0_0/0.2)] max-lg:hidden"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 8px), 0 100%)" }}
                />
              )}
              {leaf && (
                <div ref={layerRef} className={`turn-layer max-lg:hidden ${turn?.by === "hand" ? "held" : ""}`}>
                  <span aria-hidden className={`leaf-cast ${leaf.forward ? "right-0 bg-gradient-to-r" : "left-0 bg-gradient-to-l"} from-black/20 to-transparent to-40%`} />
                  <div className={`leaf ${leaf.forward ? "leaf-forward" : "leaf-back"}`}>
                    <div>{leaf.front}</div>
                    <div>{leaf.back}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <PageArrow dir={-1} label={backLabel} disabled={!opened} onClick={() => go(shown - 1)} className="absolute -left-2 top-1/2 h-12 w-12 -translate-y-1/2 max-lg:hidden xl:-left-6" />
          <PageArrow dir={1} label={forwardLabel} nudge={!opened} onClick={forward} className="absolute -right-2 top-1/2 h-12 w-12 -translate-y-1/2 max-lg:hidden xl:-right-6" />
        </div>

        {/* The book's chapters, to jump between; the ones you've read are filled in */}
        <nav aria-label={`Chapters of ${book.title}`} className="mt-10 lg:mt-12">
          <ol className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {stops.map((stop, i) => {
              const here = i === shown;
              return (
                <li key={i} className="min-w-[3.25rem] flex-1">
                  <button type="button" onClick={() => go(i)} title={stop.long} aria-label={stop.long} aria-current={here ? "page" : undefined} className="group block w-full cursor-pointer pt-2 text-left">
                    <span
                      className={`block h-1.5 rounded-full transition-colors duration-300 ${
                        here ? "bg-[var(--tint-a)]" : readHere.includes(i) ? "bg-[color-mix(in_srgb,var(--tint-a)_35%,transparent)]" : "bg-black/10 group-hover:bg-black/25"
                      }`}
                    />
                    <span className={`mt-1.5 block truncate text-xs ${here ? "font-semibold text-foreground" : "text-muted group-hover:text-foreground"}`}>{stop.short}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 hidden text-xs text-muted lg:block">Pull a page over by its edge, or turn with the arrows and the ← → keys.</p>
        </nav>

        {/* On a phone the arrows sit under the book */}
        <div className="mt-5 flex items-center justify-between gap-3 lg:hidden">
          <PageArrow dir={-1} label={backLabel} disabled={!opened} onClick={() => go(shown - 1)} className="h-11 w-11" />
          <span className="text-sm text-muted">{shown < 0 ? "Tap the cover to open it" : `${2 * shown + 1}–${2 * shown + 2} of ${pages.length}`}</span>
          <PageArrow dir={1} label={forwardLabel} nudge={!opened} onClick={forward} className="h-11 w-11" />
        </div>
      </div>
    </div>
  );
}

export type { CatchUp };
