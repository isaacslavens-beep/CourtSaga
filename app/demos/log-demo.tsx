"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import alcarazDjokovicAo2026 from "@/public/photos/alcaraz-djokovic-ao-2026-trophies.jpg";
import rybakinaUso2026Trophy from "@/public/photos/rybakina-uso-2026-trophy.jpg";
import sinnerWimbledon2025Trophy from "@/public/photos/sinner-wimbledon-2025-trophy.jpg";
import { HighlightsLink, SlamLogo, TournamentLabel } from "../match-ui";
import { Avatar, BallRating, BallScore, Burst, CourtArt, IconHeart, NextStep, playerStyle } from "./fun";
import { eventLabel, highlightVideos, matchById, matches, parseSets, tournamentOf, type FanEntry, type Surface } from "./library";
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

const surfaceStripe: Record<Surface, string> = { clay: "bg-clay", hard: "bg-hard", grass: "bg-lawn" };

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
      {/* Pick a match: one ticket per match in the log */}
      <div className="border-b border-line bg-background/60 py-4">
        <p className="px-4 text-sm font-semibold sm:px-5">
          Pick a match <span className="font-normal text-muted">· scroll for more</span>
        </p>
        <div ref={strip} className="mt-2 flex gap-2 overflow-x-auto px-4 pb-2 pt-1.5 sm:px-5" role="listbox" aria-label="Pick a match">
          {byYear.map(([y, ms]) => (
            <div key={y} className="flex shrink-0 gap-2">
              <span className="flex w-6 shrink-0 items-center justify-center">
                <span className="-rotate-90 whitespace-nowrap font-display text-sm font-bold text-muted">{y}</span>
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
                    className={`relative w-48 shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-surface text-left transition duration-200 ${
                      selected
                        ? "-translate-y-1 border-court shadow-lg ring-2 ring-court"
                        : "border-line hover:-translate-y-0.5 hover:border-court/60 hover:shadow-md"
                    }`}
                  >
                    <span className={`block h-1.5 ${surfaceStripe[m.surface]}`} />
                    <span className="block px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <SlamLogo event={m.event} size="h-5 w-5" />
                        <span className="truncate text-sm font-semibold text-muted">{m.event}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-1">
                        <span className="flex -space-x-2">
                          <Avatar name={m.winner} size="h-7 w-7 text-xs ring-2 ring-surface" />
                          <Avatar name={m.loser} size="h-7 w-7 text-xs ring-2 ring-surface" />
                        </span>
                        <span className="ml-1 truncate text-sm font-semibold">{m.round}</span>
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
                  className={`flex cursor-pointer items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-4 font-semibold transition duration-200 ${
                    on
                      ? `${st.border} ${st.soft} scale-105 shadow-md`
                      : "border-line bg-surface text-muted hover:-translate-y-0.5 hover:border-court hover:text-foreground"
                  } ${!touched && !on && p ? "nudge" : ""}`}
                >
                  {p ? (
                    <Avatar name={p} size="h-8 w-8 text-sm" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-line text-sm">–</span>
                  )}
                  {p ?? "No one"}
                  {on && p && <IconHeart className="h-4 w-4 fill-fault stroke-fault" />}
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
          <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-background shadow-lg">
            <div className="relative">
              {photo ? (
                <Image
                  key={focusId}
                  src={photo.src}
                  alt={photo.alt}
                  placeholder="blur"
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className={`aspect-[16/10] w-full object-cover sm:aspect-[2/1] ${photo.position}`}
                />
              ) : (
                <CourtArt surface={match.surface} className="aspect-[16/10] w-full sm:aspect-[2/1]" />
              )}
              <span
                key={`rating-${log.rating}`}
                className="sticker-in absolute right-3 top-3 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm"
              >
                <BallScore value={log.rating} size="sm" />
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a1220]/85 to-transparent px-5 pb-3 pt-12 text-white">
                <span className="flex min-w-0 flex-col gap-2">
                  <TournamentLabel event={event} onPhoto />
                  <HighlightsLink videoId={highlightVideos[focusId]} players={[match.winner, match.loser]} event={event} onPhoto />
                </span>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Avatar name={match.winner} size="h-9 w-9 text-sm" />
                <span className="font-display text-lg font-bold">{match.winner}</span>
                <span className="text-muted">beat {match.loser}</span>
                <span className="font-mono text-muted">{match.score}</span>
              </p>

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
