"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import mastersLogo from "@/public/slams/masters-1000.png";
import { SlamLogo, TournamentLabel } from "../match-ui";
import { Avatar, BallRating, BallScore, NextStep, TennisBall } from "./fun";
import { eventLabel, matchById, matches, rivalryOf, tournamentOf, tournaments, type Match, type Tournament } from "./library";
import { useLog } from "./log-store";
import { glideToRow } from "../glide";

// Each tournament's own colours: main, then second. Used for its tile and its whole ranking panel.
const themes: Record<Tournament, { accent: string; second: string }> = {
  "Australian Open": { accent: "#1b84c9", second: "#0b3d6b" },
  "Roland Garros": { accent: "#c8501c", second: "#064a30" },
  Wimbledon: { accent: "#54237f", second: "#006633" },
  "US Open": { accent: "#002f87", second: "#ffd200" },
  "Other events": { accent: "#9c7a12", second: "#1a1a1a" },
};
const themeVars = (t: Tournament) => ({ "--t-accent": themes[t].accent, "--t-second": themes[t].second }) as CSSProperties;

// Gold, silver and bronze for the top three
const medals = [
  "bg-ball text-black ring-4 ring-ball/30",
  "bg-[#d5dbe3] text-black ring-4 ring-[#d5dbe3]/40",
  "bg-[#d99a63] text-black ring-4 ring-[#d99a63]/30",
];

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
      className={`${nudge ? "nudge" : ""} flex h-8 w-9 cursor-pointer items-center justify-center rounded-xl bg-court/10 text-court shadow-sm transition hover:bg-court hover:text-court-ink active:scale-90 disabled:cursor-default disabled:bg-transparent disabled:text-muted disabled:opacity-30 disabled:shadow-none`}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "up" ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} />
      </svg>
    </button>
  );
}

export function RankDemo() {
  const [tournament, setTournament] = useState<Tournament>("Wimbledon");
  // Ratings and the fan's own order live in the shared log
  const { entries, order, update, swap, spotlight, goTo } = useLog();

  // Until the visitor touches a control, the first row's controls glow
  const [touched, setTouched] = useState(false);
  // The row that just moved flashes so you can see where it landed
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The match you last changed, so the next step can show where it landed
  const [editedId, setEditedId] = useState<string | null>(null);

  // Arriving from the log: open that match's tournament
  const [seenSpot, setSeenSpot] = useState(0);
  if (spotlight?.target === "rank" && spotlight.n !== seenSpot) {
    setSeenSpot(spotlight.n);
    setTournament(tournamentOf(matchById[spotlight.id]));
  }
  const spot = spotlight?.target === "rank" ? spotlight : null;
  // What the next step should show: what you changed here, or the match you arrived with
  const nextId = editedId ?? spot?.id ?? null;

  // ...then bring that row into view
  const olRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (spotlight?.target !== "rank") return;
    const row = olRef.current?.querySelector(`[data-row="${spotlight.id}"]`);
    glideToRow(row ?? null, olRef.current);
  }, [spotlight]);

  const rows = order.map((id) => matchById[id]).filter((m) => tournamentOf(m) === tournament);
  const isSlam = tournament !== "Other events";

  const rate = (m: Match, rating: number) => {
    setTouched(true);
    setEditedId(m.id);
    update(m.id, { rating });
  };
  const move = (id: string, dir: -1 | 1) => {
    const visible = rows.map((m) => m.id);
    const neighbour = visible[visible.indexOf(id) + dir];
    if (!neighbour) return;
    setTouched(true);
    setEditedId(id);
    setFlash(id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 700);
    swap(id, neighbour);
  };

  // Summary of this tournament, counted from the ratings
  const ratings = rows.map((m) => entries[m.id].rating);
  const average = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((balls) => ({ balls, count: ratings.filter((r) => r === balls).length }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  const nextMatch = matchById[nextId ?? rows[0].id];
  const nextRivalry = rivalryOf(nextMatch);

  return (
    <div style={themeVars(tournament)} className="t-theme t-panel scroll-mt-6 overflow-hidden rounded-3xl border-2 border-court/40 shadow-xl shadow-court/10">
      {/* Each tournament's two colours, as a band along the top */}
      <div aria-hidden className="flex h-2">
        <span className="flex-1 bg-[var(--t-accent)]" />
        <span className="flex-1 bg-[var(--t-second)]" />
      </div>
      {/* Pick a tournament: one big tile each, in its own colours */}
      <div role="tablist" aria-label="Tournaments" className="grid grid-cols-2 gap-3 border-b border-line p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-5">
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
              className={`t-theme flex cursor-pointer flex-col ${t === "Other events" ? "max-sm:col-span-2" : ""} items-center gap-2 rounded-2xl border-2 px-3 py-4 font-semibold transition duration-200 ${
                on
                  ? "-translate-y-1 border-court bg-court text-court-ink shadow-lg"
                  : "border-line bg-surface text-foreground hover:-translate-y-1 hover:border-court hover:shadow-md"
              }`}
            >
              {t === "Other events" ? (
                <span aria-hidden className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/10">
                  <Image src={mastersLogo} alt="" className="h-full w-full object-contain" sizes="112px" />
                </span>
              ) : (
                <SlamLogo event={t} size="h-14 w-14 rounded-xl p-1" />
              )}
              <span className="text-center leading-tight">{t}</span>
              <span className={`text-sm font-medium ${on ? "text-court-ink/85" : "text-muted"}`}>
                {matches.filter((m) => tournamentOf(m) === t).length} matches
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
        {/* The ranking */}
        <div className="min-w-0">
          <h3 className="px-2 font-display text-xl font-bold text-court">
            {isSlam ? `Your ${tournament} favourites` : "Your favourites everywhere else"}
          </h3>
          <ol ref={olRef} className="relative mt-2 max-h-[40rem] space-y-2 overflow-y-auto p-2">
            {rows.map((m, i) => (
              <li
                key={spot?.id === m.id ? `${m.id}-${spot.n}` : m.id}
                data-row={m.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-3 transition-colors duration-500 sm:flex-nowrap sm:px-4 ${
                  flash === m.id ? "bg-ball/30 ring-2 ring-ball" : "bg-background"
                } ${spot?.id === m.id ? "spot-flash" : ""}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${
                    medals[i] ?? "border-2 border-line text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {isSlam ? (
                    <p className="font-semibold">
                      <span className="font-display text-lg">{m.date.slice(0, 4)}</span>
                      <span className="text-muted"> · {m.round}</span>
                    </p>
                  ) : (
                    <TournamentLabel event={eventLabel(m)} className="max-w-full" />
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                    <span className="flex -space-x-2">
                      <Avatar name={m.winner} size="h-7 w-7 text-xs ring-2 ring-background" />
                      <Avatar name={m.loser} size="h-7 w-7 text-xs ring-2 ring-background" />
                    </span>
                    <span className="font-semibold">{m.winner}</span>
                    <span className="text-muted">beat {m.loser}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 max-sm:w-full">
                  <BallRating value={entries[m.id].rating} onChange={(r) => rate(m, r)} size="sm" nudge={!touched && i === 0} />
                  <div className="flex shrink-0 gap-1 max-sm:ml-auto sm:flex-col">
                    <MoveButton dir="up" label={`Move ${eventLabel(m)} up`} disabled={i === 0} onClick={() => move(m.id, -1)} />
                    <MoveButton
                      dir="down"
                      label={`Move ${eventLabel(m)} down`}
                      disabled={i === rows.length - 1}
                      onClick={() => move(m.id, 1)}
                      nudge={!touched && i === 0}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Summary of the tournament */}
        <aside className="rounded-2xl bg-background p-5 lg:self-start">
          <p className="text-sm text-muted">
            {rows.length} {rows.length === 1 ? "match" : "matches"} logged · your average
          </p>
          <p className="font-display text-4xl font-bold">{average.toFixed(1)}</p>
          <BallScore value={Math.round(average)} size="sm" />
          <ul className="mt-5 space-y-2">
            {distribution.map(({ balls, count }) => (
              <li key={balls} className="flex items-center gap-2 text-sm">
                <span className="flex w-8 shrink-0 items-center gap-0.5 font-semibold tabular-nums">
                  {balls}
                  <TennisBall filled className="h-3.5 w-3.5" />
                </span>
                <span className="h-4 flex-1 overflow-hidden rounded-full bg-line/60">
                  <span
                    className="block h-full rounded-full bg-ball transition-all duration-500"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </span>
                <span className="w-5 shrink-0 text-right font-semibold tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <NextStep
        active={nextId !== null}
        onClick={() => goTo("story", nextMatch.id)}
        idle={
          <>
            Next: <span className="text-foreground">3 · Your Saga</span>
          </>
        }
        done={
          <>
            {editedId ? "✓ Ranking updated. " : "Next: "}
            <span className="underline decoration-ball decoration-2 underline-offset-4">
              {nextRivalry
                ? `Find it in your ${nextRivalry.players.join(" & ")} book`
                : "Find it in your Saga"}
            </span>
          </>
        }
      />
    </div>
  );
}
