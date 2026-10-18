"use client";

import { useState, type ReactNode } from "react";

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
        active ? "border-clay bg-clay text-clay-ink" : "border-line text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-clay">
      {"★".repeat(rating)}
      <span className="text-line">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/* Step 1: logging a match */

function LogRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.75rem_1fr] items-center">
      <span className="text-muted">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

const logs = [
  {
    event: "Wimbledon 2025 · Final",
    players: ["Sinner", "Alcaraz"],
    watched: "TV",
    sets: 4,
    setsSeen: [2, 3, 4],
    rating: 4,
    cheered: "Sinner",
    predicted: "Sinner in 4",
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
    tags: { Comeback: false, Classic: true },
    note: "Nervy after she dropped the second",
  },
];

export function LogDemo() {
  const [index, setIndex] = useState(0);
  const log = logs[index];
  const step = (d: number) => setIndex((index + d + logs.length) % logs.length);

  return (
    <DemoFrame>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{log.event}</p>
          <p className="text-muted">{log.players.join(" vs ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-muted">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous example"
            className="h-7 w-7 cursor-pointer rounded-full border border-line transition hover:border-clay hover:text-clay"
          >
            ‹
          </button>
          <span className="w-8 text-center tabular-nums">
            {index + 1}/{logs.length}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next example"
            className="h-7 w-7 cursor-pointer rounded-full border border-line transition hover:border-clay hover:text-clay"
          >
            ›
          </button>
        </div>
      </div>
      <div className="mt-3 space-y-2.5">
        <LogRow label="Watched">
          {["Live", "TV", "Stream"].map((w) => (
            <Chip key={w} active={w === log.watched}>
              {w}
            </Chip>
          ))}
        </LogRow>
        <LogRow label="Sets seen">
          {Array.from({ length: log.sets }, (_, i) => i + 1).map((n) => (
            <Chip key={n} active={log.setsSeen.includes(n)}>
              {n}
            </Chip>
          ))}
        </LogRow>
        <LogRow label="Rating">
          <span className="text-lg leading-none">
            <Stars rating={log.rating} />
          </span>
        </LogRow>
        <LogRow label="Cheered">
          {log.players.map((p) => (
            <Chip key={p} active={p === log.cheered}>
              {p}
            </Chip>
          ))}
        </LogRow>
        <LogRow label="Predicted">
          <span className="font-medium">{log.predicted}</span>
        </LogRow>
        <LogRow label="Tags">
          {Object.entries(log.tags).map(([tag, on]) => (
            <Chip key={tag} active={on}>
              {tag}
            </Chip>
          ))}
        </LogRow>
      </div>
      <p className="mt-3 rounded-lg bg-background px-3 py-2 italic">
        &ldquo;{log.note}&rdquo;
      </p>
    </DemoFrame>
  );
}

/* Step 2: rating and ranking */

const rankTabs = [
  {
    tab: "Rivalries",
    heading: "Djokovic vs Alcaraz",
    meta: "10 matches · 5–5",
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
      <div role="tablist" aria-label="Rankings" className="flex gap-1">
        {rankTabs.map((t, i) => (
          <button
            key={t.tab}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`cursor-pointer whitespace-nowrap rounded-full border px-2 py-0.5 font-medium transition ${
              i === active
                ? "border-clay bg-clay text-clay-ink"
                : "border-line text-muted hover:border-clay hover:text-clay"
            }`}
          >
            {t.tab}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <p className="font-semibold">{current.heading}</p>
          <p className="shrink-0 text-muted">{current.meta}</p>
        </div>
        <ol className="mt-2.5 space-y-2">
          {current.matches.map((r, i) => (
            <li
              key={r.match}
              className="flex items-center gap-3 rounded-xl border border-line bg-background px-3 py-2"
            >
              <span className="font-display text-lg font-bold text-clay">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.match}</span>
                <span className="flex items-center gap-2 whitespace-nowrap text-muted">
                  {r.result}
                  <Stars rating={r.rating} />
                  {"classic" in r && r.classic && (
                    <span className="rounded-full bg-ball px-1.5 text-[13px] font-semibold text-black">
                      Classic
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-2.5 text-muted">Tap a tab to switch</p>
    </DemoFrame>
  );
}

/* Step 3: the saga, newest first */

const sagaEntries = [
  {
    match: "US Open 2026 · Women's final",
    outcome: "Rybakina d. Sabalenka",
    stat: "Rybakina's second Slam of the year",
    change: "Rybakina becomes your player of the year",
  },
  {
    match: "Australian Open 2026 · Final",
    outcome: "Alcaraz d. Djokovic",
    stat: "Alcaraz completes the career Slam",
    change: "Djokovic vs Alcaraz becomes your rivalry",
  },
  {
    match: "US Open 2025 · Final",
    outcome: "Alcaraz d. Sinner",
    stat: "Alcaraz back to world No. 1",
    change: "You start following Sinner vs Alcaraz",
  },
  {
    match: "Wimbledon 2025 · Final",
    outcome: "Sinner d. Alcaraz",
    stat: "Sinner's first Wimbledon title",
    change: "Your first correct final prediction",
  },
];

export function StoryDemo() {
  const [atEnd, setAtEnd] = useState(false);

  return (
    <DemoFrame>
      <div className="flex h-full flex-col">
        <p className="font-semibold">Your saga</p>
        <div
          tabIndex={0}
          aria-label="Your saga entries, scrollable"
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
          }}
          className="-mr-2 mt-3 min-h-0 flex-1 overflow-y-auto pl-1.5 pr-2 max-md:max-h-72"
        >
          <ol className="space-y-4 border-l-2 border-line pb-6 pl-4">
            {sagaEntries.map((e, i) => (
              <li key={e.match} className="relative">
                <span
                  className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ${
                    i === 0 ? "bg-clay" : "bg-line"
                  }`}
                />
                <p className="font-semibold">{e.match}</p>
                <p className="text-muted">{e.outcome}</p>
                <p className="mt-1 inline-block rounded-md bg-ball/40 px-1.5 font-medium">{e.stat}</p>
                <p className="mt-1 font-medium text-grass">→ {e.change}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-gradient-to-t from-surface to-transparent pb-2 transition-opacity ${
          atEnd ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-muted">
          Scroll ↓
        </span>
      </div>
    </DemoFrame>
  );
}
