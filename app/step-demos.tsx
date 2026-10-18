"use client";

import { useState, type ReactNode } from "react";
import { CallMark, EyeIcon, HeadToHead, Stars, TournamentLabel } from "./match-ui";

function DemoFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 text-sm shadow-sm md:h-[21rem]">
      {children}
    </div>
  );
}

function Chip({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2 py-0.5 font-medium ${
        active ? "border-court bg-court text-court-ink" : "border-line text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wide text-muted">{children}</p>;
}

/* Step 1: logging a match */

const logs: {
  event: string;
  players: [string, string];
  watched: "Live" | "TV" | "Stream";
  sets: number;
  setsSeen: number[];
  rating: number;
  cheered: string;
  predicted: string;
  predictionCorrect: boolean;
  tags: Record<string, boolean>;
  note: string;
}[] = [
  {
    event: "Wimbledon 2025 · Final",
    players: ["Sinner", "Alcaraz"],
    watched: "TV",
    sets: 4,
    setsSeen: [2, 3, 4],
    rating: 4,
    cheered: "Sinner",
    predicted: "Sinner in 4",
    predictionCorrect: true,
    tags: { Comeback: true, Classic: false },
    note: "Hooked once he lost the first set",
  },
  {
    event: "US Open 2026 · Women's final",
    players: ["Rybakina", "Sabalenka"],
    watched: "Stream",
    sets: 3,
    setsSeen: [1, 2, 3],
    rating: 5,
    cheered: "Rybakina",
    predicted: "Rybakina in 3",
    predictionCorrect: true,
    tags: { Comeback: false, Classic: true },
    note: "Nervy after she dropped the second",
  },
];

export function LogDemo() {
  const [index, setIndex] = useState(0);
  const log = logs[index];
  const step = (d: number) => setIndex((index + d + logs.length) % logs.length);
  const navButton =
    "h-7 w-7 cursor-pointer rounded-full border border-line transition hover:border-court hover:text-court";

  return (
    <DemoFrame>
      <div className="flex items-center justify-between gap-2">
        <TournamentLabel event={log.event} />
        <div className="flex shrink-0 items-center gap-1 text-muted">
          <button type="button" onClick={() => step(-1)} aria-label="Previous example" className={navButton}>
            ‹
          </button>
          <span className="sr-only">
            Example {index + 1} of {logs.length}
          </span>
          <button type="button" onClick={() => step(1)} aria-label="Next example" className={navButton}>
            ›
          </button>
        </div>
      </div>

      {/* Who you cheered */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {log.players.map((p) => {
          const cheered = p === log.cheered;
          return (
            <div
              key={p}
              className={`rounded-xl border px-3 py-1.5 ${
                cheered ? "border-court bg-court/10" : "border-line"
              }`}
            >
              <p className={`text-xs font-medium ${cheered ? "text-court" : "text-muted"}`}>
                {cheered ? "Cheering" : "Opponent"}
              </p>
              <p className={`font-display text-base font-bold ${cheered ? "" : "text-muted"}`}>{p}</p>
            </div>
          );
        })}
      </div>

      {/* What you saw, and how */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <Label>Sets seen</Label>
          <p className="mt-1 flex gap-1">
            {Array.from({ length: log.sets }, (_, i) => i + 1).map((n) => {
              const seen = log.setsSeen.includes(n);
              return (
                <span
                  key={n}
                  className={`flex h-8 w-9 flex-col items-center justify-center rounded-lg font-mono text-xs font-semibold ${
                    seen ? "bg-court/10 text-court" : "bg-background text-muted"
                  }`}
                >
                  {seen ? <EyeIcon className="h-3.5 w-3.5" /> : <span className="h-3.5" />}
                  S{n}
                  <span className="sr-only">{seen ? " seen" : " missed"}</span>
                </span>
              );
            })}
          </p>
        </div>
        <div className="text-right">
          <Label>Watched on</Label>
          <p className="mt-1 inline-flex h-8 items-center rounded-lg bg-background px-2.5 font-semibold">
            {log.watched}
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2">
        <span className="text-xl leading-none">
          <Stars rating={log.rating} />
        </span>
        <span className="flex items-center gap-1.5 font-semibold">
          <CallMark correct={log.predictionCorrect} size="h-5 w-5 text-[11px]" />
          {log.predicted}
          <span className="sr-only">{log.predictionCorrect ? ", called correctly" : ", missed"}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {Object.entries(log.tags).map(([tag, on]) => (
          <Chip key={tag} active={on}>
            {tag}
          </Chip>
        ))}
      </div>
      <p className="mt-2 border-l-2 border-court pl-2.5 italic">&ldquo;{log.note}&rdquo;</p>
    </DemoFrame>
  );
}

/* Step 2: rating and ranking */

type RankTab = {
  tab: string;
  heading: string;
  meta?: string;
  rivalry?: [{ name: string; wins: number }, { name: string; wins: number }];
  matches: { match: string; result: string; rating: number; classic?: boolean }[];
};

const rankTabs: RankTab[] = [
  {
    tab: "Rivalries",
    heading: "Alcaraz vs Djokovic",
    rivalry: [
      { name: "Alcaraz", wins: 5 },
      { name: "Djokovic", wins: 5 },
    ],
    matches: [
      { match: "Wimbledon 2023 · Final", result: "Alcaraz in 5", rating: 5, classic: true },
      { match: "Australian Open 2026 · Final", result: "Alcaraz in 4", rating: 4 },
      { match: "Olympics 2024 · Final", result: "Djokovic in 2", rating: 4 },
    ],
  },
  {
    tab: "Tournaments",
    heading: "Your best of Wimbledon",
    meta: "12 logged",
    matches: [
      { match: "Wimbledon 2008 · Final", result: "Nadal in 5", rating: 5, classic: true },
      { match: "Wimbledon 2023 · Final", result: "Alcaraz in 5", rating: 5, classic: true },
      { match: "Wimbledon 2025 · Final", result: "Sinner in 4", rating: 4 },
    ],
  },
  {
    tab: "Classics",
    heading: "Your all-time classics",
    meta: "7 flagged",
    matches: [
      { match: "Australian Open 2012 · Final", result: "Djokovic in 5", rating: 5 },
      { match: "Australian Open 2009 · Final", result: "Nadal in 5", rating: 5 },
      { match: "Wimbledon 2019 · Final", result: "Djokovic in 5", rating: 5 },
    ],
  },
];

export function RankDemo() {
  const [active, setActive] = useState(0);
  const current = rankTabs[active];

  return (
    <DemoFrame>
      <div role="tablist" aria-label="Rankings" className="grid grid-cols-3 gap-1 rounded-full bg-background p-1">
        {rankTabs.map((t, i) => (
          <button
            key={t.tab}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`cursor-pointer rounded-full py-1 font-medium transition ${
              i === active ? "bg-surface text-court shadow-sm" : "text-muted hover:text-court"
            }`}
          >
            {t.tab}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <p className="font-semibold">{current.heading}</p>
          {current.meta && <p className="shrink-0 text-muted">{current.meta}</p>}
        </div>
        {current.rivalry && (
          <div className="mt-1">
            <HeadToHead left={current.rivalry[0]} right={current.rivalry[1]} size="sm" />
          </div>
        )}
        <ol className="mt-2.5 space-y-1">
          {current.matches.map((r, i) => (
            <li key={r.match} className="flex items-center gap-3 rounded-xl bg-background px-3 py-1">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display font-bold ${
                  i === 0 ? "bg-court text-court-ink" : "border border-line text-court"
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <TournamentLabel event={r.match} className="max-w-full font-medium" />
                <span className="flex items-center gap-2 whitespace-nowrap text-muted">
                  {r.result}
                  <span className="text-xs">
                    <Stars rating={r.rating} />
                  </span>
                  {r.classic && (
                    <span className="rounded-full bg-ball px-1.5 text-[11px] font-semibold text-black">
                      Classic
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </DemoFrame>
  );
}

/* Step 3: the story in the data. Every meeting in order, nothing written for you. */

const meetings = [
  { event: "Madrid 2022", round: "Semifinal", winner: "Alcaraz", watched: false },
  { event: "Roland Garros 2023", round: "Semifinal", winner: "Djokovic", watched: true },
  { event: "Wimbledon 2023", round: "Final", winner: "Alcaraz", watched: true },
  { event: "Cincinnati 2023", round: "Final", winner: "Djokovic", watched: true },
  { event: "ATP Finals 2023", round: "Semifinal", winner: "Djokovic", watched: false },
  { event: "Olympics 2024", round: "Final", winner: "Djokovic", watched: true },
  { event: "Wimbledon 2024", round: "Final", winner: "Alcaraz", watched: true },
  { event: "Australian Open 2025", round: "Quarterfinal", winner: "Djokovic", watched: false },
  { event: "US Open 2025", round: "Semifinal", winner: "Alcaraz", watched: true },
  { event: "Australian Open 2026", round: "Final", winner: "Alcaraz", watched: true },
];

const meetingYears = [...new Set(meetings.map((m) => m.event.slice(-4)))];

// Running record after each meeting
const running = meetings.reduce<{ alc: number; djo: number }[]>((acc, m) => {
  const prev = acc[acc.length - 1] ?? { alc: 0, djo: 0 };
  acc.push(m.winner === "Alcaraz" ? { alc: prev.alc + 1, djo: prev.djo } : { alc: prev.alc, djo: prev.djo + 1 });
  return acc;
}, []);

function recordText({ alc, djo }: { alc: number; djo: number }) {
  if (alc === djo) return `Level at ${alc}–${djo}`;
  return alc > djo ? `Alcaraz leads ${alc}–${djo}` : `Djokovic leads ${djo}–${alc}`;
}

export function StoryDemo() {
  const [active, setActive] = useState(meetings.length - 1);
  const m = meetings[active];
  const total = running[running.length - 1];
  const watchedCount = meetings.filter((x) => x.watched).length;

  return (
    <DemoFrame>
      <p className="mb-2 font-semibold">Alcaraz vs Djokovic</p>
      <HeadToHead
        left={{ name: "Alcaraz", wins: total.alc }}
        right={{ name: "Djokovic", wins: total.djo }}
        size="sm"
      />

      {/* Every meeting, oldest first, grouped by year */}
      <div className="mt-4 flex gap-2" role="group" aria-label="Every meeting, oldest first">
        {meetingYears.map((year) => (
          <div key={year} className="min-w-0 flex-1" style={{ flexGrow: meetings.filter((x) => x.event.endsWith(year)).length }}>
            <div className="flex gap-0.5">
              {meetings.map((mt, i) => {
                if (!mt.event.endsWith(year)) return null;
                const alc = mt.winner === "Alcaraz";
                const isActive = i === active;
                return (
                  <button
                    key={mt.event}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`${mt.event}, ${mt.round}: ${mt.winner} won. ${mt.watched ? "You watched it." : "Not watched."}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className={`flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-md text-[11px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                      alc ? "bg-court text-court-ink" : "bg-muted text-background"
                    } ${mt.watched ? "" : "opacity-35"} ${isActive ? "ring-2 ring-foreground ring-offset-2 ring-offset-surface" : ""}`}
                  >
                    {alc ? "A" : "D"}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-center text-[11px] text-muted">{year}</p>
          </div>
        ))}
      </div>

      <div aria-live="polite" className="mt-3 rounded-xl bg-background px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <TournamentLabel event={m.event} />
          <span className="shrink-0 text-muted">{m.round}</span>
        </div>
        <p className="mt-0.5 flex items-center justify-between gap-2">
          <span className="font-semibold">{m.winner} won</span>
          <span className="text-muted">{m.watched ? "You watched" : "Not watched"}</span>
        </p>
        <p className="text-muted">
          After this: <span className="font-semibold text-foreground">{recordText(running[active])}</span>
        </p>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted">
        <p className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-court" />
            Alcaraz won
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-muted" />
            Djokovic won
          </span>
        </p>
        <p>
          Faded: not watched ·{" "}
          <span className="font-semibold text-foreground">
            {watchedCount} of {meetings.length}
          </span>{" "}
          seen
        </p>
      </div>
    </DemoFrame>
  );
}
