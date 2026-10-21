"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  SAGA_MIN_MATCHES,
  bookFor,
  buildBook,
  buildShelf,
  missedMeetings,
  shelfCount,
  type BookChapter,
  type BookData,
  type Entry,
  type ShelfBook,
  type StripItem,
} from "./books";
import { Avatar, BallScore, CollectionIcon, CourtArt, IconArrowUp, PageArrow, chartStyles } from "./fun";
import mastersLogo from "@/public/slams/masters-1000.png";
import { diaryPages, eventLabel, matchById, monthLabel, parseSets } from "./library";
import { HighlightsLink, SlamLogo } from "../match-ui";
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

/** A tournament chapter's logo: the Slam's own, or the Masters 1000 badge for everything else. */
function ChapterLogo({ event }: { event: string }) {
  if (event !== "Other events") return <SlamLogo event={event} size="h-8 w-8" />;
  return (
    <span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white p-0.5 shadow-sm ring-1 ring-black/10">
      <Image src={mastersLogo} alt="" className="h-full w-full object-contain" sizes="64px" />
    </span>
  );
}

function Faces({ names, size }: { names: string[]; size: string }) {
  const tones = chartStyles(names);
  return names.map((p) => <Avatar key={p} name={p} size={size} tone={tones.get(p)} />);
}

/* ---------- The pages ---------- */

type CatchUp = ReturnType<typeof missedMeetings>;

function CoverPage({ book, catchUp, photo, onJump }: { book: BookData; catchUp: CatchUp | null; photo: boolean; onJump: (page: number) => void }) {
  const missed = catchUp?.missed.length ?? 0;
  return (
    // On a phone the cover photo is a band across the top, so the words start below it
    <div className={`grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end lg:gap-12 ${photo ? "max-lg:pt-40" : ""}`}>
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
        {/* The meetings you haven't seen are the next ones to watch */}
        {missed > 0 && (
          <button
            type="button"
            onClick={() => onJump(1)}
            className="rise mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-court/15 px-4 py-2 text-left font-semibold text-court ring-1 ring-court/30 transition hover:bg-court/25"
            style={beat(4)}
          >
            <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3 shrink-0 fill-current">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
            {missed === 1 ? "1 meeting you missed" : `${missed} meetings you missed`}: see what to catch up on →
          </button>
        )}
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
                {/* A year, or for Finals the tournament's logo */}
                {/^\d{4}$/.test(c.year) ? (
                  <span className="w-10 shrink-0 text-sm font-semibold tabular-nums text-muted">{c.year}</span>
                ) : (
                  <span className="w-10 shrink-0 self-center">
                    <ChapterLogo event={c.year} />
                  </span>
                )}
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

function ShapePage({
  book,
  catchUp,
  spotId,
  onYear,
  onMark,
}: {
  book: BookData;
  catchUp: CatchUp | null;
  spotId: string | null;
  onYear: ((year: string) => void) | null;
  onMark: (item: StripItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
      <div className="min-w-0">
        <Kicker>At a glance</Kicker>
        <Title>{book.kind === "rivalry" ? "The head-to-head" : "Every match"}</Title>
        <div className="rise mt-8" style={beat(2)}>
          <ShapeChart
            book={book}
            caption={`${book.stripCaption} ${onYear ? "Pick a meeting or a year" : "Pick a match"} to read its chapter.`}
            spotId={spotId}
            onGroup={onYear ?? undefined}
            onMark={onMark}
          />
        </div>
      </div>
      <div className="space-y-3 lg:pt-10 lg:[&_dl]:grid-cols-1">
        <Stats rows={book.facts} i={3} />
        {catchUp && catchUp.missed.length > 0 && (
          <div className="rise rounded-2xl bg-court/10 p-4 ring-1 ring-court/25" style={beat(3 + book.facts.length)}>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Catch up</p>
            <p className="mt-1 text-sm text-muted">
              {catchUp.missed.length} of {catchUp.total} meetings aren&apos;t in your log. Start with:
            </p>
            <ol className="mt-3 space-y-2.5">
              {catchUp.missed.slice(0, 3).map((x) => (
                <li key={x.key}>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <SlamLogo event={x.event} size="h-7 w-7" />
                    {x.event} {x.year}
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2 text-sm text-muted">
                    {x.round}
                    <HighlightsLink players={catchUp.players} event={`${x.event} ${x.year} · ${x.round}`} className="shrink-0" />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/** Back up to a match's page in your diary, to read or change it. */
function PageButton({ page, onClick, compact = false }: { page: number | undefined; onClick: () => void; compact?: boolean }) {
  const label = `Open page ${page} of your diary in the log`;
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full font-semibold text-court transition hover:bg-court/15 ${
        compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm"
      }`}
    >
      <IconArrowUp className="h-3.5 w-3.5" />
      {compact ? `p. ${page}` : `Page ${page}`}
    </button>
  );
}

function Mark({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded-full bg-court/15 px-2 py-0.5 text-xs font-semibold text-court">{children}</span>;
}

function EntryRow({
  entry,
  pages,
  compact,
  isEpigraph,
  spot,
  onEdit,
  i,
}: {
  entry: Entry;
  pages: Pages;
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
          {entry.marks.map((t) => (
            <Mark key={t}>{t}</Mark>
          ))}
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
        <Avatar name={m.winner} size="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2 font-semibold">
            <SlamLogo event={m.event} size="h-7 w-7" />
            <span className="truncate">{title}</span>
          </p>
          <p className="text-sm text-muted">
            {m.winner} beat {m.loser}
            {entry.marks.length > 0 && <span className="font-semibold text-court"> · {entry.marks.join(" · ")}</span>}
          </p>
        </div>
        <BallScore value={fan.rating} size="sm" />
        <PageButton page={pages.get(m.id)} onClick={() => onEdit(m.id)} compact />
      </li>
    );
  }

  // Backing a player is your call that they'll win, so one chip says both
  const side = fan.cheering ?? fan.pick?.winner ?? null;
  return (
    <li data-beat={m.id} className={`rise flex gap-3.5 rounded-2xl bg-foreground/[0.05] px-4 py-3 ring-1 ring-foreground/[0.07] ${flash}`} style={beat(i)}>
      {/* The tournament's logo is the first thing to catch the eye */}
      <SlamLogo event={m.event} size="h-12 w-12 rounded-xl p-1 sm:h-14 sm:w-14" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-semibold">{title}</p>
          <BallScore value={fan.rating} size="sm" />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          <span className="flex shrink-0 -space-x-2.5">
            <Avatar name={m.winner} size="h-9 w-9 text-sm ring-2 ring-surface" />
            <Avatar name={m.loser} size="h-9 w-9 text-sm ring-2 ring-surface" />
          </span>
          <span>
            <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>
          </span>
          {entry.marks.map((t) => (
            <Mark key={t}>{t}</Mark>
          ))}
          {side && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${side === m.winner ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
              {side === m.winner ? "✓" : "✗"} Backed {side}
            </span>
          )}
          <span className="ml-auto">
            <PageButton page={pages.get(m.id)} onClick={() => onEdit(m.id)} />
          </span>
        </div>
        {entry.detail && <p className="mt-1 text-sm text-muted">{entry.detail}</p>}
        {fan.note && !isEpigraph && <p className="mt-1.5 text-sm italic text-muted">&ldquo;{fan.note}&rdquo;</p>}
      </div>
    </li>
  );
}

type Tones = ReturnType<typeof chartStyles>;
type Pages = ReturnType<typeof diaryPages>;

/** Games per set for both players, the set's winner in bold, a tiebreak's points on the set's loser. */
function MiniScore({ winner, loser, score, tones }: { winner: string; loser: string; score: string; tones: Tones }) {
  const sets = score.split(" ").map((set, k) => {
    const { w, l } = parseSets(score)[k];
    const tb = set.match(/\((\d+)(?:-(\d+))?\)/);
    return { w, l, tb: tb ? (tb[2] ?? tb[1]) : null };
  });
  return (
    <span className="block overflow-hidden rounded-xl bg-surface ring-1 ring-foreground/10">
      {[winner, loser].map((name, row) => (
        <span key={name} className={`flex items-center gap-2 px-2.5 py-1.5 ${row ? "border-t border-foreground/10" : ""}`}>
          <Avatar name={name} size="h-8 w-8 text-xs" tone={tones.get(name)} />
          <span className={`min-w-0 flex-1 truncate font-display font-bold ${row ? "text-muted" : ""}`}>{name}</span>
          {/* The sets packed close, so five of them still leave room for the name */}
          <span className="flex shrink-0">
            {sets.map((set, k) => {
              const games = row ? set.l : set.w;
              const tookSet = row ? set.l > set.w : set.w > set.l;
              return (
                <span key={k} className={`relative w-5 text-center font-mono tabular-nums ${tookSet ? "font-bold" : "text-muted"}`}>
                  {games}
                  {set.tb && !tookSet && <sup className="absolute -right-0.5 top-0 text-[9px] text-muted">{set.tb}</sup>}
                </span>
              );
            })}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * A rivalry meeting: where it was, the score, and what you made of it. One you haven't logged is drawn
 * as an outline on a greyed court, with its result and a way to find the highlights instead.
 */
function MeetingCard({
  entry,
  pages,
  tones,
  isEpigraph,
  flash,
  onEdit,
  i,
}: {
  entry: Entry;
  pages: Pages;
  tones: Tones;
  isEpigraph: boolean;
  flash: boolean;
  onEdit: (id: string) => void;
  i: number;
}) {
  const logged = entry.kind === "logged";
  const meet = logged
    ? { event: entry.m.event.replace(/ \d{4}$/, ""), year: entry.m.date.slice(0, 4), round: entry.m.round, surface: entry.m.surface, winner: entry.m.winner, loser: entry.m.loser, score: entry.m.score, retired: false }
    : { event: entry.meet.event, year: entry.meet.date.slice(0, 4), round: entry.meet.round, surface: entry.meet.surface, winner: entry.meet.winner, loser: entry.loser, score: entry.meet.score ?? null, retired: !!entry.meet.retired };
  const side = logged ? (entry.fan.cheering ?? entry.fan.pick?.winner ?? null) : null;

  return (
    <li
      data-beat={logged ? entry.id : undefined}
      data-focus={logged ? entry.id : `other-${entry.key}`}
      className={`rise flex flex-col overflow-hidden rounded-2xl ${logged ? "bg-foreground/[0.06] ring-1 ring-foreground/10" : "border-2 border-dashed border-foreground/15"} ${flash ? "spot-flash" : ""}`}
      style={beat(i)}
    >
      <div className="relative">
        <CourtArt surface={meet.surface} className={`absolute inset-0 ${logged ? "opacity-70" : "opacity-30 grayscale"}`} />
        <div className="relative flex items-center gap-2.5 bg-gradient-to-r from-black/55 to-black/10 px-3 py-2 text-white">
          <SlamLogo event={meet.event} size="h-7 w-7" />
          {/* The name gets the whole first line; your rating, or that it isn't logged, shares the second */}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate font-semibold">
              {meet.event} {meet.year}
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-2 text-sm text-white/75">
              <span className="truncate">{meet.round}</span>
              {logged ? (
                <BallScore value={entry.fan.rating} size="xs" />
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/40 px-2 py-px text-xs font-semibold text-white/85">
                  <span aria-hidden className="h-2 w-2 rounded-full ring-[1.5px] ring-white/80" />
                  Not in your log
                </span>
              )}
            </span>
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3">
        {meet.score ? (
          <MiniScore winner={meet.winner} loser={meet.loser} score={meet.score} tones={tones} />
        ) : (
          <p className="text-sm">
            <span className="font-semibold">{meet.winner}</span> <span className="text-muted">beat {meet.loser}</span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
          {entry.marks.map((t) => (
            <Mark key={t}>{t}</Mark>
          ))}
          {meet.retired && <span className="text-xs font-semibold text-muted">{meet.loser} retired</span>}
          {side && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${side === meet.winner ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
              {side === meet.winner ? "✓" : "✗"} Backed {side}
            </span>
          )}
          <span className="ml-auto">
            {logged ? (
              <PageButton page={pages.get(entry.id)} onClick={() => onEdit(entry.id)} />
            ) : (
              <HighlightsLink players={[meet.winner, meet.loser]} event={`${meet.event} ${meet.year} · ${meet.round}`} />
            )}
          </span>
        </div>
        {logged && entry.fan.note && !isEpigraph && <p className="text-sm italic text-muted">&ldquo;{entry.fan.note}&rdquo;</p>}
      </div>
    </li>
  );
}

function ChapterPage({
  chapter,
  pages,
  index,
  faces,
  rivalry,
  spot,
  focus,
  onEdit,
}: {
  chapter: BookChapter;
  pages: Pages;
  index: number;
  faces: string[];
  rivalry: boolean;
  spot: { id: string; n: number } | null;
  focus: { key: string; n: number } | null; // the match picked in the chart, to flash
  onEdit: (id: string) => void;
}) {
  const tones = chartStyles(faces);
  const score = rivalry ? chapter.footer.score : undefined;
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
      <div className="flex flex-col">
        {/* Where the last chapter left off, like the recap before an episode */}
        {chapter.previously && (
          <p className="rise mb-3 text-sm text-muted" style={beat(0)}>
            <span className="font-semibold">Previously:</span> {chapter.previously}
          </p>
        )}
        <Kicker>
          Chapter {roman[index]} · {chapter.year}
        </Kicker>
        <Title>{chapter.title}</Title>
        <p className="rise mt-4 text-lg text-muted" style={beat(2)}>
          {chapter.side}
        </p>
        {chapter.notes.length > 0 && (
          <ul className="rise mt-3 flex flex-wrap gap-2" style={beat(2)}>
            {chapter.notes.map((n) => (
              <li key={n} className="rounded-full bg-foreground/[0.06] px-3 py-1 text-sm font-semibold ring-1 ring-foreground/10">
                {n}
              </li>
            ))}
          </ul>
        )}

        {chapter.epigraph && (
          <blockquote className="rise mt-7 border-l-2 border-fault/50 pl-5" style={beat(3)}>
            <p className="font-display text-2xl font-semibold leading-snug tracking-tight">
              <span className="text-court">&ldquo;</span>
              {chapter.epigraph.note}
              <span className="text-court">&rdquo;</span>
            </p>
            {/* Always say which match the words are about */}
            <footer className="mt-3 flex items-center gap-2 text-sm text-muted">
              <SlamLogo event={matchById[chapter.epigraph.id].event} size="h-8 w-8" />
              <span>
                Your words, page {pages.get(chapter.epigraph.id)} ·{" "}
                <span className="font-semibold text-foreground">{eventLabel(matchById[chapter.epigraph.id])}</span> · {monthLabel(chapter.epigraph.date)}
              </span>
            </footer>
          </blockquote>
        )}

        <div className="rise mt-auto pt-8" style={beat(4)}>
          {/* A rivalry's score so far, each player's face and number at their end of the bar */}
          {score ? (
            <div className="flex items-center gap-3" aria-hidden>
              <Avatar name={faces[0]} size="h-9 w-9 text-sm" tone={tones.get(faces[0])} />
              <span className="font-display text-3xl font-bold">{score[0]}</span>
              <span className="flex h-2 flex-1 gap-[2px]">
                <span className="rounded-l-full bg-[var(--tint-a)] transition-all duration-500" style={{ width: `${(score[0] / (score[0] + score[1])) * 100}%` }} />
                <span className="flex-1 rounded-r-full bg-[var(--tint-b)]" />
              </span>
              <span className="font-display text-3xl font-bold">{score[1]}</span>
              <Avatar name={faces[1]} size="h-9 w-9 text-sm" tone={tones.get(faces[1])} />
            </div>
          ) : (
            chapter.footer.share !== null && (
              <div className="flex h-2 gap-[2px]" aria-hidden>
                <span className="rounded-l-full bg-[var(--tint-a)] transition-all duration-500" style={{ width: `${chapter.footer.share * 100}%` }} />
                <span className="flex-1 rounded-r-full bg-foreground/15" />
              </div>
            )
          )}
          <p className="mt-2.5 text-muted">
            {chapter.footer.label} <span className="font-semibold text-foreground">{chapter.footer.value}</span>
          </p>
        </div>
      </div>

      {rivalry ? (
        <ol className={`grid content-start gap-3 ${chapter.entries.length > 2 ? "sm:grid-cols-2" : ""}`}>
          {chapter.entries.map((e, k) => {
            const id = e.kind === "logged" ? e.id : `other-${e.key}`;
            const flash = (e.kind === "logged" && spot?.id === e.id) || focus?.key === id;
            // A fresh key replays the flash
            return (
              <MeetingCard
                key={flash ? `${id}-${spot?.n ?? 0}-${focus?.n ?? 0}` : id}
                entry={e}
                pages={pages}
                tones={tones}
                isEpigraph={e.kind === "logged" && chapter.epigraph?.id === e.id}
                flash={flash}
                onEdit={onEdit}
                i={2 + k}
              />
            );
          })}
        </ol>
      ) : (
        <ol className={`self-start ${chapter.compact ? "space-y-0.5" : "space-y-2"}`}>
          {chapter.entries.map((e, k) => (
            <EntryRow
              key={e.kind === "logged" ? (spot?.id === e.id || focus?.key === e.id ? `${e.id}-${spot?.n ?? 0}-${focus?.n ?? 0}` : e.id) : e.key}
              entry={e}
              pages={pages}
              compact={chapter.compact}
              isEpigraph={e.kind === "logged" && chapter.epigraph?.id === e.id}
              spot={focus && e.kind === "logged" && focus.key === e.id ? { id: e.id, n: focus.n } : spot}
              onEdit={onEdit}
              i={2 + k}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function EpiloguePage({ book, next }: { book: BookData; next: { title: string; open: () => void } }) {
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
        <div className="rise mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-10" style={beat(6)}>
          <button
            type="button"
            onClick={next.open}
            className="cursor-pointer rounded-full bg-foreground px-5 py-2.5 font-semibold text-background shadow-md transition hover:brightness-90"
          >
            Read next: {next.title} →
          </button>
          <p className="text-muted">To be continued in 2027.</p>
        </div>
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
  const diary = diaryPages(entries); // each match's page number
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

  // A match picked in the chart: its chapter opens and its card flashes
  const [focus, setFocus] = useState<{ key: string; n: number } | null>(null);
  useEffect(() => {
    if (!focus) return;
    const card = bookRef.current?.querySelector(`[data-focus="${focus.key}"], [data-beat="${focus.key}"]`);
    if (card && card.getBoundingClientRect().bottom > innerHeight) glideTo(card, "center");
  }, [focus]);

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
  const catchUp = rivalry ? missedMeetings(bookId, entries) : null;
  const nextBook = shelf[(shelf.findIndex((b) => b.id === bookId) + 1) % shelf.length];
  const open = (id: string) => {
    setTouched(true);
    setBookId(id);
    markSeen(id);
    setPageIdx(0);
    setDir(1);
  };

  // The cover, the at-a-glance page, a page per chapter and the ending. The log can change under an
  // open book, so keep the page in range.
  const pageCount = book.chapters.length + 3;
  const current = Math.min(pageIdx, pageCount - 1);
  const atStart = current === 0;
  const atEnd = current === pageCount - 1;
  const goTo = (p: number) => {
    setTouched(true);
    setDir(p >= current ? 1 : -1);
    setPageIdx(Math.max(0, Math.min(pageCount - 1, p)));
  };

  const pages: { label: string; node: ReactNode }[] = [
    { label: "the cover", node: <CoverPage book={book} catchUp={catchUp} photo={!!photo} onJump={(p) => goTo(p)} /> },
    {
      label: "at a glance",
      node: (
        <ShapePage
          book={book}
          catchUp={catchUp}
          spotId={spotId}
          onYear={rivalry ? (year) => goTo(2 + book.chapters.findIndex((c) => c.year === year)) : null}
          onMark={(x) => {
            const at = book.chapters.findIndex((c) => c.entries.some((e) => (e.kind === "logged" ? e.id === x.logId : e.key === x.key)));
            if (at < 0) return;
            setFocus((f) => ({ key: x.logId ?? `other-${x.key}`, n: (f?.n ?? 0) + 1 }));
            goTo(at + 2);
          }}
        />
      ),
    },
    ...book.chapters.map((c, i) => ({
      label: `chapter ${roman[i]}, ${c.year}`,
      node: <ChapterPage chapter={c} pages={diary} index={i} faces={book.faces} rivalry={rivalry} spot={spotId ? spot : null} focus={focus} onEdit={editInLog} />,
    })),
    { label: "where it stands", node: <EpiloguePage book={book} next={{ title: nextBook.title, open: () => open(nextBook.id) }} /> },
  ];
  const turn = (d: 1 | -1) => {
    if ((d < 0 && atStart) || (d > 0 && atEnd)) return;
    goTo(current + d);
  };
  // Forward from the last page is on to the next book
  const forward = () => (atEnd ? open(nextBook.id) : turn(1));
  const backLabel = atStart ? "Back" : `Back to ${pages[current - 1].label}`;
  const forwardLabel = atEnd ? `Next book: ${nextBook.title}` : `Next: ${pages[current + 1].label}`;

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

      {/* The open book, one page at a time, with an arrow either side to turn the pages */}
      <div className="relative mt-8">
        {/* The rest of the diary's pages, their edges showing along the right and the bottom */}
        <span aria-hidden className="absolute inset-0 translate-x-3 translate-y-2.5 rounded-[2rem] bg-surface shadow-[0_30px_50px_-24px_rgb(15_27_45/0.35)] ring-1 ring-line" />
        <span aria-hidden className="absolute inset-0 translate-x-1.5 translate-y-[5px] rounded-[2rem] bg-surface ring-1 ring-line" />
        <div
          ref={bookRef}
          tabIndex={0}
          aria-label={`${shelfBook.title}. Use the arrow keys to turn pages.`}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") turn(1);
            if (e.key === "ArrowLeft") turn(-1);
          }}
          style={tintVars(tintsOf(bookId, shelfBook.players))}
          className="glow relative scroll-mt-6 overflow-hidden rounded-[2rem] shadow-lg shadow-black/5 ring-1 ring-foreground/10 outline-none focus-visible:ring-2 focus-visible:ring-court"
        >
          {/* The spine down the left edge */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-black/[0.09] via-black/[0.03] to-transparent" />
          {/* A rivalry's cover photo, behind its first page */}
          {atStart && photo && (
            <div
              key={bookId}
              aria-hidden
              className="fade-in pointer-events-none absolute inset-x-0 top-0 h-80 opacity-90 [mask-image:linear-gradient(to_bottom,black_45%,transparent)] lg:inset-y-0 lg:left-auto lg:h-full lg:w-[68%] lg:[mask-image:linear-gradient(to_left,black_30%,transparent)]"
            >
              <Image src={photo.src} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 760px, 100vw" className={`object-cover ${photo.position}`} />
            </div>
          )}

          <div className="relative px-5 pt-4 sm:px-8 sm:pt-6">
            <Segments labels={pages.map((p) => p.label)} current={current} onPick={goTo} />
            <div className="mt-2 flex items-center justify-between gap-3 text-sm">
              {/* On a phone the arrows sit either side of the title */}
              <PageArrow dir={-1} label={backLabel} disabled={atStart} onClick={() => turn(-1)} className="h-9 w-9 md:hidden" />
              <span className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                {shelfBook.players.length ? (
                  <span className="flex shrink-0 -space-x-2.5">
                    <Faces names={shelfBook.players} size="h-9 w-9 text-xs ring-2 ring-surface" />
                  </span>
                ) : (
                  <CollectionIcon id={shelfBook.id} className="h-7 w-7 shrink-0 text-court" />
                )}
                <span className="truncate rounded-full bg-surface/80 px-2.5 py-0.5 backdrop-blur-sm">{shelfBook.title}</span>
              </span>
              <span className="shrink-0 rounded-full bg-surface/80 px-2.5 py-0.5 tabular-nums text-muted backdrop-blur-sm">
                {current + 1} / {pages.length}
              </span>
              <PageArrow dir={1} label={forwardLabel} nudge={!touched} onClick={forward} className="h-9 w-9 md:hidden" />
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
        </div>

        <PageArrow dir={-1} label={backLabel} disabled={atStart} onClick={() => turn(-1)} className="absolute -left-7 top-1/2 h-14 w-14 -translate-y-1/2 max-md:hidden" />
        <PageArrow dir={1} label={forwardLabel} nudge={!touched} onClick={forward} className="absolute -right-7 top-1/2 h-14 w-14 -translate-y-1/2 max-md:hidden" />
      </div>
    </div>
  );
}
