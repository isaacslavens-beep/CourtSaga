"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { SAGA_MIN_MATCHES, bookFor, buildBook, buildShelf, shelfCount, type BookChapter, type BookData, type Entry } from "./books";
import { Avatar, BallScore, CollectionIcon, IconArrowUp, hasHeadshot, playerStyle } from "./fun";
import { monthLabel } from "./library";
import { SlamLogo } from "../match-ui";
import { useLog } from "./log-store";

/* Step 3: a shelf of books bound from the log. Rivalries tell the whole rivalry with your
   meetings marked in; collections organise your log another way. See books.ts for the rules. */

const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const sepia = "[filter:sepia(0.2)_saturate(0.9)]";

/* ---------- Page furniture ---------- */

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-wider text-court">{children}</p>;
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- The pages ---------- */

function TitlePage({ book, onJump }: { book: BookData; onJump: (page: number) => void }) {
  const faces = book.faces.filter(hasHeadshot);
  return (
    <div className="flex h-full flex-col items-center text-center">
      {book.kind === "collection" && (
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-court/10 text-court ring-1 ring-court/25">
          <CollectionIcon id={book.id} className="h-7 w-7" />
        </span>
      )}
      <Kicker>{book.kind === "rivalry" ? "A rivalry" : "A collection"}</Kicker>
      <h3 className="mt-3 font-serif text-5xl font-semibold leading-tight">{book.title}</h3>
      {faces.length > 0 && (
        <div className="mt-5 flex items-center gap-3">
          {faces.map((p) => (
            <Avatar key={p} name={p} size="h-16 w-16 text-xl" className={sepia} />
          ))}
        </div>
      )}
      <p className="mt-4 text-lg font-medium">{book.subtitle}</p>
      <nav aria-label="Contents" className="mt-6 w-full max-w-xs border-t border-line pt-4 text-left">
        <ol className="space-y-1">
          {book.chapters.map((c, i) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => onJump(i + 2)}
                className="flex w-full cursor-pointer items-baseline gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-background hover:text-court"
              >
                <span className="w-10 shrink-0 text-sm font-semibold text-muted">{c.year}</span>
                <span className="min-w-0 font-medium">{c.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

function ArcPage({ book, spotId }: { book: BookData; spotId: string | null }) {
  const groups = [...new Set(book.strip.map((x) => x.group))];
  return (
    <div>
      <Kicker>At a glance</Kicker>
      <h3 className="mt-2 font-serif text-4xl font-semibold">The shape of it</h3>

      <div className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-3" role="img" aria-label={book.strip.map((x) => x.title).join("; ")}>
        {groups.map((g) => (
          <div key={g} className="flex flex-col items-center">
            <div className="flex items-end gap-0.5">
              {book.strip
                .filter((x) => x.group === g)
                .map((x) => {
                  const spot = spotId && spotId === x.logId ? "spot-tile" : "";
                  return (
                    <div key={x.key} className="flex flex-col items-center gap-1" title={x.title}>
                      {x.face ? (
                        <Avatar name={x.face} size="h-6 w-6 text-[10px]" className={`${sepia} ${spot}`} />
                      ) : x.glyph ? (
                        <span className={`flex h-6 w-4 items-center justify-center text-base font-bold ${x.glyph === "✓" ? "text-grass" : "text-fault"} ${spot}`}>
                          {x.glyph}
                        </span>
                      ) : (
                        <span className="flex h-6 items-center">
                          <span className={`h-3 w-3 rounded-full ${x.dot ? playerStyle(x.dot).bg : "bg-line"} ${spot}`} />
                        </span>
                      )}
                      {x.bar !== null && (
                        <span className="flex h-10 w-2 items-end overflow-hidden rounded-full bg-line/70">
                          <span className="w-full rounded-full bg-foreground/70 transition-all duration-500" style={{ height: `${x.bar * 20}%` }} />
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
            <span className="mt-1.5 text-sm font-medium text-muted">{g}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{book.stripLegend}</p>

      <div className="mt-6">
        <Facts rows={book.facts} />
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
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full text-sm font-semibold text-court transition hover:bg-court/10 ${
        iconOnly ? "h-7 w-7 justify-center" : "px-2 py-0.5"
      }`}
    >
      <IconArrowUp className="h-3.5 w-3.5" />
      {!iconOnly && "Edit"}
    </button>
  );
}

function EntryRow({
  entry,
  compact,
  isEpigraph,
  spot,
  onEdit,
}: {
  entry: Entry;
  compact: boolean;
  isEpigraph: boolean;
  spot: { id: string; n: number } | null;
  onEdit: (id: string) => void;
}) {
  // A meeting you didn't log: one plain line, so the whole story is there
  if (entry.kind === "other") {
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-1">
        <span className="text-muted">{entry.head}</span>
        <span className="font-medium">
          {entry.line}
          {entry.mark && <span className="ml-2 text-sm font-semibold text-court">✦ {entry.mark}</span>}
        </span>
      </li>
    );
  }

  const { m, fan } = entry;
  const flash = spot?.id === m.id ? "spot-flash" : "";
  const title = `${m.event} · ${m.round}`;

  if (compact) {
    return (
      <li data-beat={m.id} className={`flex items-center gap-3 rounded-lg px-3 py-1.5 ${flash}`}>
        <Avatar name={m.winner} size="h-7 w-7 text-xs" className={sepia} />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 font-semibold">
            <SlamLogo event={m.event} size="h-5 w-5" />
            <span className="truncate">{title}</span>
          </p>
          <p className="text-sm text-muted">
            {m.winner} beat {m.loser}
            {entry.mark && <span className="font-semibold text-court"> · ✦ {entry.mark}</span>}
          </p>
        </div>
        <BallScore value={fan.rating} size="sm" />
        <EditButton onClick={() => onEdit(m.id)} iconOnly />
      </li>
    );
  }

  const right = !!fan.pick && fan.pick.winner === m.winner;
  return (
    <li data-beat={m.id} className={`rounded-xl border-l-4 border-ball bg-background/70 px-3 py-2.5 ${flash}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <SlamLogo event={m.event} size="h-6 w-6" />
          {title}
        </p>
        <BallScore value={fan.rating} size="sm" />
      </div>
      {entry.mark && <p className="text-sm font-semibold text-court">✦ {entry.mark}</p>}
      <p className="mt-1 flex items-center gap-2">
        <Avatar name={m.winner} size="h-6 w-6 text-[10px]" className={sepia} />
        <span>
          <span className="font-semibold">{m.winner}</span> beat {m.loser}
        </span>
      </p>
      {entry.detail && <p className="mt-0.5 text-sm text-muted">{entry.detail}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
        {fan.cheering && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${fan.cheering === m.winner ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
            {fan.cheering === m.winner ? "✓" : "✗"} Backed {fan.cheering}
          </span>
        )}
        {fan.pick && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${right ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
            {right ? "✓ Called it" : `✗ Picked ${fan.pick.winner}`}
          </span>
        )}
        <span className="ml-auto">
          <EditButton onClick={() => onEdit(m.id)} />
        </span>
      </div>
      {fan.note && !isEpigraph && <p className="mt-2 italic">&ldquo;{fan.note}&rdquo;</p>}
    </li>
  );
}

function ChapterPage({
  chapter,
  index,
  spot,
  onEdit,
}: {
  chapter: BookChapter;
  index: number;
  spot: { id: string; n: number } | null;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Kicker>
        Chapter {roman[index]} · {chapter.year}
      </Kicker>
      <h3 className="mt-2 font-serif text-4xl font-semibold leading-tight">{chapter.title}</h3>
      <p className="mt-2 text-lg font-medium">{chapter.side}</p>

      {chapter.epigraph && (
        <blockquote className="mt-4 border-l-4 border-ball pl-4">
          <p className="font-serif text-xl italic leading-snug">&ldquo;{chapter.epigraph.note}&rdquo;</p>
          <footer className="mt-1 text-sm text-muted">Your words, {monthLabel(chapter.epigraph.date)}</footer>
        </blockquote>
      )}

      <ol className={`mt-4 ${chapter.compact ? "space-y-0.5" : "space-y-2"}`}>
        {chapter.entries.map((e) => (
          <EntryRow
            key={e.kind === "logged" ? (spot?.id === e.id ? `${e.id}-${spot.n}` : e.id) : e.key}
            entry={e}
            compact={chapter.compact}
            isEpigraph={e.kind === "logged" && chapter.epigraph?.id === e.id}
            spot={spot}
            onEdit={onEdit}
          />
        ))}
      </ol>

      <div className="mt-auto pt-5">
        {chapter.footer.share !== null && (
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            <span className="bg-court transition-all duration-500" style={{ width: `${chapter.footer.share * 100}%` }} />
            <span className="flex-1 bg-line" />
          </div>
        )}
        <p className="mt-2 text-muted">
          {chapter.footer.label} <span className="font-semibold text-foreground">{chapter.footer.value}</span>
        </p>
      </div>
    </div>
  );
}

function EpiloguePage({ book }: { book: BookData }) {
  const { big, facts, favourite } = book.epilogue;
  return (
    <div className="flex h-full flex-col">
      <Kicker>So far</Kicker>
      <h3 className="mt-2 font-serif text-4xl font-semibold">Where it stands</h3>
      <div className="mt-6 flex flex-wrap items-end justify-center gap-x-8 gap-y-3">
        {big.map(({ label, n, face }, i) =>
          face ? (
            <div key={label} className={`flex items-center gap-3 ${i ? "flex-row-reverse" : ""}`}>
              <Avatar name={label} size="h-14 w-14 text-xl" className={sepia} />
              <span className="font-serif text-6xl font-semibold leading-none">{n}</span>
            </div>
          ) : (
            <div key={label} className="text-center">
              <p className="font-serif text-6xl font-semibold leading-none">{n}</p>
              <p className="mt-1 font-semibold text-muted">{label}</p>
            </div>
          ),
        )}
      </div>
      <div className="mt-6">
        <Facts rows={facts} />
      </div>
      {favourite && (
        <div className="mt-5 rounded-xl bg-background/70 p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-court">Your favourite</p>
          <p className="mt-1 text-lg font-semibold">{favourite.label}</p>
          {favourite.note && <p className="mt-1 italic">&ldquo;{favourite.note}&rdquo;</p>}
        </div>
      )}
    </div>
  );
}

/* ---------- The book ---------- */

const wideQuery = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(wideQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function StoryDemo() {
  const { entries, order, setFocusId, spotlight } = useLog();
  const shelf = buildShelf(entries);
  const [bookId, setBookId] = useState(shelf[0]?.id ?? "seasons");
  const [pageIdx, setPageIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [touched, setTouched] = useState(false);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => true);

  // Arriving from the ranking: open the match's book at its chapter
  const [seenSpot, setSeenSpot] = useState(0);
  if (spotlight?.target === "story" && spotlight.n !== seenSpot) {
    setSeenSpot(spotlight.n);
    const target = bookFor(spotlight.id);
    const chapterIdx = buildBook(target, entries, order).chapters.findIndex((c) => c.entries.some((e) => e.kind === "logged" && e.id === spotlight.id));
    setBookId(target);
    setPageIdx(chapterIdx + 2);
  }
  const spot = spotlight?.target === "story" ? spotlight : null;

  const bookRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (spotlight?.target !== "story") return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const beat = bookRef.current?.querySelector(`[data-beat="${spotlight.id}"]`);
    (beat ?? bookRef.current)?.scrollIntoView({ behavior, block: beat ? "center" : "start" });
  }, [spotlight]);

  if (!shelf.length) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg font-medium text-muted">
        Log {SAGA_MIN_MATCHES} matches to start your saga.
      </p>
    );
  }
  const shelfBook = shelf.find((b) => b.id === bookId) ?? shelf[0];
  const book = buildBook(bookId, entries, order);
  const spotId = spot && book.chapters.some((c) => c.entries.some((e) => e.kind === "logged" && e.id === spot.id)) ? spot.id : null;
  const editInLog = (id: string) => {
    setFocusId(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("log")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  const pages: ReactNode[] = [
    <TitlePage key="title" book={book} onJump={(p) => goTo(p)} />,
    <ArcPage key="arc" book={book} spotId={spotId} />,
    ...book.chapters.map((c, i) => <ChapterPage key={c.key} chapter={c} index={i} spot={spotId ? spot : null} onEdit={editInLog} />),
    <EpiloguePage key="epilogue" book={book} />,
  ];
  if (pages.length % 2) {
    pages.push(
      <div key="blank" className="flex h-full items-center justify-center text-center text-lg italic text-muted">
        To be continued in 2027.
      </div>,
    );
  }

  // On wide screens you see two pages at a time
  const start = wide ? pageIdx - (pageIdx % 2) : pageIdx;
  const step = wide ? 2 : 1;
  const atStart = start === 0;
  const atEnd = start + step >= pages.length;
  function goTo(p: number) {
    setTouched(true);
    setDir(p >= pageIdx ? 1 : -1);
    setPageIdx(Math.max(0, Math.min(pages.length - 1, p)));
  }
  const turn = (d: 1 | -1) => {
    if ((d < 0 && atStart) || (d > 0 && atEnd)) return;
    goTo(start + d * step);
  };
  const open = (id: string) => {
    setTouched(true);
    setBookId(id);
    setPageIdx(0);
    setDir(1);
  };

  return (
    <div>
      {/* The shelf: book covers you can open */}
      <div role="tablist" aria-label="Books" className="space-y-4">
        {(["rivalry", "collection"] as const).map((kind) => (
          <div key={kind}>
            <p className="mb-2 font-semibold text-muted">{kind === "rivalry" ? "Rivalries" : "Collections"}</p>
            <div className={`grid gap-2.5 ${kind === "rivalry" ? "sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
              {shelf
                .filter((b) => b.kind === kind)
                .map((b) => {
                  const on = b.id === bookId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => open(b.id)}
                      style={{ "--leather": b.leather } as CSSProperties}
                      className={`leather flex cursor-pointer items-center gap-2.5 rounded-lg border-l-[6px] border-black/25 px-3 py-2.5 text-left text-white shadow-md transition duration-200 ${
                        on ? "-translate-y-1 shadow-xl ring-[3px] ring-court ring-offset-2 ring-offset-background" : "hover:-translate-y-0.5 hover:shadow-lg"
                      } ${!touched && b.id === "five" ? "nudge" : ""}`}
                    >
                      {b.kind === "collection" && (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                          <CollectionIcon id={b.id} className="h-5 w-5" />
                        </span>
                      )}
                      {b.players.length > 0 && (
                        <span className="flex shrink-0 -space-x-2">
                          {b.players.map((p) => (
                            <Avatar key={p} name={p} size="h-8 w-8 text-xs ring-2 ring-black/20" />
                          ))}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-serif text-lg font-semibold leading-tight">{b.title}</span>
                        <span className="block text-sm text-white/80">
                          {shelfCount(b.id, entries)} {b.blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* The open book */}
      <div
        ref={bookRef}
        tabIndex={0}
        aria-label={`${shelfBook.title}, a book. Use the arrow keys to turn pages.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") turn(1);
          if (e.key === "ArrowLeft") turn(-1);
        }}
        style={{ "--leather": shelfBook.leather } as CSSProperties}
        className="book leather relative mt-8 scroll-mt-6 rounded-2xl p-2 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-court sm:p-2.5"
      >
        {/* Side arrows for turning pages */}
        {(
          [
            [-1, "Previous page", "-left-3 sm:-left-5", "M10 3L5 8l5 5", atStart],
            [1, "Next page", "-right-3 sm:-right-5", "M6 3l5 5-5 5", atEnd],
          ] as const
        ).map(([d, label, pos, path, disabled]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => turn(d)}
            disabled={disabled}
            className={`absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-court shadow-md ring-1 ring-line transition hover:scale-110 hover:bg-surface disabled:pointer-events-none disabled:opacity-0 ${pos}`}
          >
            <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d={path} />
            </svg>
          </button>
        ))}
        <div className="grid lg:grid-cols-2">
          {pages.map((page, i) => {
            const onPhone = i === pageIdx;
            const onWide = i === start || i === start + 1;
            return (
              <section
                key={`${bookId}-${i}`}
                aria-label={`Page ${i + 1}`}
                className={`paper flex min-h-[24rem] flex-col rounded-xl px-5 py-6 sm:px-9 sm:py-8 lg:min-h-[36rem] ${
                  i % 2 ? "paper-right lg:rounded-l-none" : "paper-left lg:rounded-r-none"
                } ${onPhone ? "" : "max-lg:hidden"} ${onWide ? "" : "lg:hidden"}`}
              >
                <div key={`${bookId}-${i}-${pageIdx}`} className="page-in flex-1" style={{ "--from": `${dir * 14}px` } as CSSProperties}>
                  {page}
                </div>
                <p className="mt-5 text-center text-sm font-medium text-muted">{i + 1}</p>
              </section>
            );
          })}
        </div>
      </div>

      {/* Turning pages */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => turn(-1)}
          disabled={atStart}
          className="cursor-pointer whitespace-nowrap rounded-full border-2 border-line px-4 py-2 font-semibold transition hover:border-court hover:text-court disabled:cursor-default disabled:opacity-30"
        >
          ← Back
        </button>
        <p className="whitespace-nowrap font-medium text-muted">
          {wide ? `Pages ${start + 1}–${start + 2}` : `Page ${start + 1}`} of {pages.length}
        </p>
        <button
          type="button"
          onClick={() => turn(1)}
          disabled={atEnd}
          className={`cursor-pointer whitespace-nowrap rounded-full bg-court px-5 py-2 font-semibold text-court-ink shadow-md transition hover:brightness-110 disabled:cursor-default disabled:opacity-30 ${
            !touched ? "nudge" : ""
          }`}
        >
          Next page →
        </button>
      </div>
    </div>
  );
}
