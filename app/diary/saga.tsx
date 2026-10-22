"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { diaryPages, endingOf, eventLabel, monthLabel, roundName, scoreText } from "./library";
import { HighlightsLink, SlamLogo } from "../match-ui";
import { useLog } from "./store";
import { glideTo } from "../glide";
import { ShapeChart, coverPhotos, roman, tintVars, tintsOf } from "./saga-ui";

/* Step 3: the log read back as books. Each stands on a shelf; pick one and it opens like a real book, its
   cover swinging round the spine onto a spread of two pages, and every page turning over to the next.
   A rivalry tells the whole rivalry with your meetings marked in; a collection tells your log another
   way. See books.ts for the rules: every line here comes from them, and the only free text is yours. */

type Pages = ReturnType<typeof diaryPages>;
type Tones = ReturnType<typeof chartStyles>;
type CatchUp = ReturnType<typeof missedMeetings>;
type Photo = (typeof coverPhotos)[string] | undefined;
type Flash = { key: string; n: number } | null;

// How long a page takes to turn; the same as .leaf in globals.css
const TURN_MS = 750;

/* ---------- Covers ---------- */

/** A book's cover: its two colours or its photo, and its title on a band of its colour. The shelf shows it small. */
function CoverArt({ id, kind, title, faces, photo, big = false }: { id: string; kind: ShelfBook["kind"]; title: string; faces: string[]; photo: Photo; big?: boolean }) {
  const tones = chartStyles(faces);
  return (
    <span className={`relative flex h-full w-full flex-col overflow-hidden bg-[var(--tint-a)] text-white ${big ? "rounded-l-md rounded-r-2xl" : "rounded-l-sm rounded-r-lg"}`}>
      {photo ? (
        <Image src={photo.src} alt="" fill placeholder="blur" sizes={big ? "(min-width: 1024px) 34rem, 100vw" : "8rem"} className={`object-cover ${photo.position}`} />
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

/** The books, standing on a shelf. The one you're reading is lifted off it. */
function Shelf({ shelf, bookId, counts, onOpen }: { shelf: ShelfBook[]; bookId: string; counts: Map<string, number>; onOpen: (id: string) => void }) {
  return (
    <div className="relative">
      {/* The shelf they stand on */}
      <span aria-hidden className="absolute inset-x-0 top-[9.6rem] h-2.5 rounded-full bg-[#ddd4c0] shadow-[0_10px_14px_-10px_rgb(0_0_0/0.45)] sm:top-[10.6rem]" />
      <div role="tablist" aria-label="Your books" className="relative -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 pt-3 sm:mx-0 sm:gap-6 sm:px-2">
        {shelf.map((b) => {
          const on = b.id === bookId;
          return (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onOpen(b.id)}
              style={tintVars(tintsOf(b.id, b.players))}
              className="group w-[6.6rem] shrink-0 cursor-pointer text-left sm:w-[7.4rem]"
            >
              <span
                aria-hidden
                className={`block h-36 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.45)] transition duration-300 sm:h-40 ${
                  on ? "-translate-y-3 shadow-[0_18px_28px_-12px_rgb(0_0_0/0.5)]" : "group-hover:-translate-y-1.5"
                }`}
              >
                <CoverArt id={b.id} kind={b.kind} title={b.title} faces={b.players} photo={coverPhotos[b.id]} />
              </span>
              <span className={`mt-4 block truncate text-sm font-semibold ${on ? "text-foreground" : "text-muted group-hover:text-foreground"}`}>{b.title}</span>
              <span className="block text-xs text-muted">
                {counts.get(b.id)} {b.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Paper ---------- */

/** One page: warm paper, a running head, a page number, and the spine's shade along its inner edge. */
function Paper({ side, number, head, children }: { side: "left" | "right"; number: number | null; head: string; children: ReactNode }) {
  const left = side === "left";
  return (
    <div className={`relative flex h-full flex-col bg-[var(--paper)] px-7 pb-7 pt-6 text-[var(--ink)] sm:px-10 lg:min-h-[38rem] lg:px-12 ${left ? "rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none" : "max-lg:border-t max-lg:border-[var(--paper-edge)] lg:rounded-r-2xl"}`}>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 w-14 max-lg:hidden ${left ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"} from-black/[0.08] to-transparent`}
      />
      {/* Title pages go without, as in a printed book */}
      <p className={`relative truncate text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted ${left ? "" : "lg:text-right"}`}>{head || "\u00a0"}</p>
      <div className="relative mt-7 flex flex-1 flex-col">{children}</div>
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
            <Image src={photo.src} alt={photo.alt} fill placeholder="blur" sizes="(min-width: 1024px) 28rem, 100vw" className={`object-cover ${photo.position}`} />
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
  return (
    <>
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
          <span className="shrink-0 text-xs">Not in your log</span>
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

export function SagaSection() {
  const { mode, matches, entries, order, records, spotlight, openInLog } = useLog();
  const log: Diary = useMemo(() => ({ matches, entries, order, records }), [matches, entries, order, records]);
  const diary = diaryPages(entries, matches); // each match's page number in the log
  const shelf = buildShelf(log);
  const counts = new Map(shelf.map((b) => [b.id, shelfCount(b.id, log)]));
  const [bookId, setBookId] = useState(shelf[0]?.id ?? "seasons");
  // Which spread of two pages is open: -1 is the closed book, showing its cover
  const [spread, setSpread] = useState(-1);
  const [turn, setTurn] = useState<{ from: number; to: number } | null>(null);
  // A match picked in the chart: its chapter opens and its line flashes
  const [focus, setFocus] = useState<Flash>(null);

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

  // A turn finishes by settling on its spread
  useEffect(() => {
    if (!turn) return;
    const done = setTimeout(() => {
      setSpread(turn.to);
      setTurn(null);
    }, TURN_MS);
    return () => clearTimeout(done);
  }, [turn]);

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
  const photo = coverPhotos[shelfBook.id];
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
          if (mode === "demo") glideTo(document.getElementById("log"), "start", 0);
        };

  // The best thing you wrote anywhere in the book, for the page facing its title
  const best =
    book.chapters
      .flatMap((c) => c.entries)
      .flatMap((e) => (e.kind === "logged" && e.fan.note ? [e] : []))
      .sort((a, b) => b.fan.rating - a.fan.rating || b.fan.watchedDate.localeCompare(a.fan.watchedDate))
      .map((e) => ({ note: e.fan.note, id: e.id, date: e.fan.watchedDate }))[0] ?? null;

  /* Every turn goes through here. On a phone the spread just changes; on wider screens a leaf turns over. */
  const turnTo = (from: number, to: number) => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(min-width: 1024px)").matches;
    if (still) {
      // A phone shows both pages one above the other, so start the new ones from the top
      const top = bookRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) glideTo(bookRef.current, "start", 72);
      return setSpread(to);
    }
    setTurn({ from, to });
  };

  // Two spreads to open the book, one per chapter, and one to end it
  const spreads = book.chapters.length + 3;
  const current = Math.min(spread, spreads - 1);

  function go(to: number) {
    const target = Math.max(-1, Math.min(spreads - 1, to));
    if (turn || target === current) return;
    // Whatever was clicked on the page is about to be turned away, so keep the keys turning pages
    if (bookRef.current?.contains(document.activeElement)) bookRef.current.focus({ preventScroll: true });
    turnTo(current, target);
  }
  // Picking a book takes it off the shelf, closed, and opens it
  function openBook(id: string) {
    setBookId(id);
    setTurn(null);
    setSpread(-1);
    setFocus(null);
    turnTo(-1, 0);
  }

  // The book's pages, in pairs: frontispiece and title, the chart and its numbers, a spread per chapter, the ending
  const chapterSpread = (i: number) => 2 + i;
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
            ...book.chapters.map((c, i) => ({ label: /^\d{4}$/.test(c.year) ? c.year : roman(i + 1), title: c.title, page: 5 + i * 2, spread: chapterSpread(i) })),
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
  const cover = (
    <button type="button" onClick={() => go(0)} aria-label={`Open ${book.title}`} className="block h-full min-h-[26rem] w-full cursor-pointer text-left lg:min-h-[38rem]">
      <CoverArt id={shelfBook.id} kind={book.kind} title={book.title} faces={book.faces} photo={photo} big />
    </button>
  );
  const page = (i: number, side: "left" | "right") =>
    i >= 0 && i < pages.length ? (
      <Paper side={side} number={i === 0 ? null : i + 1} head={pages[i].head}>
        {pages[i].node}
      </Paper>
    ) : null;

  // What lies open, and what's on the two faces of a leaf mid-turn
  let left: ReactNode;
  let right: ReactNode;
  let leaf: { forward: boolean; front: ReactNode; back: ReactNode } | null = null;
  if (turn && turn.to > turn.from) {
    left = page(2 * turn.from, "left");
    right = page(2 * turn.to + 1, "right");
    leaf = { forward: true, front: turn.from < 0 ? cover : page(2 * turn.from + 1, "right"), back: page(2 * turn.to, "left") };
  } else if (turn) {
    left = turn.to < 0 ? null : page(2 * turn.to, "left");
    right = page(2 * turn.from + 1, "right");
    leaf = { forward: false, front: page(2 * turn.from, "left"), back: turn.to < 0 ? cover : page(2 * turn.to + 1, "right") };
  } else if (current < 0) {
    left = null;
    right = cover;
  } else {
    left = page(2 * current, "left");
    right = page(2 * current + 1, "right");
  }
  const closed = current < 0 && !turn;
  const closing = !!turn && turn.to < 0;
  const opened = current >= 0 || !!turn;
  const shown = turn ? turn.to : current;
  const backLabel = shown <= 0 ? "Close the book" : "Turn back a page";
  const forwardLabel = shown < 0 ? "Open the book" : shown === spreads - 1 ? `Next book: ${nextBook.title}` : "Turn the page";
  const forward = () => (shown === spreads - 1 ? openBook(nextBook.id) : go(shown + 1));

  return (
    <div>
      <Shelf shelf={shelf} bookId={shelfBook.id} counts={counts} onOpen={openBook} />

      <div
        style={tintVars(tints)}
        className="book mt-10"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") forward();
          if (e.key === "ArrowLeft") go(shown - 1);
        }}
      >
        {/* Where you are in the book */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
          <p className="text-muted">
            <span className="font-semibold text-foreground">{book.title}</span>
            {shown < 0 ? " · closed" : ` · pages ${2 * shown + 1}–${2 * shown + 2} of ${pages.length}`}
          </p>
          {opened && (
            <p className="flex gap-1">
              <button type="button" onClick={() => go(0)} className="cursor-pointer rounded-full px-3 py-1 font-semibold text-muted transition hover:bg-black/5 hover:text-foreground">
                Contents
              </button>
              <button type="button" onClick={() => go(-1)} className="cursor-pointer rounded-full px-3 py-1 font-semibold text-muted transition hover:bg-black/5 hover:text-foreground">
                Close
              </button>
            </p>
          )}
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
            <div className={`book-slide relative mx-auto grid max-w-5xl grid-cols-1 [perspective:2600px] lg:grid-cols-2 ${closed || closing ? "lg:-translate-x-1/4" : ""}`}>
              {/* The pages beneath: the edges of the rest of the book show along the bottom */}
              {(["left", "right"] as const).map((side) => {
                const node = side === "left" ? left : right;
                if (!node) return <div key={side} className="max-lg:hidden" />;
                const isCover = side === "right" && node === cover;
                return (
                  <div key={`${side}-${shown}`} className="phone-turn relative">
                    {!isCover && (
                      <>
                        <span aria-hidden className={`absolute inset-x-1 -bottom-1.5 top-2 -z-10 bg-[var(--paper-edge)] ${side === "left" ? "rounded-l-2xl max-lg:rounded-2xl" : "rounded-r-2xl max-lg:rounded-2xl"}`} />
                        <span aria-hidden className={`absolute inset-x-2.5 -bottom-3 top-4 -z-20 bg-[#e0d8c5] ${side === "left" ? "rounded-l-2xl max-lg:rounded-2xl" : "rounded-r-2xl max-lg:rounded-2xl"}`} />
                      </>
                    )}
                    <div className={`relative h-full ${isCover ? "shadow-[0_30px_50px_-24px_rgb(15_20_30/0.55)]" : "shadow-[0_24px_40px_-26px_rgb(15_20_30/0.45)]"} ${isCover ? "" : side === "left" ? "rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none" : "lg:rounded-r-2xl"}`}>
                      {node}
                    </div>
                    {/* Turn by the page's corner */}
                    {!isCover && !turn && (
                      <button
                        type="button"
                        aria-label={side === "right" ? forwardLabel : backLabel}
                        onClick={side === "right" ? forward : () => go(shown - 1)}
                        className={`group absolute bottom-0 z-10 hidden h-14 w-14 cursor-pointer lg:block ${side === "right" ? "right-0" : "left-0"}`}
                      >
                        <span className={`page-corner absolute bottom-0 h-0 w-0 group-hover:h-9 group-hover:w-9 ${side === "right" ? "right-0 rounded-tl-lg" : "left-0 rotate-90 rounded-tr-lg"}`} />
                      </button>
                    )}
                  </div>
                );
              })}
              {leaf && (
                <div className={`leaf max-lg:hidden ${leaf.forward ? "leaf-forward" : "leaf-back"}`}>
                  <div>{leaf.front}</div>
                  <div>{leaf.back}</div>
                </div>
              )}
            </div>
          </div>

          <PageArrow dir={-1} label={backLabel} disabled={!opened} onClick={() => go(shown - 1)} className="absolute -left-2 top-1/2 h-12 w-12 -translate-y-1/2 max-lg:hidden xl:-left-6" />
          <PageArrow dir={1} label={forwardLabel} nudge={!opened} onClick={forward} className="absolute -right-2 top-1/2 h-12 w-12 -translate-y-1/2 max-lg:hidden xl:-right-6" />
        </div>

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
