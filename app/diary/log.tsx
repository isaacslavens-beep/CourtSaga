"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import alcarazDjokovicAo2026 from "@/public/photos/alcaraz-djokovic-ao-2026-trophies.jpg";
import rybakinaUso2026Trophy from "@/public/photos/rybakina-uso-2026-trophy.jpg";
import sinnerWimbledon2025Trophy from "@/public/photos/sinner-wimbledon-2025-trophy.jpg";
import { HighlightsLink, SlamLogo, TournamentLabel } from "../match-ui";
import { Avatar, BallRating, BallScore, Burst, CourtArt, IconHeart, NextStep, PageArrow, playerStyle, watchIcons } from "./fun";
import { diaryPages, endingOf, eventLabel, finished, monthLabel, parseScore, roundName, setWinner, watched, watchedHow, type FanEntry, type Match, type WatchMode } from "./library";
import { highlightVideos, sameMatch } from "./media";
import { useLog } from "./store";

// Photos for a few matches; the rest get a drawing of their court
const photos: Record<string, { src: StaticImageData; alt: string; position: string }> = {
  wim25: {
    src: sinnerWimbledon2025Trophy,
    alt: "Jannik Sinner lifting the Wimbledon trophy on Centre Court",
    position: "object-[35%_30%]",
  },
  uso26w: {
    src: rybakinaUso2026Trophy,
    alt: "Elena Rybakina holding up the US Open trophy",
    position: "object-[50%_25%]",
  },
  ao26: {
    src: alcarazDjokovicAo2026,
    alt: "Carlos Alcaraz with the Australian Open trophy and Novak Djokovic with the runner-up plate on court",
    position: "object-[50%_30%]",
  },
};

const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/** A new star for a match you've just found: not watched (say if you did), starred this month, no rating yet */
function blankEntry(): FanEntry {
  return {
    watchedOn: null,
    watchedDate: thisMonth(),
    rating: null,
    cheering: null,
    pick: null,
    tags: [],
    note: "",
    classic: false,
  };
}

function Question({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-display text-lg font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-court/15 text-sm text-court">{step}</span>
        {title}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** A TV-style scorebug: both players, games per set, tiebreak points on the set's loser. */
export function Scoreboard({ match }: { match: Match }) {
  const { sets: parsed } = parseScore(match.score);
  const done = finished(match.score);
  const sets = parsed.map((set, i) => ({ ...set, took: setWinner(parsed, i, done) }));
  const ending = endingOf(match);
  return (
    <div className="overflow-hidden rounded-2xl bg-[#0a1220]/90 text-white shadow-xl ring-1 ring-white/15 backdrop-blur-md">
      {[match.winner, match.loser].map((name, row) => (
        <div key={name} className={`flex items-center gap-2.5 px-3.5 py-2 ${row ? "border-t border-white/10" : ""}`}>
          <Avatar name={name} size="h-7 w-7 text-xs" />
          <span className={`min-w-0 flex-1 truncate font-display text-lg font-bold ${row ? "text-white/65" : ""}`}>{name}</span>
          {!row && <span className="rounded-full bg-ball px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-black max-sm:hidden">Won</span>}
          <span className="flex">
            {sets.map((set, i) => {
              const games = row ? set.l : set.w;
              const tookSet = set.took === (row ? "l" : "w");
              return (
                <span
                  key={i}
                  className={`relative w-6 text-center font-mono text-lg tabular-nums sm:w-7 ${tookSet ? "font-bold text-white" : "text-white/55"}`}
                >
                  {games}
                  {set.tb !== null && set.took && !tookSet && <sup className="absolute -right-0.5 top-0.5 text-[9px] text-white/70">{set.tb}</sup>}
                </span>
              );
            })}
          </span>
        </div>
      ))}
      {ending && <p className="border-t border-white/10 px-3.5 py-1.5 text-xs text-white/60">{ending}</p>}
    </div>
  );
}

/* ---------- The parts of a page only a real diary asks about ---------- */

const watchModes: { mode: WatchMode; label: string }[] = [
  { mode: "Live", label: "In person" },
  { mode: "TV", label: "On TV" },
  { mode: "Stream", label: "Streamed" },
];

const noSubscribe = () => () => {};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const chip = (on: boolean) =>
  `inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 px-3 py-1.5 font-semibold transition duration-200 ${
    on ? "border-court bg-court text-court-ink shadow-md" : "border-line bg-surface text-muted hover:-translate-y-0.5 hover:border-court hover:text-court"
  }`;

/** Whether you watched it, and if so how and when. A match can be starred without being watched. */
function WatchQuestion({ step, match, log, set }: { step: number; match: Match; log: FanEntry; set: (patch: Partial<FanEntry>) => void }) {
  const played = match.date.slice(0, 7);
  const seen = log.watchedOn !== null;
  const later = log.watchedDate !== played;
  const [year, month] = log.watchedDate.split("-").map(Number);
  const firstYear = Number(played.slice(0, 4));
  // Up to this year once in the browser; while the page is built, up to the year already chosen
  const thisYear = useSyncExternalStore(noSubscribe, () => new Date().getFullYear(), () => year);
  const years = Array.from({ length: Math.max(1, Math.max(thisYear, year) - firstYear + 1) }, (_, i) => firstYear + i);
  // Never before it was played
  const setWatched = (y: number, m: number) => set({ watchedDate: `${y}-${String(m).padStart(2, "0")}` < played ? played : `${y}-${String(m).padStart(2, "0")}` });

  return (
    <Question step={step} title="Did you watch it?">
      {watchModes.map(({ mode, label }) => {
        const Icon = watchIcons[mode];
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={log.watchedOn === mode}
            // Watching it for the first time here: as it happened, unless said otherwise
            onClick={() => set(seen ? { watchedOn: mode } : { watchedOn: mode, watchedDate: played })}
            className={chip(log.watchedOn === mode)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
      <button type="button" aria-pressed={!seen} onClick={() => set({ watchedOn: null, watchedDate: thisMonth() })} className={chip(!seen)}>
        ☆ Didn&apos;t watch it
      </button>
      {seen && (
      <span className="flex w-full flex-wrap items-center gap-2 pt-1">
        <button type="button" aria-pressed={!later} onClick={() => set({ watchedDate: played })} className={chip(!later)}>
          As it happened · {monthLabel(played)}
        </button>
        <button type="button" aria-pressed={later} onClick={() => !later && setWatched(new Date().getFullYear(), new Date().getMonth() + 1)} className={chip(later)}>
          Later
        </button>
        {later && (
          <span className="flex items-center gap-1.5">
            <label className="sr-only" htmlFor="watched-month">
              Month you watched it
            </label>
            <select id="watched-month" value={month} onChange={(e) => setWatched(year, Number(e.target.value))} className="rounded-xl border-2 border-line bg-surface px-2 py-1.5 font-semibold">
              {months.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="watched-year">
              Year you watched it
            </label>
            <select id="watched-year" value={year} onChange={(e) => setWatched(Number(e.target.value), month)} className="rounded-xl border-2 border-line bg-surface px-2 py-1.5 font-semibold">
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </span>
        )}
      </span>
      )}
    </Question>
  );
}

// A few to tap; anything else can be typed
const suggestedTags = ["Marathon", "Comeback", "Tiebreak drama", "Upset", "Late night", "Rain delay", "With friends", "First time"];

function TagPicker({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const toggle = (tag: string) => onChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag].slice(0, 8));
  const addDraft = () => {
    const tag = draft.replace(/\s+/g, " ").trim().slice(0, 24);
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) toggle(tag);
    setDraft("");
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {[...new Set([...suggestedTags, ...tags])].map((tag) => (
        <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => toggle(tag)} className={`${chip(tags.includes(tag))} px-2.5 py-1 text-sm`}>
          {tags.includes(tag) ? "✓ " : "+ "}
          {tag}
        </button>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addDraft();
          }
        }}
        onBlur={addDraft}
        maxLength={24}
        placeholder="Your own tag"
        aria-label="Add your own tag"
        className="w-36 rounded-full border-2 border-dashed border-line bg-surface px-3 py-1 text-sm placeholder:text-muted/70 focus:border-court focus:outline-none"
      />
    </div>
  );
}

export function LogSection() {
  const { mode, matches, entries, update, add, remove, focusId, setFocusId, goTo, saving } = useLog();
  const diary = mode === "diary";

  // Tickets grouped by the year the match was played, oldest first
  const byYear = useMemo(
    () =>
      Object.entries(
        Object.values(matches)
          .filter((m) => entries[m.id])
          .sort((a, b) => a.date.localeCompare(b.date))
          .reduce<Record<string, Match[]>>((acc, m) => {
            (acc[m.date.slice(0, 4)] ??= []).push(m);
            return acc;
          }, {}),
      ),
    [matches, entries],
  );
  const pageCount = byYear.reduce((n, [, ms]) => n + ms.length, 0);
  const pages = diaryPages(entries, matches);

  // A match found but not yet logged is a new page: its answers are kept here until it's added
  const [draft, setDraft] = useState<{ id: string; entry: FanEntry } | null>(null);
  const match = focusId ? matches[focusId] : null;
  if (match && !entries[match.id] && draft?.id !== match.id) setDraft({ id: match.id, entry: blankEntry() });
  const isDraft = !!match && !entries[match.id];
  const log = match ? (entries[match.id] ?? (draft?.id === match.id ? draft.entry : blankEntry())) : null;

  // Key controls glow until the visitor tries something
  const [touched, setTouched] = useState(false);
  // Celebrations belong to the page they happened on. Turning to another page redraws it, so each new
  // page starts with none, or an old one would replay (React's pattern for resetting state on a prop change).
  const [burst, setBurst] = useState({ id: focusId, call: 0, rating: 0 });
  if (burst.id !== focusId) setBurst({ id: focusId, call: 0, rating: 0 });
  const celebrate = (kind: "call" | "rating") => setBurst((b) => ({ ...b, [kind]: b[kind] + 1 }));
  // The match you last changed, so the next step can show where it landed
  const [editedId, setEditedId] = useState<string | null>(null);
  const set = (patch: Partial<FanEntry>) => {
    if (!match) return;
    setTouched(true);
    if (isDraft) return setDraft((d) => (d ? { ...d, entry: { ...d.entry, ...patch } } : d));
    setEditedId(match.id);
    update(match.id, patch);
  };
  const addDraft = () => {
    if (!match || !log) return;
    add(match.id, log);
    setEditedId(match.id);
  };
  const tearOut = () => {
    if (!match || !window.confirm(`Remove your star from ${eventLabel(match)}? Everything you wrote about it goes with it.`)) return;
    const rest = Object.keys(entries).filter((id) => id !== match.id);
    remove(match.id);
    if (editedId === match.id) setEditedId(null);
    setFocusId(rest.sort((a, b) => (pages.get(b) ?? 0) - (pages.get(a) ?? 0))[0] ?? "");
  };

  // Keep the chosen ticket in view in the strip, without moving the page
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-ticket="${focusId}"]`);
    if (!strip.current || !el) return;
    strip.current.scrollTo({
      left: el.offsetLeft - strip.current.clientWidth / 2 + el.clientWidth / 2,
      behavior: "smooth",
    });
  }, [focusId]);

  // Which arrows to show: none back at the start, none forward at the end
  const [edges, setEdges] = useState({ back: false, forward: true });
  const readEdges = () => {
    const s = strip.current;
    if (!s) return;
    setEdges({ back: s.scrollLeft > 8, forward: s.scrollLeft + s.clientWidth < s.scrollWidth - 8 });
  };
  useEffect(() => {
    readEdges();
    window.addEventListener("resize", readEdges);
    return () => window.removeEventListener("resize", readEdges);
  }, [pageCount]);
  const scrollStrip = (dir: 1 | -1) =>
    strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.75, behavior: "smooth" });

  const players = match ? [match.winner, match.loser] : [];
  // Checked against the real result
  const backingWon = !!match && log?.cheering === match.winner;

  const event = match ? eventLabel(match) : "";
  const page = match ? pages.get(match.id) : undefined;
  const photo = match ? photos[sameMatch[match.id] ?? match.id] : undefined;
  const nextId = editedId && entries[editedId] ? editedId : null;
  const wordsStep = 4;

  return (
    <div className="scroll-mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-court/5">
      {/* Pick a match: one court ticket per match in the log, on a hard-court band */}
      <div className="relative overflow-hidden bg-[#1d4f91] py-4 text-white">
        <svg aria-hidden viewBox="0 0 1200 160" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]">
          <g fill="none" stroke="white" strokeWidth="3">
            <rect x="60" y="14" width="1080" height="132" />
            <line x1="60" y1="32" x2="1140" y2="32" />
            <line x1="60" y1="128" x2="1140" y2="128" />
            <line x1="330" y1="32" x2="330" y2="128" />
            <line x1="870" y1="32" x2="870" y2="128" />
            <line x1="330" y1="80" x2="870" y2="80" />
            <line x1="600" y1="6" x2="600" y2="154" strokeWidth="5" />
          </g>
        </svg>
        <p className="relative px-4 text-sm font-semibold sm:px-5">
          {diary ? (
            <>
              Your stars{" "}
              <span className="font-normal text-white/70">
                · {pageCount === 1 ? "1 match" : `${pageCount} matches`} starred, {Object.values(entries).filter(watched).length} watched{pageCount > 4 ? ", scroll for more" : ""}
              </span>
            </>
          ) : (
            <>
              Pick a match <span className="font-normal text-white/70">· {pageCount} starred in this diary, scroll for more</span>
            </>
          )}
        </p>
        {pageCount === 0 ? (
          <p className="relative mx-4 mt-2 rounded-xl border-2 border-dashed border-white/30 px-4 py-6 text-center font-medium text-white/85 sm:mx-5">
            Every match you star becomes a page here, watched or not. Find your first one above.
          </p>
        ) : (
          <div className="relative mt-2">
            {/* Arrows either side, so it's clear there's more to scroll to */}
            <PageArrow
              dir={-1}
              label="Earlier matches"
              disabled={!edges.back}
              onClick={() => scrollStrip(-1)}
              className="absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 sm:left-3"
            />
            <PageArrow
              dir={1}
              label="Later matches"
              disabled={!edges.forward}
              onClick={() => scrollStrip(1)}
              className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 sm:right-3"
            />
            <div
              ref={strip}
              onScroll={readEdges}
              className="relative flex gap-2.5 overflow-x-auto px-4 pb-2 pt-1.5 sm:px-5"
              role="listbox"
              aria-label="Pick a match"
            >
              {byYear.map(([y, ms]) => (
                <div key={y} className="flex shrink-0 gap-2.5">
                  <span className="flex w-6 shrink-0 items-center justify-center">
                    <span className="-rotate-90 whitespace-nowrap font-display text-sm font-bold text-white/70">{y}</span>
                  </span>
                  {ms.map((m) => {
                    const selected = m.id === focusId;
                    return (
                      <button
                        key={m.id}
                        data-ticket={m.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setTouched(true);
                          setFocusId(m.id);
                        }}
                        className={`relative w-48 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-surface text-left text-foreground shadow-md transition duration-200 ${
                          selected ? "-translate-y-1 shadow-xl ring-4 ring-ball" : "opacity-90 hover:-translate-y-1 hover:opacity-100 hover:shadow-lg"
                        }`}
                      >
                        <span className="relative block h-16">
                          <CourtArt surface={m.surface} className="h-full w-full" />
                          <span className="absolute left-2 top-2">
                            <SlamLogo event={m.event} size="h-9 w-9" />
                          </span>
                          <span className="absolute bottom-1.5 right-2 flex -space-x-2">
                            <Avatar name={m.winner} size="h-10 w-10 text-sm ring-2 ring-white/70" />
                            <Avatar name={m.loser} size="h-10 w-10 text-sm ring-2 ring-white/70" />
                          </span>
                        </span>
                        <span className="block px-3 py-2">
                          <span className="block truncate text-sm font-semibold">{m.event}</span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-sm text-muted">{roundName(m)}</span>
                            {watched(entries[m.id]) ? <BallScore value={entries[m.id].rating} size="xs" /> : <span className="text-xs font-semibold text-muted">☆ Starred</span>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {match && log ? (
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-10">
          {/* The questions */}
          <div className="min-w-0 space-y-7">
            {diary && isDraft && (
              <p className="rounded-2xl bg-ball/25 px-4 py-3 font-medium">
                Starring <span className="font-semibold">{event}</span>. Say if you watched it and anything else you like, then star it.
              </p>
            )}
            <WatchQuestion step={1} match={match} log={log} set={set} />

            <Question step={2} title="Rate it · if you like">
              <span className="relative">
                <BallRating
                  value={log.rating}
                  size="lg"
                  onChange={(rating) => {
                    set({ rating });
                    if (rating === 5) celebrate("rating");
                  }}
                  nudge={!touched}
                />
                <Burst trigger={burst.rating} />
              </span>
              {diary && (
                <button type="button" aria-pressed={log.classic} onClick={() => set({ classic: !log.classic })} className={chip(log.classic)}>
                  {log.classic ? "★ A classic" : "☆ Mark as a classic"}
                </button>
              )}
            </Question>

            <Question step={3} title="Who were you backing?">
              {[...players, null].map((p) => {
                const on = log.cheering === p;
                const st = playerStyle(p);
                return (
                  <button
                    key={p ?? "none"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      // Backing someone is your call that they'll win
                      set({ cheering: p, pick: p ? { winner: p } : null });
                      if (p === match.winner) celebrate("call");
                    }}
                    style={!touched && !on && p ? { animationDelay: "1.2s" } : undefined}
                    className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 px-2 pb-3 pt-4 sm:px-3 font-semibold transition duration-200 ${
                      p ? "min-w-0 flex-1 sm:w-32 sm:flex-none" : "w-20 shrink-0 sm:w-24"
                    } ${
                      on
                        ? `${st.border} ${st.soft} -translate-y-1 shadow-lg`
                        : "border-line bg-surface text-muted hover:-translate-y-1 hover:border-court hover:text-foreground hover:shadow-md"
                    } ${!touched && !on && p ? "nudge" : ""}`}
                  >
                    {p ? (
                      <Avatar name={p} size={`text-xl ${on ? "h-16 w-16" : "h-14 w-14"} transition-all`} />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-line text-xl">–</span>
                    )}
                    <span className={`max-w-full truncate whitespace-nowrap ${on ? "text-foreground" : ""}`}>{p ?? "No one"}</span>
                    {on && p && (
                      <span key={p} className="sticker-in absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-md ring-1 ring-line">
                        <IconHeart className="h-4 w-4 fill-fault stroke-fault" />
                      </span>
                    )}
                  </button>
                );
              })}
            </Question>

            <div>
              <label className="block">
                <span className="flex items-center gap-2 font-display text-lg font-bold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-court/15 text-sm text-court">{wordsStep}</span>
                  Your words
                  <span className="font-sans text-sm font-normal text-muted">· why it matters to you, or anything else</span>
                </span>
                <textarea
                  value={log.note}
                  onChange={(e) => set({ note: e.target.value })}
                  rows={3}
                  maxLength={diary ? 2000 : undefined}
                  placeholder="Where you watched, who with, why it's one to remember…"
                  className="paper mt-2.5 w-full resize-none rounded-xl border border-line bg-surface pb-1 pr-3 pt-0 leading-[var(--rule)] shadow-sm [--rule:1.75rem] placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-2 focus:ring-court/20"
                />
              </label>
              {diary && <TagPicker tags={log.tags} onChange={(tags) => set({ tags })} />}
            </div>

            {diary &&
              (isDraft ? (
                <button
                  type="button"
                  onClick={addDraft}
                  className="inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ball px-6 py-3 text-lg font-bold text-[#0b0d12] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  ★ Star this match
                </button>
              ) : (
                <p className="text-sm text-muted" role="status" aria-live="polite">
                  {saving === "error" ? (
                    <span className="font-semibold text-fault">Couldn&apos;t save your last change. Check your connection, then try again.</span>
                  ) : saving === "saving" ? (
                    "Saving…"
                  ) : (
                    "Changes save as you go."
                  )}
                </p>
              ))}
          </div>

          {/* What lands in the log: this match's page in your diary, on top of the rest. It turns when you
              pick another match, and each part pops when the answer that drives it changes. */}
          <div className="min-w-0 pb-3 lg:sticky lg:top-8 lg:self-start">
            <div key={focusId} className="page-turn page-stack overflow-hidden rounded-3xl border border-line bg-surface">
              {/* The page's heading: its number, and when and how you watched */}
              <p className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 text-sm">
                <span className="font-semibold">
                  {page ? (
                    <>
                      Page {page} <span className="font-normal text-muted">of your diary</span>
                    </>
                  ) : (
                    <>
                      New page <span className="font-normal text-muted">· not starred yet</span>
                    </>
                  )}
                </span>
                <span className="text-muted">
                  {watched(log) ? `${monthLabel(log.watchedDate)}, ${watchedHow(log.watchedOn)}` : `☆ Starred ${monthLabel(log.watchedDate)} · not watched`}
                </span>
              </p>
              <div className="relative">
                {photo ? (
                  <Image
                    key={focusId}
                    src={photo.src}
                    alt={photo.alt}
                    placeholder="blur"
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className={`fade-in aspect-[16/10] w-full object-cover ${photo.position}`}
                  />
                ) : (
                  <CourtArt key={focusId} surface={match.surface} className="fade-in aspect-[16/10] w-full" />
                )}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-[#0a1220]/75 to-transparent px-4 pb-10 pt-3 text-white">
                  <span className="flex min-w-0 flex-col gap-2">
                    <TournamentLabel event={event} surface={match.surface} onPhoto />
                    <HighlightsLink videoId={highlightVideos[match.id]} players={[match.winner, match.loser]} event={event} onPhoto />
                  </span>
                  <span key={`rating-${log.rating}`} className="sticker-in shrink-0 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
                    <BallScore value={log.rating} size="sm" />
                  </span>
                </div>
              </div>

              <div className="relative -mt-14 space-y-4 px-4 pb-4">
                <Scoreboard key={focusId} match={match} />

                <div className="flex flex-wrap gap-2">
                  {log.cheering ? (
                    <span className="relative">
                    <span
                      key={`backing-${log.cheering}`}
                      className={`sticker-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                        backingWon ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"
                      }`}
                    >
                      <IconHeart className="h-4 w-4" />
                      {log.cheering} {backingWon ? "won" : "lost"}
                    </span>
                    <Burst trigger={burst.call} />
                    </span>
                  ) : (
                    <span key="backing-none" className="sticker-in rounded-full bg-surface px-3 py-1 text-muted ring-1 ring-line">
                      Not backing anyone
                    </span>
                  )}
                  {/* A real diary's own marks: a classic, and the fan's tags */}
                  {mode !== "demo" && log.classic && (
                    <span key="classic" className="sticker-in rounded-full bg-ball px-3 py-1 font-semibold text-[#0b0d12]">
                      ★ Classic
                    </span>
                  )}
                  {mode !== "demo" &&
                    log.tags.map((tag) => (
                      <span key={`tag-${tag}`} className="sticker-in rounded-full bg-surface px-3 py-1 text-sm font-semibold text-muted ring-1 ring-line">
                        {tag}
                      </span>
                    ))}
                </div>
              </div>

              {/* Your words, written on the page's lines as you type them */}
              <p className="paper min-h-[calc(var(--rule)*2+0.5rem)] border-t border-line pb-2 pr-4 font-medium leading-[var(--rule)] [--rule:1.75rem]">
                {log.note}
              </p>
            </div>
            {diary && !isDraft && (
              <button type="button" onClick={tearOut} className="mt-5 cursor-pointer text-sm font-semibold text-muted underline-offset-4 hover:text-fault hover:underline">
                Remove this star
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="p-8 text-center text-lg font-medium text-muted">Find a match above and its page opens here.</p>
      )}

      {match && (
        <NextStep
          active={diary ? nextId !== null || isDraft : editedId !== null}
          onClick={() => {
            if (diary && isDraft) return addDraft();
            goTo("explore", nextId ?? editedId ?? match.id);
          }}
          idle={
            <>
              Next: <span className="font-bold">2 · Explore the story around it</span>
            </>
          }
          done={
            diary && isDraft ? (
              <span className="font-bold underline decoration-2 underline-offset-4">Save this match as a new page</span>
            ) : (
              <>
                ★ Starred: page {pages.get(nextId ?? editedId ?? match.id)} of your diary.{" "}
                <span className="font-bold underline decoration-2 underline-offset-4">Explore the story around it</span>
              </>
            )
          }
        />
      )}
    </div>
  );
}
