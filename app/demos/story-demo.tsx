"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SAGA_MIN_MATCHES, bookFor, buildBook, buildShelf, shelfCount, type BookChapter, type BookData, type Entry, type ShelfBook } from "./books";
import { Avatar, BallScore, CollectionIcon, IconArrowUp, chartStyles } from "./fun";
import { monthLabel } from "./library";
import { SlamLogo } from "../match-ui";
import { useLog } from "./log-store";
import { glideTo } from "../glide";
import { Segments, ShapeChart, beat, coverPhotos, roman, tintVars, tintsOf } from "./saga-ui";

/* Step 3: the log told back as stories, one page at a time. Rivalries tell the whole rivalry with
   your meetings marked in; collections organise your log another way. See books.ts for the rules. */

/* ---------- Page furniture ---------- */

function Kicker({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return (
    <p className="rise text-sm font-semibold uppercase tracking-[0.14em] text-court" style={beat(i)}>
      {children}
    </p>
  );
}

function Title({ children, i = 1, big = false }: { children: ReactNode; i?: number; big?: boolean }) {
  return (
    <h3
      className={`rise mt-2 font-display font-bold leading-[1.04] tracking-tight ${big ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl"}`}
      style={beat(i)}
    >
      {children}
    </h3>
  );
}

function Stats({ rows, i = 0 }: { rows: [string, string][]; i?: number }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
      {rows.map(([label, value], k) => (
        <div key={label} className="rise rounded-2xl bg-foreground/[0.04] px-4 py-3 ring-1 ring-foreground/[0.08]" style={beat(i + k)}>
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-0.5 text-lg font-semibold leading-snug">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Faces({ names, size }: { names: string[]; size: string }) {
  const tones = chartStyles(names);
  return names.map((p) => <Avatar key={p} name={p} size={size} tone={tones.get(p)} />);
}

/* ---------- The pages ---------- */

function CoverPage({ book, onJump }: { book: BookData; onJump: (page: number) => void }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end lg:gap-12">
      <div>
        <Kicker>{book.kind === "rivalry" ? "A rivalry" : "A collection"}</Kicker>
        <Title big>{book.title}</Title>
        {book.faces.length > 0 && (
          <div className="rise mt-6 flex items-center gap-3" style={beat(2)}>
            <Faces names={book.faces} size="h-14 w-14 text-lg" />
          </div>
        )}
        <p className="rise mt-5 max-w-md text-lg text-muted" style={beat(3)}>
          {book.subtitle}
        </p>
      </div>
      <nav aria-label="Chapters" className="rise rounded-3xl bg-background/60 p-2 ring-1 ring-foreground/10 backdrop-blur-md" style={beat(3)}>
        <p className="px-3 pb-1 pt-2 text-sm font-semibold text-muted">Chapters</p>
        <ol>
          {book.chapters.map((c, i) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => onJump(i + 2)}
                className="group flex w-full cursor-pointer items-baseline gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-foreground/[0.07]"
              >
                <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-muted">{c.year}</span>
                <span className="min-w-0 flex-1 font-medium">{c.title}</span>
                <span aria-hidden className="text-muted transition group-hover:translate-x-0.5 group-hover:text-court">
                  →
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

function ShapePage({ book, spotId, onYear }: { book: BookData; spotId: string | null; onYear: ((year: string) => void) | null }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
      <div className="min-w-0">
        <Kicker>At a glance</Kicker>
        <Title>The shape of it</Title>
        <div className="rise mt-8" style={beat(2)}>
          <ShapeChart
            book={book}
            caption={onYear ? `${book.stripCaption} Pick a year to read its chapter.` : book.stripCaption}
            spotId={spotId}
            onGroup={onYear ?? undefined}
          />
        </div>
      </div>
      <div className="lg:pt-10 lg:[&_dl]:grid-cols-1">
        <Stats rows={book.facts} i={3} />
      </div>
    </div>
  );
}

function EditButton({ onClick, iconOnly = false }: { onClick: () => void; iconOnly?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Edit in your log"
      aria-label="Edit in your log"
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full text-sm font-semibold text-court transition hover:bg-court/15 ${
        iconOnly ? "h-7 w-7 justify-center" : "px-2 py-0.5"
      }`}
    >
      <IconArrowUp className="h-3.5 w-3.5" />
      {!iconOnly && "Edit"}
    </button>
  );
}

function Mark({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded-full bg-court/15 px-2 py-0.5 text-xs font-semibold text-court">{children}</span>;
}

function EntryRow({
  entry,
  compact,
  isEpigraph,
  spot,
  onEdit,
  i,
}: {
  entry: Entry;
  compact: boolean;
  isEpigraph: boolean;
  spot: { id: string; n: number } | null;
  onEdit: (id: string) => void;
  i: number;
}) {
  // A meeting you didn't log: one quiet line, so the whole story is there
  if (entry.kind === "other") {
    return (
      <li className="rise flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-sm" style={beat(i)}>
        <span className="text-muted">{entry.head}</span>
        <span className="flex items-center gap-2 font-medium">
          {entry.mark && <Mark>{entry.mark}</Mark>}
          {entry.line}
        </span>
      </li>
    );
  }

  const { m, fan } = entry;
  const flash = spot?.id === m.id ? "spot-flash" : "";
  const title = `${m.event} · ${m.round}`;

  if (compact) {
    return (
      <li data-beat={m.id} className={`rise flex items-center gap-3 rounded-xl px-3 py-1.5 ${flash}`} style={beat(i)}>
        <Avatar name={m.winner} size="h-7 w-7 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 font-semibold">
            <SlamLogo event={m.event} size="h-5 w-5" />
            <span className="truncate">{title}</span>
          </p>
          <p className="text-sm text-muted">
            {m.winner} beat {m.loser}
            {entry.mark && <span className="font-semibold text-court"> · {entry.mark}</span>}
          </p>
        </div>
        <BallScore value={fan.rating} size="sm" />
        <EditButton onClick={() => onEdit(m.id)} iconOnly />
      </li>
    );
  }

  // Backing a player is your call that they'll win, so one chip says both
  const side = fan.cheering ?? fan.pick?.winner ?? null;
  return (
    <li data-beat={m.id} className={`rise rounded-2xl bg-foreground/[0.05] px-4 py-3 ring-1 ring-foreground/[0.07] ${flash}`} style={beat(i)}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 font-semibold">
          <SlamLogo event={m.event} size="h-6 w-6" />
          <span className="truncate">{title}</span>
        </p>
        <BallScore value={fan.rating} size="sm" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
        <Avatar name={m.winner} size="h-5 w-5 text-[9px]" />
        <span>
          <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>
        </span>
        {entry.mark && <Mark>{entry.mark}</Mark>}
        {side && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${side === m.winner ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
            {side === m.winner ? "✓" : "✗"} Backed {side}
          </span>
        )}
        <span className="ml-auto">
          <EditButton onClick={() => onEdit(m.id)} />
        </span>
      </div>
      {entry.detail && <p className="mt-1 text-sm text-muted">{entry.detail}</p>}
      {fan.note && !isEpigraph && <p className="mt-1.5 text-sm italic text-muted">&ldquo;{fan.note}&rdquo;</p>}
    </li>
  );
}

function ChapterPage({
  chapter,
  index,
  rivalry,
  spot,
  onEdit,
}: {
  chapter: BookChapter;
  index: number;
  rivalry: boolean;
  spot: { id: string; n: number } | null;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
      <div className="flex flex-col">
        <Kicker>
          Chapter {roman[index]} · {chapter.year}
        </Kicker>
        <Title>{chapter.title}</Title>
        <p className="rise mt-4 text-lg text-muted" style={beat(2)}>
          {chapter.side}
        </p>

        {chapter.epigraph && (
          <blockquote className="rise mt-7" style={beat(3)}>
            <p className="font-display text-2xl font-semibold leading-snug tracking-tight">
              <span className="text-court">&ldquo;</span>
              {chapter.epigraph.note}
              <span className="text-court">&rdquo;</span>
            </p>
            <footer className="mt-2 text-sm text-muted">Your words, {monthLabel(chapter.epigraph.date)}</footer>
          </blockquote>
        )}

        <div className="rise mt-auto pt-8" style={beat(4)}>
          {chapter.footer.share !== null && (
            <div className="flex h-2 gap-[2px]" aria-hidden>
              <span className="rounded-l-full bg-[var(--tint-a)] transition-all duration-500" style={{ width: `${chapter.footer.share * 100}%` }} />
              <span className={`flex-1 rounded-r-full ${rivalry ? "bg-[var(--tint-b)]" : "bg-foreground/15"}`} />
            </div>
          )}
          <p className="mt-2.5 text-muted">
            {chapter.footer.label} <span className="font-semibold text-foreground">{chapter.footer.value}</span>
          </p>
        </div>
      </div>

      <ol className={`self-start ${chapter.compact ? "space-y-0.5" : "space-y-2"}`}>
        {chapter.entries.map((e, k) => (
          <EntryRow
            key={e.kind === "logged" ? (spot?.id === e.id ? `${e.id}-${spot.n}` : e.id) : e.key}
            entry={e}
            compact={chapter.compact}
            isEpigraph={e.kind === "logged" && chapter.epigraph?.id === e.id}
            spot={spot}
            onEdit={onEdit}
            i={2 + k}
          />
        ))}
      </ol>
    </div>
  );
}

function EpiloguePage({ book }: { book: BookData }) {
  const { big, facts, favourite } = book.epilogue;
  const [a, b] = big;
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="flex flex-col">
        <Kicker>So far</Kicker>
        <Title>Where it stands</Title>
        {book.kind === "rivalry" ? (
          <div className="rise mt-10" style={beat(2)}>
            <div className="flex items-center justify-between gap-4">
              {[a, b].map((side, k) => (
                <div key={side.label} className={`flex items-center gap-4 ${k ? "flex-row-reverse" : ""}`}>
                  <Faces names={[side.label]} size="h-14 w-14 text-lg" />
                  <span className="font-display text-7xl font-bold leading-none tabular-nums">{side.n}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex h-2.5 gap-[2px]" aria-hidden>
              <span className="grow-x rounded-l-full bg-[var(--tint-a)]" style={{ width: `${(a.n / (a.n + b.n)) * 100}%` }} />
              <span className="flex-1 rounded-r-full bg-[var(--tint-b)]" />
            </div>
            <p className="mt-2 flex justify-between text-sm font-semibold text-muted">
              <span>{a.label}</span>
              <span>{b.label}</span>
            </p>
          </div>
        ) : (
          <div className="rise mt-10 flex flex-wrap gap-x-12 gap-y-6" style={beat(2)}>
            {big.map(({ label, n }) => (
              <div key={label}>
                <p className="font-display text-7xl font-bold leading-none tabular-nums">{n}</p>
                <p className="mt-2 font-semibold text-muted">{label}</p>
              </div>
            ))}
          </div>
        )}
        <p className="rise mt-auto pt-10 text-muted" style={beat(6)}>
          To be continued in 2027.
        </p>
      </div>
      <div className="space-y-3 lg:pt-10 lg:[&_dl]:grid-cols-1">
        <Stats rows={facts} i={3} />
        {favourite && (
          <div className="rise rounded-2xl bg-court/10 p-5 ring-1 ring-court/25" style={beat(3 + facts.length)}>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Your favourite</p>
            <p className="mt-1 text-lg font-semibold">{favourite.label}</p>
            {favourite.note && <p className="mt-1 italic text-muted">&ldquo;{favourite.note}&rdquo;</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Picking a book: one ring per book, like stories. A ring you haven't opened glows. ---------- */

function BookRing({ book, on, seen, count, onOpen }: { book: ShelfBook; on: boolean; seen: boolean; count: number; onOpen: () => void }) {
  const [a, b] = tintsOf(book.id, book.players);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onOpen}
      className="group flex w-[5.75rem] shrink-0 cursor-pointer flex-col items-center gap-2 text-center"
    >
      <span
        className={`grid h-20 w-20 place-items-center rounded-full p-[3px] transition duration-300 ${on ? "scale-105" : "group-hover:scale-105"}`}
        style={{ background: seen && !on ? "var(--line)" : `conic-gradient(from 200deg, ${a}, ${b}, ${a})` }}
      >
        <span className="grid h-full w-full place-items-center rounded-full bg-background p-[3px]">
          <span
            className="grid h-full w-full place-items-center rounded-full text-foreground"
            style={{ background: `color-mix(in srgb, ${a} 24%, var(--surface))` }}
          >
            {book.players.length ? (
              <span className="flex -space-x-3">
                <Faces names={book.players} size="h-9 w-9 text-xs ring-2 ring-background" />
              </span>
            ) : (
              <CollectionIcon id={book.id} className="h-7 w-7" />
            )}
          </span>
        </span>
      </span>
      <span className={`text-sm font-semibold leading-tight transition-colors ${on ? "text-foreground" : "text-muted group-hover:text-foreground"}`}>
        {book.title}
      </span>
      <span className="-mt-1.5 text-xs text-muted">
        {count} {book.blurb}
      </span>
    </button>
  );
}

/* ---------- The story ---------- */

export function StoryDemo() {
  const { entries, order, setFocusId, spotlight } = useLog();
  const shelf = buildShelf(entries);
  const [bookId, setBookId] = useState(shelf[0]?.id ?? "seasons");
  const [pageIdx, setPageIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [touched, setTouched] = useState(false);
  const [seen, setSeen] = useState<string[]>([bookId]);
  const markSeen = (id: string) => setSeen((s) => (s.includes(id) ? s : [...s, id]));

  // Arriving from the ranking: open the match's book at its chapter
  const [seenSpot, setSeenSpot] = useState(0);
  if (spotlight?.target === "story" && spotlight.n !== seenSpot) {
    setSeenSpot(spotlight.n);
    const target = bookFor(spotlight.id);
    const chapterIdx = buildBook(target, entries, order).chapters.findIndex((c) => c.entries.some((e) => e.kind === "logged" && e.id === spotlight.id));
    setBookId(target);
    markSeen(target);
    setPageIdx(chapterIdx + 2);
  }
  const spot = spotlight?.target === "story" ? spotlight : null;

  const bookRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (spotlight?.target !== "story") return;
    const beatEl = bookRef.current?.querySelector(`[data-beat="${spotlight.id}"]`);
    if (beatEl) glideTo(beatEl, "center");
    else glideTo(bookRef.current);
  }, [spotlight]);

  const swipeX = useRef<number | null>(null);

  if (!shelf.length) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg font-medium text-muted">
        Log {SAGA_MIN_MATCHES} matches to start your saga.
      </p>
    );
  }
  const shelfBook = shelf.find((b) => b.id === bookId) ?? shelf[0];
  const book = buildBook(bookId, entries, order);
  const rivalry = book.kind === "rivalry";
  const spotId = spot && book.chapters.some((c) => c.entries.some((e) => e.kind === "logged" && e.id === spot.id)) ? spot.id : null;
  const editInLog = (id: string) => {
    setFocusId(id);
    glideTo(document.getElementById("log"), "start", 0);
  };
  const photo = coverPhotos[bookId];

  const pages: { label: string; node: ReactNode }[] = [
    { label: "the cover", node: <CoverPage book={book} onJump={(p) => goTo(p)} /> },
    {
      label: "the shape of it",
      node: (
        <ShapePage
          book={book}
          spotId={spotId}
          onYear={rivalry ? (year) => goTo(2 + book.chapters.findIndex((c) => c.year === year)) : null}
        />
      ),
    },
    ...book.chapters.map((c, i) => ({
      label: `chapter ${roman[i]}, ${c.year}`,
      node: <ChapterPage chapter={c} index={i} rivalry={rivalry} spot={spotId ? spot : null} onEdit={editInLog} />,
    })),
    { label: "where it stands", node: <EpiloguePage book={book} /> },
  ];
  // The log can change under an open book, so keep the page in range
  const current = Math.min(pageIdx, pages.length - 1);
  const atStart = current === 0;
  const atEnd = current === pages.length - 1;
  function goTo(p: number) {
    setTouched(true);
    setDir(p >= current ? 1 : -1);
    setPageIdx(Math.max(0, Math.min(pages.length - 1, p)));
  }
  const turn = (d: 1 | -1) => {
    if ((d < 0 && atStart) || (d > 0 && atEnd)) return;
    goTo(current + d);
  };
  const nextBook = shelf[(shelf.findIndex((b) => b.id === bookId) + 1) % shelf.length];
  const open = (id: string) => {
    setTouched(true);
    setBookId(id);
    markSeen(id);
    setPageIdx(0);
    setDir(1);
  };

  return (
    <div>
      {/* The books */}
      <div role="tablist" aria-label="Your books" className="-mx-4 flex gap-8 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:gap-10 sm:px-0">
        {(["rivalry", "collection"] as const).map((kind) => (
          <div key={kind} className="shrink-0">
            <p className="mb-3 text-sm font-semibold text-muted">{kind === "rivalry" ? "Rivalries" : "Collections"}</p>
            <div className="flex gap-3 sm:gap-4">
              {shelf
                .filter((b) => b.kind === kind)
                .map((b) => (
                  <BookRing
                    key={b.id}
                    book={b}
                    on={b.id === bookId}
                    seen={seen.includes(b.id)}
                    count={shelfCount(b.id, entries)}
                    onOpen={() => open(b.id)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* The open book, one page at a time */}
      <div
        ref={bookRef}
        tabIndex={0}
        aria-label={`${shelfBook.title}. Use the arrow keys to turn pages.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") turn(1);
          if (e.key === "ArrowLeft") turn(-1);
        }}
        style={tintVars(tintsOf(bookId, shelfBook.players))}
        className="glow relative mt-8 scroll-mt-6 overflow-hidden rounded-[2rem] shadow-2xl shadow-black/60 ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-court"
      >
        {/* A rivalry's cover photo, behind its first page */}
        {atStart && photo && (
          <div
            key={bookId}
            aria-hidden
            className="fade-in pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-55 [mask-image:linear-gradient(to_bottom,black_20%,transparent)] lg:inset-y-0 lg:left-auto lg:h-full lg:w-[68%] lg:[mask-image:linear-gradient(to_left,black_30%,transparent)]"
          >
            <Image src={photo.src} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 760px, 100vw" className={`object-cover ${photo.position}`} />
          </div>
        )}

        <div className="relative px-5 pt-4 sm:px-8 sm:pt-6">
          <Segments labels={pages.map((p) => p.label)} current={current} onPick={goTo} />
          <div className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              {shelfBook.players.length ? (
                <span className="flex shrink-0 -space-x-1.5">
                  <Faces names={shelfBook.players} size="h-6 w-6 text-[10px] ring-2 ring-surface" />
                </span>
              ) : (
                <CollectionIcon id={shelfBook.id} className="h-5 w-5 shrink-0 text-court" />
              )}
              <span className="truncate">{shelfBook.title}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {current + 1} / {pages.length}
            </span>
          </div>
        </div>

        <div
          key={`${bookId}-${current}`}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") swipeX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeX.current === null) return;
            const dx = e.clientX - swipeX.current;
            swipeX.current = null;
            if (Math.abs(dx) > 60) turn(dx < 0 ? 1 : -1);
          }}
          style={{ "--dx": `${dir * 20}px` } as CSSProperties}
          className="relative grid min-h-[30rem] grid-cols-1 touch-pan-y px-5 py-8 sm:px-8 lg:min-h-[35rem] lg:px-12 lg:py-10"
        >
          {pages[current].node}
        </div>

        {/* Turning pages */}
        <div className="relative flex items-center justify-between gap-4 border-t border-foreground/10 px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => turn(-1)}
            disabled={atStart}
            className="cursor-pointer whitespace-nowrap rounded-full px-4 py-2 font-semibold text-muted ring-1 ring-foreground/15 transition hover:text-foreground hover:ring-foreground/40 disabled:cursor-default disabled:opacity-30"
          >
            ← Back
          </button>
          <p className="min-w-0 truncate text-sm text-muted max-sm:hidden">
            {atEnd ? "The end, for now" : `Next: ${pages[current + 1].label}`}
          </p>
          <button
            type="button"
            onClick={() => (atEnd ? open(nextBook.id) : turn(1))}
            className={`cursor-pointer truncate whitespace-nowrap rounded-full bg-foreground px-5 py-2 font-semibold text-background shadow-md transition hover:brightness-90 ${
              !touched ? "nudge" : ""
            }`}
          >
            {atEnd ? `Next: ${nextBook.title} →` : "Next page →"}
          </button>
        </div>
      </div>
    </div>
  );
}
