"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import alcarazDjokovicAo2026 from "@/public/photos/alcaraz-djokovic-ao-2026-trophies.jpg";
import rybakinaUso2026Trophy from "@/public/photos/rybakina-uso-2026-trophy.jpg";
import sinnerWimbledon2025Trophy from "@/public/photos/sinner-wimbledon-2025-trophy.jpg";
import { HighlightsLink, SlamLogo, TournamentLabel } from "../match-ui";
import { Avatar, BallRating, BallScore, Burst, CourtArt, IconHeart, NextStep, playerStyle } from "./fun";
import { eventLabel, highlightVideos, matchById, matches, parseSets, tournamentOf, type FanEntry, type Match } from "./library";
import { useLog } from "./log-store";

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

// Tickets grouped by the year the match was played, oldest first
const byYear = Object.entries(
  [...matches]
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce<Record<string, typeof matches>>((acc, m) => {
      (acc[m.date.slice(0, 4)] ??= []).push(m);
      return acc;
    }, {}),
);

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

/** A TV-style scorebug: both players, games per set, tiebreak points on the set's loser. Sets you didn't see are faded. */
function Scoreboard({ match, seen }: { match: Match; seen: number[] }) {
  const sets = match.score.split(" ").map((set, i) => {
    const { w, l } = parseSets(match.score)[i];
    const tb = set.match(/\((\d+)(?:-(\d+))?\)/);
    return { w, l, tb: tb ? (tb[2] ?? tb[1]) : null };
  });
  const missed = sets.some((_, i) => !seen.includes(i));
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
              const tookSet = row ? set.l > set.w : set.w > set.l;
              return (
                <span
                  key={i}
                  title={seen.includes(i) ? `Set ${i + 1}: you watched it` : `Set ${i + 1}: you missed it`}
                  className={`relative w-6 text-center font-mono text-lg tabular-nums sm:w-7 transition-opacity ${tookSet ? "font-bold text-white" : "text-white/55"} ${
                    seen.includes(i) ? "" : "opacity-35"
                  }`}
                >
                  {games}
                  {set.tb && !tookSet && <sup className="absolute -right-0.5 top-0.5 text-[9px] text-white/70">{set.tb}</sup>}
                </span>
              );
            })}
          </span>
        </div>
      ))}
      {missed && (
        <p className="border-t border-white/10 px-3.5 py-1.5 text-xs text-white/60">Faded sets are the ones you didn&apos;t see</p>
      )}
    </div>
  );
}

export function LogDemo() {
  const { entries, update, focusId, setFocusId, goTo } = useLog();
  const match = matchById[focusId];
  const event = eventLabel(match);
  const log = entries[focusId];
  const photo = photos[focusId];

  // Key controls glow until the visitor tries something
  const [touched, setTouched] = useState(false);
  const [burst, setBurst] = useState({ call: 0, rating: 0 });
  // The match you last changed, so the next step can show where it landed
  const [editedId, setEditedId] = useState<string | null>(null);
  const set = (patch: Partial<FanEntry>) => {
    setTouched(true);
    setEditedId(focusId);
    update(focusId, patch);
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

  const sets = parseSets(match.score);
  const players = [match.winner, match.loser];
  const setOptions = match.bestOf === 5 ? [3, 4, 5] : [2, 3];
  const pick = log.pick;

  // Checked against the real result
  const rightWinner = !!pick && pick.winner === match.winner;
  const exact = rightWinner && pick!.sets === sets.length;
  const backingWon = log.cheering === match.winner;

  const choosePick = (next: { winner: string; sets: number }) => {
    set({ pick: next });
    if (next.winner === match.winner && next.sets === sets.length) setBurst((b) => ({ ...b, call: b.call + 1 }));
  };

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
          Pick a match <span className="font-normal text-white/70">· {matches.length} in this log, scroll for more</span>
        </p>
        <div ref={strip} className="relative mt-2 flex gap-2.5 overflow-x-auto px-4 pb-2 pt-1.5 sm:px-5" role="listbox" aria-label="Pick a match">
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
                    <span className="relative block h-12">
                      <CourtArt surface={m.surface} className="h-full w-full" />
                      <span className="absolute left-2 top-2">
                        <SlamLogo event={m.event} size="h-6 w-6" />
                      </span>
                      <span className="absolute bottom-1.5 right-2 flex -space-x-2">
                        <Avatar name={m.winner} size="h-7 w-7 text-xs ring-2 ring-white/70" />
                        <Avatar name={m.loser} size="h-7 w-7 text-xs ring-2 ring-white/70" />
                      </span>
                    </span>
                    <span className="block px-3 py-2">
                      <span className="block truncate text-sm font-semibold">{m.event}</span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-muted">{m.round}</span>
                        <BallScore value={entries[m.id].rating} size="xs" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-10">
        {/* Three questions */}
        <div className="min-w-0 space-y-7">
          <Question step={1} title="Rate it">
            <span className="relative">
              <BallRating
                value={log.rating}
                size="lg"
                onChange={(rating) => {
                  set({ rating });
                  if (rating === 5) setBurst((b) => ({ ...b, rating: b.rating + 1 }));
                }}
                nudge={!touched}
              />
              <Burst trigger={burst.rating} />
            </span>
          </Question>

          <Question step={2} title="Who were you backing?">
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
                    set({ cheering: p, pick: p ? { winner: p, sets: pick?.sets || setOptions[0] } : null });
                    if (p === match.winner && (pick?.sets || setOptions[0]) === sets.length) setBurst((b) => ({ ...b, call: b.call + 1 }));
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
                  <span className={`whitespace-nowrap ${on ? "text-foreground" : ""}`}>{p ?? "No one"}</span>
                  {on && p && (
                    <span key={p} className="sticker-in absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-md ring-1 ring-line">
                      <IconHeart className="h-4 w-4 fill-fault stroke-fault" />
                    </span>
                  )}
                </button>
              );
            })}
            {log.cheering && (
              <span className="flex w-full flex-wrap items-center gap-2 pt-1">
                <span className="font-semibold text-muted">To win in</span>
                {setOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={pick?.sets === n}
                    aria-label={`${n} sets`}
                    onClick={() => choosePick({ winner: log.cheering!, sets: n })}
                    className={`h-10 w-10 cursor-pointer rounded-full border-2 font-display text-lg font-bold transition duration-200 ${
                      pick?.sets === n
                        ? "border-court bg-court text-court-ink shadow-md"
                        : "border-line bg-surface text-muted hover:-translate-y-0.5 hover:border-court hover:text-court"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <span className="font-semibold text-muted">sets</span>
              </span>
            )}
          </Question>

          <label className="block">
            <span className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-court/15 text-sm text-court">3</span>
              Your words
              <span className="font-sans text-sm font-normal text-muted">· anything you like</span>
            </span>
            <textarea
              value={log.note}
              onChange={(e) => set({ note: e.target.value })}
              rows={2}
              placeholder="Where you watched, who with, how it felt…"
              className="mt-2.5 w-full resize-none rounded-xl border-2 border-dashed border-ball bg-ball/10 px-3 py-2 leading-7 placeholder:text-muted/70 focus:border-solid focus:outline-none"
            />
          </label>
        </div>

        {/* What lands in the log. Each part pops when the answer that drives it changes. */}
        <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <p className="text-sm font-semibold text-muted">Your log entry</p>
          <div className="mt-2 overflow-hidden rounded-3xl border border-line bg-background shadow-xl">
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
                  <TournamentLabel event={event} onPhoto />
                  <HighlightsLink videoId={highlightVideos[focusId]} players={[match.winner, match.loser]} event={event} onPhoto />
                </span>
                <span key={`rating-${log.rating}`} className="sticker-in shrink-0 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
                  <BallScore value={log.rating} size="sm" />
                </span>
              </div>
            </div>

            <div className="relative -mt-14 space-y-4 px-4 pb-5">
              <Scoreboard key={focusId} match={match} seen={log.setsSeen} />

              <div className="flex flex-wrap gap-2">
                {log.cheering ? (
                  <span
                    key={`backing-${log.cheering}`}
                    className={`sticker-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                      backingWon ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"
                    }`}
                  >
                    <IconHeart className="h-4 w-4" />
                    {log.cheering} {backingWon ? "won" : "lost"}
                  </span>
                ) : (
                  <span key="backing-none" className="sticker-in rounded-full bg-surface px-3 py-1 text-muted ring-1 ring-line">
                    Not backing anyone
                  </span>
                )}
                {pick && (
                  <span className="relative">
                    <span
                      key={`call-${pick.winner}-${pick.sets}`}
                      className={`sticker-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${
                        exact ? "bg-grass text-background" : rightWinner ? "bg-ball/40 text-foreground" : "bg-fault/15 text-fault"
                      }`}
                    >
                      {exact ? "✓ Called it exactly!" : rightWinner ? `✓ Right winner, but it went ${sets.length}` : `✗ Picked ${pick.winner}`}
                    </span>
                    <Burst trigger={burst.call} />
                  </span>
                )}
              </div>

              {log.note && (
                <p className="rounded-xl bg-ball/15 px-4 py-3 font-medium italic leading-relaxed">&ldquo;{log.note}&rdquo;</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <NextStep
        active={editedId !== null}
        onClick={() => goTo("rank", editedId ?? focusId)}
        idle={
          <>
            Next: <span className="text-foreground">2 · Your tournament rankings</span>
          </>
        }
        done={
          <>
            ✓ Logged {eventLabel(matchById[editedId ?? focusId])}.{" "}
            <span className="underline decoration-ball decoration-2 underline-offset-4">
              See where it ranks among your {tournamentOf(matchById[editedId ?? focusId]).replace("Other events", "other")} favourites
            </span>
          </>
        }
      />
    </div>
  );
}
