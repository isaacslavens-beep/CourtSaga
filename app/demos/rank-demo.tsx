"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import Image from "next/image";
import mastersLogo from "@/public/slams/masters-1000.png";
import { SlamLogo, TournamentLabel } from "../match-ui";
import { Avatar, BallRating, BallScore, Burst, CourtArt, NextStep } from "./fun";
import { eventLabel, matchById, matches, rivalryOf, tournamentOf, tournaments, type Match, type Tournament } from "./library";
import { useLog } from "./log-store";
import { glideTo, glideToRow } from "../glide";

// Each tournament's own colours: main, then second. Used for its tile, its podium and its whole panel.
const themes: Record<Tournament, { accent: string; second: string }> = {
  "Australian Open": { accent: "#1b84c9", second: "#0b3d6b" },
  "Roland Garros": { accent: "#c8501c", second: "#064a30" },
  Wimbledon: { accent: "#54237f", second: "#006633" },
  "US Open": { accent: "#002f87", second: "#ffd200" },
  "Other events": { accent: "#9c7a12", second: "#1a1a1a" },
};
const themeVars = (t: Tournament) => ({ "--t-accent": themes[t].accent, "--t-second": themes[t].second }) as CSSProperties;

// Gold, silver and bronze, and how tall each step of the podium stands
const medals = ["bg-ball text-black", "bg-[#d5dbe3] text-black", "bg-[#d99a63] text-black"];
const steps = ["h-20 sm:h-28 lg:h-[4.5rem]", "h-14 sm:h-20 lg:h-14", "h-10 sm:h-14 lg:h-10"];
// Left to right on the podium: second, first, third
const podiumOrder = [1, 0, 2];

/* ---------- Moving things around ---------- */

type Slot = { left: number; top: number; right: number; bottom: number };

/** Where every [data-slot] rests right now, in page coordinates, with any slide in progress set aside. */
function measureSlots(root: HTMLElement) {
  const els = [...root.querySelectorAll<HTMLElement>("[data-flip]")];
  for (const el of els) {
    el.style.transition = "";
    el.style.transform = "";
  }
  const slots: Slot[] = [];
  const at = new Map<string, { x: number; y: number }>();
  for (const el of els) {
    const r = el.getBoundingClientRect();
    slots[Number(el.dataset.slot)] = { left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY };
    at.set(el.dataset.flip!, { x: r.left + scrollX, y: r.top + scrollY });
  }
  return { els, slots, at };
}

/**
 * Whenever `key` changes, slides each [data-flip] element from where it was to where it is now, so a
 * match that moves is seen moving, even from the list up onto the podium. Returns where each slot
 * rests, for dragging to aim at.
 */
function useSlide(root: RefObject<HTMLElement | null>, key: string) {
  const last = useRef(new Map<string, { x: number; y: number }>());
  const slots = useRef<Slot[]>([]);
  useLayoutEffect(() => {
    if (!root.current) return;
    const { els, slots: now, at } = measureSlots(root.current);
    slots.current = now;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const el of els) {
      const was = last.current.get(el.dataset.flip!);
      const is = at.get(el.dataset.flip!)!;
      if (!was || still || (was.x === is.x && was.y === is.y)) continue;
      el.style.transform = `translate(${was.x - is.x}px, ${was.y - is.y}px)`;
      el.getBoundingClientRect(); // start from the old place...
      el.style.transition = "transform 340ms cubic-bezier(0.2, 0.7, 0.2, 1)";
      el.style.transform = ""; // ...and glide into the new one
    }
    last.current = at;
  }, [root, key]);
  return slots;
}

/* ---------- Pieces ---------- */

function MoveButton({
  dir,
  label,
  disabled,
  onClick,
  nudge = false,
}: {
  dir: "up" | "down";
  label: string;
  disabled: boolean;
  onClick: () => void;
  nudge?: boolean; // glow to invite a first try
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={dir === "up" ? "Move up" : "Move down"}
      disabled={disabled}
      onClick={onClick}
      style={nudge ? { animationDelay: "0.8s" } : undefined}
      className={`${nudge ? "nudge" : ""} flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-court/10 lg:h-7 lg:w-7 lg:rounded-lg text-court shadow-sm transition hover:bg-court hover:text-court-ink active:scale-90 disabled:cursor-default disabled:bg-transparent disabled:text-muted disabled:opacity-30 disabled:shadow-none`}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} />
      </svg>
    </button>
  );
}

/** Six dots: the place to grab a match. On touch screens it is the only place, so the page can still scroll. */
function Grip({ className = "" }: { className?: string }) {
  return (
    <span data-handle aria-hidden className={`flex cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing ${className}`}>
      <svg viewBox="0 0 10 16" className="h-4 w-2.5 fill-current">
        {[3, 8, 13].flatMap((y) => [2.5, 7.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}
      </svg>
    </span>
  );
}

type ItemProps = {
  m: Match;
  rank: number;
  count: number;
  isSlam: boolean;
  rating: number;
  onRate: (r: number) => void;
  onMove: (dir: -1 | 1) => void;
  onGrab: (e: ReactPointerEvent<HTMLElement>) => void;
  lifted: boolean; // being dragged: this is the gap it leaves
  flash: string;
  nudge: boolean;
};

const lift = (lifted: boolean) => (lifted ? "opacity-25 ring-2 ring-court" : "");

/** A match standing on the podium. */
function PodiumCard({ m, rank, count, isSlam, rating, onRate, onMove, onGrab, lifted, flash, nudge }: ItemProps) {
  return (
    <article
      data-flip={m.id}
      data-slot={rank}
      data-row={m.id}
      onPointerDown={onGrab}
      className={`relative select-none overflow-hidden rounded-2xl bg-surface md:cursor-grab md:active:cursor-grabbing ${rank === 0 ? "shadow-xl ring-2 ring-ball" : "shadow-lg ring-1 ring-line"} ${lift(lifted)} ${flash}`}
    >
      <div className="relative h-14 sm:h-20 lg:h-14">
        <CourtArt surface={m.surface} className="h-full w-full" />
        <span className="absolute left-2 top-2">
          <SlamLogo event={m.event} size="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <span className="absolute bottom-1.5 right-2 flex -space-x-2">
          <Avatar name={m.winner} size="h-6 w-6 text-[10px] ring-2 ring-white/70 sm:h-8 sm:w-8 sm:text-xs" />
          <Avatar name={m.loser} size="h-6 w-6 text-[10px] ring-2 ring-white/70 sm:h-8 sm:w-8 sm:text-xs" />
        </span>
        <Grip className="absolute right-1 top-1 h-7 w-6 rounded-lg bg-black/30 text-white md:hidden" />
      </div>
      <div className="px-2.5 pb-2.5 pt-2 sm:px-4 sm:pb-4 sm:pt-3 lg:px-2 lg:pb-3 lg:pt-2 xl:px-3.5">
        <p className="font-display text-base font-bold leading-tight sm:text-2xl lg:text-xl">{isSlam ? m.date.slice(0, 4) : m.event}</p>
        <p className="text-xs text-muted sm:text-sm">{m.round}</p>
        <p className="mt-1.5 hidden truncate text-sm sm:block lg:mt-1">
          <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>
        </p>
        <div className="mt-2 hidden sm:block lg:mt-1.5">
          <BallRating value={rating} onChange={onRate} size="sm" nudge={nudge} />
        </div>
        <div className="mt-1.5 sm:hidden">
          <BallScore value={rating} size="xs" />
        </div>
        <div className="mt-2 flex gap-1 lg:mt-1.5">
          <MoveButton dir="up" label={`Move ${eventLabel(m)} up`} disabled={rank === 0} onClick={() => onMove(-1)} />
          <MoveButton dir="down" label={`Move ${eventLabel(m)} down`} disabled={rank === count - 1} onClick={() => onMove(1)} nudge={nudge} />
        </div>
      </div>
    </article>
  );
}

/** A match from fourth place down. */
function ListRow({ m, rank, count, isSlam, rating, onRate, onMove, onGrab, lifted, flash }: ItemProps) {
  return (
    <li
      data-flip={m.id}
      data-slot={rank}
      data-row={m.id}
      onPointerDown={onGrab}
      className={`flex select-none items-center gap-2.5 rounded-2xl bg-surface py-2 pl-1.5 pr-2 shadow-sm ring-1 ring-line sm:gap-3 sm:pr-3 md:cursor-grab md:active:cursor-grabbing lg:rounded-xl lg:py-1.5 ${lift(lifted)} ${flash}`}
    >
      <Grip className="h-10 w-6 shrink-0 lg:h-8" />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-line font-display font-bold text-muted">
        {rank + 1}
      </span>
      <span className="relative hidden h-11 w-16 shrink-0 overflow-hidden rounded-lg sm:block lg:hidden">
        <CourtArt surface={m.surface} className="h-full w-full" />
        <span className="absolute left-1 top-1">
          <SlamLogo event={m.event} size="h-5 w-5" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        {isSlam ? (
          <p className="font-semibold lg:truncate">
            <span className="font-display text-lg">{m.date.slice(0, 4)}</span>
            <span className="text-muted"> · {m.round}</span>
          </p>
        ) : (
          <TournamentLabel event={eventLabel(m)} className="max-w-full" />
        )}
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm">
          <span className="flex shrink-0 -space-x-2 lg:max-xl:hidden">
            <Avatar name={m.winner} size="h-6 w-6 text-[10px] ring-2 ring-surface" />
            <Avatar name={m.loser} size="h-6 w-6 text-[10px] ring-2 ring-surface" />
          </span>
          <span className="truncate">
            <span className="font-semibold">{m.winner}</span> <span className="text-muted">beat {m.loser}</span>
          </span>
        </p>
        <div className="mt-1.5 sm:hidden">
          <BallRating value={rating} onChange={onRate} size="sm" />
        </div>
      </div>
      <div className="hidden sm:block">
        <BallRating value={rating} onChange={onRate} size="sm" />
      </div>
      <div className="flex shrink-0 flex-col gap-1 lg:flex-row">
        <MoveButton dir="up" label={`Move ${eventLabel(m)} up`} disabled={rank === 0} onClick={() => onMove(-1)} />
        <MoveButton dir="down" label={`Move ${eventLabel(m)} down`} disabled={rank === count - 1} onClick={() => onMove(1)} />
      </div>
    </li>
  );
}

/* ---------- The ranking ---------- */

type Drag = { id: string; offX: number; offY: number; x0: number; y0: number; live: boolean };

export function RankDemo() {
  const [tournament, setTournament] = useState<Tournament>("Wimbledon");
  // Ratings and the fan's own order live in the shared log
  const { entries, order, update, reorder, spotlight, goTo } = useLog();

  // Until the visitor touches a control, the gold card's controls glow
  const [touched, setTouched] = useState(false);
  // The match you last changed, so the next step can show where it landed
  const [editedId, setEditedId] = useState<string | null>(null);
  // Tennis balls fly when a match takes first place
  const [crowned, setCrowned] = useState(0);

  // Arriving from the log: open that match's tournament
  const [seenSpot, setSeenSpot] = useState(0);
  if (spotlight?.target === "rank" && spotlight.n !== seenSpot) {
    setSeenSpot(spotlight.n);
    setTournament(tournamentOf(matchById[spotlight.id]));
  }
  const spot = spotlight?.target === "rank" ? spotlight : null;
  // What the next step should show: what you changed here, or the match you arrived with
  const nextId = editedId ?? spot?.id ?? null;

  const root = useRef<HTMLDivElement>(null);
  // ...then bring the whole ranking into view if it fits on the screen, or else that match
  useEffect(() => {
    if (spotlight?.target !== "rank") return;
    const panel = root.current?.closest(".t-panel");
    if (panel && panel.getBoundingClientRect().height <= innerHeight - 48) glideTo(panel, "center");
    else glideToRow(root.current?.querySelector(`[data-row="${spotlight.id}"]`) ?? null, null);
  }, [spotlight]);

  // While dragging, the order on screen is a preview; letting go makes it the ranking
  const [preview, setPreview] = useState<string[] | null>(null);
  const [lifted, setLifted] = useState<{ id: string; x: number; y: number; w: number } | null>(null);
  const previewRef = useRef<string[] | null>(null);
  const drag = useRef<Drag | null>(null);
  const ghost = useRef<HTMLDivElement>(null);

  const ranked = order.filter((id) => tournamentOf(matchById[id]) === tournament);
  const ids = preview ?? ranked;
  const rows = ids.map((id) => matchById[id]);
  const isSlam = tournament !== "Other events";
  const slots = useSlide(root, `${tournament}:${ids.join()}`);

  const commit = (next: string[], id: string) => {
    setTouched(true);
    setEditedId(id);
    if (next[0] === id && ranked[0] !== id) setCrowned((n) => n + 1);
    reorder(next);
  };
  const rate = (m: Match, rating: number) => {
    setTouched(true);
    setEditedId(m.id);
    update(m.id, { rating });
  };
  const move = (id: string, dir: -1 | 1) => {
    const i = ranked.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ranked.length) return;
    const next = [...ranked];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next, id);
  };

  const grab = (id: string) => (e: ReactPointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (e.button !== 0 || target.closest("button, a, input")) return;
    // Mice can pick a card up anywhere; fingers use the grip, so the rest of the card still scrolls
    if (e.pointerType !== "mouse" && !target.closest("[data-handle]")) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { id, offX: e.clientX - r.left, offY: e.clientY - r.top, x0: e.clientX, y0: e.clientY, live: false };

    const onMove = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (!d.live) {
        if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 6) return;
        d.live = true;
        if (root.current) slots.current = measureSlots(root.current).slots;
        previewRef.current = ranked;
        setPreview(ranked);
        setLifted({ id, x: ev.clientX - d.offX, y: ev.clientY - d.offY, w: Math.min(r.width, 360) });
      }
      ev.preventDefault();
      if (ghost.current) ghost.current.style.translate = `${ev.clientX - d.offX}px ${ev.clientY - d.offY}px`;
      // Aim at the resting place under the pointer, not wherever a card is sliding through
      const [px, py] = [ev.clientX + scrollX, ev.clientY + scrollY];
      const to = slots.current.findIndex((s) => s && px >= s.left && px <= s.right && py >= s.top && py <= s.bottom);
      const cur = previewRef.current!;
      if (to >= 0 && cur[to] !== d.id) {
        const next = cur.filter((x) => x !== d.id);
        next.splice(to, 0, d.id);
        previewRef.current = next;
        setPreview(next);
      }
      // Near the top or bottom of the screen, keep the page moving
      if (ev.clientY < 72) scrollBy(0, -14);
      else if (ev.clientY > innerHeight - 72) scrollBy(0, 14);
    };
    const onUp = () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onUp);
      const d = drag.current;
      drag.current = null;
      if (d?.live && previewRef.current) commit(previewRef.current, d.id);
      previewRef.current = null;
      setPreview(null);
      setLifted(null);
    };
    addEventListener("pointermove", onMove, { passive: false });
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", onUp);
  };

  const itemProps = (m: Match, rank: number): ItemProps => ({
    m,
    rank,
    count: rows.length,
    isSlam,
    rating: entries[m.id].rating,
    onRate: (r) => rate(m, r),
    onMove: (dir) => move(m.id, dir),
    onGrab: grab(m.id),
    lifted: lifted?.id === m.id,
    flash: spot?.id === m.id ? "spot-flash" : "",
    nudge: !touched && rank === 0,
  });
  // A fresh key replays the arrival flash
  const keyOf = (m: Match) => (spot?.id === m.id ? `${m.id}-${spot.n}` : m.id);

  const ratings = rows.map((m) => entries[m.id].rating);
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const nextMatch = matchById[nextId ?? rows[0].id];
  const nextRivalry = rivalryOf(nextMatch);
  const held = lifted ? matchById[lifted.id] : null;

  return (
    <div style={themeVars(tournament)} className="t-theme t-panel scroll-mt-6 overflow-hidden rounded-3xl border-2 border-court/40 shadow-xl shadow-court/10">
      {/* Each tournament's two colours, as a band along the top */}
      <div aria-hidden className="flex h-2">
        <span className="flex-1 bg-[var(--t-accent)]" />
        <span className="flex-1 bg-[var(--t-second)]" />
      </div>
      {/* Pick a tournament: one big tile each, in its own colours */}
      <div role="tablist" aria-label="Tournaments" className="grid grid-cols-2 gap-3 border-b border-line p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-5 lg:gap-2.5 lg:p-3.5">
        {tournaments.map((t) => {
          const on = t === tournament;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTournament(t)}
              style={themeVars(t)}
              className={`t-theme flex cursor-pointer flex-col ${t === "Other events" ? "max-sm:col-span-2" : ""} items-center gap-2 rounded-2xl border-2 px-3 py-4 font-semibold transition duration-200 lg:flex-row lg:gap-2.5 lg:rounded-xl lg:px-2.5 lg:py-2 ${
                on
                  ? "-translate-y-1 border-court bg-court text-court-ink shadow-lg"
                  : "border-line bg-surface text-foreground hover:-translate-y-1 hover:border-court hover:shadow-md"
              }`}
            >
              {t === "Other events" ? (
                <span aria-hidden className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/10 lg:h-10 lg:w-10 lg:rounded-lg">
                  <Image src={mastersLogo} alt="" className="h-full w-full object-contain" sizes="112px" />
                </span>
              ) : (
                <SlamLogo event={t} size="h-14 w-14 rounded-xl p-1 lg:h-10 lg:w-10 lg:rounded-lg" />
              )}
              <span className="flex min-w-0 flex-col items-center gap-2 lg:items-start lg:gap-0">
                <span className="text-center leading-tight lg:text-left lg:text-sm">{t}</span>
                <span className={`text-sm font-medium lg:text-xs ${on ? "text-court-ink/85" : "text-muted"}`}>
                  {matches.filter((m) => tournamentOf(m) === t).length} matches
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* On wide screens the podium and the rest of the ranking sit side by side, so the whole ranking fits
          on one screen */}
      <div
        ref={root}
        role="tabpanel"
        className="p-4 sm:p-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-5 lg:p-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1 lg:col-span-2">
          <div>
            <h3 className="font-display text-2xl font-bold text-court">
              {isSlam ? `Your ${tournament} favourites` : "Your favourites everywhere else"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              <span className="max-md:hidden">Drag a match to a new place, or use the arrows.</span>
              <span className="md:hidden">Hold the dots to drag a match, or use the arrows.</span>
            </p>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            {rows.length} matches · your average
            <span className="font-display text-xl font-bold text-foreground">{average.toFixed(1)}</span>
            <BallScore value={Math.round(average)} size="xs" />
          </p>
        </div>

        {/* The podium: second, first, third */}
        <div className="mt-6 grid grid-cols-3 items-end gap-2 sm:gap-4 lg:mt-0 lg:gap-3">
          {podiumOrder.map((rank) => {
            const m = rows[rank];
            return (
              <div key={rank} className="relative flex min-w-0 flex-col">
                {m ? (
                  <PodiumCard key={keyOf(m)} {...itemProps(m, rank)} />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed border-line text-sm text-muted">
                    Empty
                  </div>
                )}
                {rank === 0 && <Burst trigger={crowned} />}
                <div
                  aria-hidden
                  className={`mt-2 flex justify-center rounded-t-xl border-t-4 border-[var(--t-second)] pt-2 lg:pt-1 ${steps[rank]}`}
                  style={{ background: `linear-gradient(to bottom, var(--t-accent), color-mix(in srgb, var(--t-accent) 72%, black))` }}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-lg font-bold shadow-md sm:h-11 sm:w-11 sm:text-xl lg:h-9 lg:w-9 lg:text-lg ${medals[rank]}`}>
                    {rank + 1}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Everyone else, from fourth down */}
        {rows.length > 3 ? (
          <ol className="mt-5 space-y-2 lg:mt-0 lg:space-y-1.5" aria-label="Fourth place and below">
            {rows.slice(3).map((m, k) => (
              <ListRow key={keyOf(m)} {...itemProps(m, k + 3)} />
            ))}
          </ol>
        ) : (
          // Beside the podium there would otherwise be a gap
          <p className="hidden rounded-2xl border-2 border-dashed border-line p-6 text-center text-sm text-muted lg:block">
            Every {isSlam ? tournament : "other"} match you log lines up here, below your top three.
          </p>
        )}
      </div>

      {/* The match in hand, following the pointer */}
      {held && lifted && (
        <div
          ref={ghost}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-50"
          style={{ width: lifted.w, translate: `${lifted.x}px ${lifted.y}px` }}
        >
          <div className="flex rotate-2 items-center gap-3 rounded-2xl bg-surface p-2 shadow-2xl shadow-black/40 ring-2 ring-court">
            <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg">
              <CourtArt surface={held.surface} className="h-full w-full" />
              <span className="absolute left-1 top-1">
                <SlamLogo event={held.event} size="h-5 w-5" />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{isSlam ? `${held.date.slice(0, 4)} · ${held.round}` : eventLabel(held)}</span>
              <span className="block truncate text-sm text-muted">
                {held.winner} beat {held.loser}
              </span>
            </span>
          </div>
        </div>
      )}

      <NextStep
        active={nextId !== null}
        onClick={() => goTo("story", nextMatch.id)}
        idle={
          <>
            Next: <span className="text-foreground">3 · Explore your saga</span>
          </>
        }
        done={
          <>
            {editedId ? "✓ Ranking updated. " : "Next: "}
            <span className="underline decoration-ball decoration-2 underline-offset-4">
              {nextRivalry
                ? `Find it in your ${nextRivalry.players.join(" & ")} book`
                : "Find it in your saga"}
            </span>
          </>
        }
      />
    </div>
  );
}
