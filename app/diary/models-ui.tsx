"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import upsetsPhoto from "@/public/photos/rybakina-uso-2026.jpg";
import ratingsPhoto from "@/public/photos/nadal-federer-ao-2009-final.jpg";
import servePhoto from "@/public/photos/sinner-wimbledon-2025.jpg";
import drawsPhoto from "@/public/photos/djokovic-wimbledon-centre-court.jpg";
import agesPhoto from "@/public/photos/federer-roland-garros.jpg";
import lengthPhoto from "@/public/photos/nadal-ao-2022-final.jpg";
import { Avatar, chartStyles } from "./fun";
import {
  ageEras,
  bandLabels,
  bandOf,
  BANDS,
  bestOfFive,
  blend,
  cellIndex,
  championOf,
  courtMatches,
  courtRating,
  drawOdds,
  eloChance,
  lengthPrediction,
  realWins,
  S,
  serveChance,
  serveRange,
  serveStats,
  upsetModelChance,
  type AgeEra,
  type Bracket,
  type Calibration,
  type CourtOrAll,
  type DrawBook,
  type DrawEvent,
  type InteractBooks,
  type SeasonRow,
  type ServeStat,
} from "./models";

/* Interact on screen: pick a model, move its numbers, and read the answer beside what it was built from.
   The models themselves come from models.ts; everything here runs in the browser, so every change shows
   at once. */

const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const exploreHref = (id: string) => `/explore?m=${encodeURIComponent(id)}`;
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : x < 1 && x > 0.995 ? ">99%" : `${Math.round(x * 100)}%`);
const pct1 = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString("en-GB")}%`;
const num = (n: number) => n.toLocaleString("en-GB");
/** A small chance as odds: "1 in 2,500" */
const odds = (x: number) => {
  if (x >= 0.01) return pct(x);
  const n = 1 / x;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1); // two significant figures
  return `1 in ${num(Math.round(n / step) * step)}`;
};
const hm = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${monthNames[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const courtWords: Record<CourtOrAll, string> = { all: "Any surface", hard: "Hard", clay: "Clay", grass: "Grass" };
const onCourt = (c: CourtOrAll) => (c === "all" ? "" : ` on ${c}`);

/* ---------- The panels, and which is open ---------- */

type PanelId = "upsets" | "ratings" | "serve" | "draws" | "ages" | "length";
const panels: { id: PanelId; title: string; blurb: string; photo: StaticImageData; alt: string; position: string }[] = [
  { id: "upsets", title: "Upsets", blurb: "Set two rankings and a surface, and see how often the lower-ranked player wins.", photo: upsetsPhoto, alt: "Rybakina at the US Open", position: "object-[45%_25%]" },
  { id: "ratings", title: "Across eras", blurb: "Put any two players, each in any season, against each other, and see who led when.", photo: ratingsPhoto, alt: "Nadal and Federer after the 2009 Australian Open final", position: "object-[50%_30%]" },
  { id: "serve", title: "Serving", blurb: "Set a serving line, or load a player's, and see what it's worth.", photo: servePhoto, alt: "Sinner stretching for a forehand at Wimbledon", position: "object-[55%_35%]" },
  { id: "draws", title: "Draws", blurb: "Replay a Slam or a 1000 from its real draw, take players out, and see how likely the champion was.", photo: drawsPhoto, alt: "Djokovic lunging on Centre Court at Wimbledon", position: "object-center" },
  { id: "ages", title: "Ages", blurb: "When players do their best tennis, and how any player's career compares.", photo: agesPhoto, alt: "Federer raising a finger at Roland Garros", position: "object-[50%_20%]" },
  { id: "length", title: "Match length", blurb: "How long a match should take, and the ones that ran furthest past it.", photo: lengthPhoto, alt: "Nadal roaring after the 2022 Australian Open final", position: "object-[55%_30%]" },
];

const tours = [
  { tour: "atp", label: "Men", href: "/interact" },
  { tour: "wta", label: "Women", href: "/interact/women" },
] as const;

// The open panel lives in the address (#draws), as Statistics' chapters do
const hashEvent = "courtsaga-hash";
const subscribeHash = (on: () => void) => {
  window.addEventListener("hashchange", on);
  window.addEventListener(hashEvent, on);
  return () => {
    window.removeEventListener("hashchange", on);
    window.removeEventListener(hashEvent, on);
  };
};
const setHash = (hash: string) => {
  history.replaceState(history.state, "", hash);
  window.dispatchEvent(new Event(hashEvent));
};

/* ---------- Pieces every panel uses ---------- */

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-6 ${className}`}>{children}</div>;
}

const chip = (on: boolean) =>
  `cursor-pointer rounded-full border-2 px-3 py-1 text-sm font-semibold transition ${on ? "border-court bg-court text-court-ink" : "border-line bg-surface text-court hover:border-court"}`;

function Chips<T extends string | number>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.id)} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)} className={chip(o.id === value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, value, shown, min, max, step = 1, onChange, hint }: { label: string; value: number; shown: string; min: number; max: number; step?: number; onChange: (v: number) => void; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="font-display text-lg font-bold tabular-nums">{shown}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full cursor-pointer accent-court" />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

// Rankings run on a log scale, so No. 1 to No. 10 gets as much of the slider as No. 50 to No. 500
const RANK_MAX = 500;
const toRank = (t: number) => Math.max(1, Math.min(RANK_MAX, Math.round(Math.exp((t / 1000) * Math.log(RANK_MAX)))));
const fromRank = (r: number) => Math.round((Math.log(r) / Math.log(RANK_MAX)) * 1000);
function RankSlider({ label, rank, onChange }: { label: string; rank: number; onChange: (r: number) => void }) {
  return <Slider label={label} value={fromRank(rank)} shown={`No. ${rank}`} min={0} max={1000} onChange={(t) => onChange(toRank(t))} />;
}

/** The big answer: one number, what it is, and a line under it */
function Answer({ value, label, sub }: { value: string; label: string; sub?: ReactNode }) {
  return (
    <div aria-live="polite">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-5xl font-bold tracking-tight sm:text-6xl">{value}</span>
        <span className="text-lg font-semibold text-muted">{label}</span>
      </p>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

/** What a model was built from and how good it is, beside it */
function Behind({ children }: { children: ReactNode }) {
  return (
    <Card className="bg-background/60">
      <h3 className="font-display text-lg font-bold">Behind the numbers</h3>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_strong]:font-semibold [&_strong]:text-foreground">{children}</div>
    </Card>
  );
}

const Formula = ({ children }: { children: ReactNode }) => <p className="overflow-x-auto rounded-xl bg-surface px-3 py-2 font-mono text-xs text-foreground ring-1 ring-line">{children}</p>;

/** Players whose names start with what was typed, word by word */
function matching(keys: string[], full: Record<string, string>, names: Record<string, string>, query: string) {
  const words = fold(query).split(/[\s'-]+/).filter(Boolean);
  if (!words.length) return [];
  return keys.filter((k) => {
    const name = fold(`${full[k] ?? ""} ${names[k] ?? ""}`).split(/[\s'-]+/);
    return words.every((w) => name.some((n) => n.startsWith(w)));
  });
}

const searchInput =
  "w-full rounded-full border-2 border-line bg-background py-2.5 pl-11 pr-4 font-medium placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-4 focus:ring-court/15";
const SearchIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-current stroke-2 text-muted" strokeLinecap="round">
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="m13 13 4 4" />
  </svg>
);

/** Find a player among `keys`: type, then pick from what matches */
function PlayerPicker({
  label,
  keys,
  books,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  keys: string[];
  books: Pick<InteractBooks, "names" | "full">;
  value: string | null;
  onChange: (k: string | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const found = useMemo(() => matching(keys, books.full, books.names, query), [keys, books, query]);
  if (value && !query)
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-line bg-background py-1 pl-1 pr-3 font-semibold">
            <Avatar name={books.names[value]} size="h-7 w-7 text-xs" />
            <span className="truncate" title={books.full[value]}>
              {books.names[value]}
            </span>
          </span>
          <button type="button" onClick={() => onChange(null)} className="cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline">
            Change
          </button>
        </div>
      </div>
    );
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        <span className="relative mt-1.5 block font-normal normal-case tracking-normal">
          <SearchIcon />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} autoComplete="off" spellCheck={false} className={searchInput} />
        </span>
      </label>
      {query.trim() && (
        <div className="mt-2 flex flex-wrap gap-2 text-sm" aria-live="polite">
          {found.length ? (
            found.slice(0, 8).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  onChange(k);
                  setQuery("");
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 font-semibold text-court transition hover:border-court hover:bg-court/5"
              >
                <Avatar name={books.names[k]} size="h-6 w-6 text-[10px]" />
                {books.full[k]}
              </button>
            ))
          ) : (
            <span className="text-muted">No one called &ldquo;{query.trim()}&rdquo; has enough matches here.</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Charts: one frame, drawn at the size it's shown ---------- */

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type Axis = { min: number; max: number; log?: boolean; ticks: number[]; format: (v: number) => string };
type Scales = { x: (v: number) => number; y: (v: number) => number; left: number; right: number; top: number; bottom: number };
const MARGIN = { left: 44, right: 14, top: 12, bottom: 26 };

/**
 * A chart's frame: hairline grid, axis labels, and a crosshair with a tooltip that follows the pointer.
 * `tip` gets the x under the pointer and gives back where to snap and what to say.
 */
function Plot({
  x,
  y,
  height = 220,
  label,
  children,
  tip,
}: {
  x: Axis;
  y: Axis;
  height?: number;
  label: string;
  children: (s: Scales) => ReactNode;
  tip?: (at: number) => { at: number; body: ReactNode } | null;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const left = MARGIN.left;
  const right = width - MARGIN.right;
  const top = MARGIN.top;
  const bottom = height - MARGIN.bottom;
  const tx = (v: number) => (x.log ? Math.log(v) : v);
  // Rounded, so the server's maths and the browser's draw the same picture
  const px = (v: number) => Math.round(v * 10) / 10;
  const sx = (v: number) => px(left + ((tx(v) - tx(x.min)) / (tx(x.max) - tx(x.min))) * (right - left));
  const sy = (v: number) => px(bottom - ((v - y.min) / (y.max - y.min)) * (bottom - top));
  const fromPx = (px: number) => {
    const t = tx(x.min) + ((px - left) / (right - left)) * (tx(x.max) - tx(x.min));
    return x.log ? Math.exp(t) : t;
  };
  const shown = hover === null || !tip ? null : tip(hover);
  const at = shown ? sx(shown.at) : 0;
  return (
    <div ref={ref} className="relative select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        className="block touch-pan-y overflow-visible"
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const at = e.clientX - box.left;
          setHover(at < left || at > right ? null : fromPx(at));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {y.ticks.map((v) => (
          <g key={`y${v}`}>
            <line x1={left} x2={right} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={left - 6} y={sy(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
              {y.format(v)}
            </text>
          </g>
        ))}
        {x.ticks.map((v) => (
          <text key={`x${v}`} x={sx(v)} y={bottom + 17} textAnchor="middle" className="fill-muted text-[11px] tabular-nums">
            {x.format(v)}
          </text>
        ))}
        {children({ x: sx, y: sy, left, right, top, bottom })}
        {shown && <line x1={at} x2={at} y1={top} y2={bottom} stroke="var(--foreground)" strokeOpacity={0.35} strokeWidth={1} />}
      </svg>
      {shown && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max max-w-[16rem] rounded-xl bg-surface px-3 py-2 text-xs leading-snug shadow-lg ring-1 ring-line"
          style={at > width / 2 ? { right: width - at + 10 } : { left: at + 10 }}
        >
          {shown.body}
        </div>
      )}
    </div>
  );
}

/** A colour key for a chart with more than one thing on it */
function Legend({ items }: { items: { label: string; color: string; kind?: "line" | "dot" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.kind === "dot" ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} /> : <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Round ticks from 0 to just past `max`: 0, 2,000, 4,000, 6,000, 8,000 */
function niceTicks(max: number, count = 4) {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

const linePath = (points: [number, number][]) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
const BLUE = "var(--p-alcaraz)";
const ORANGE = "var(--p-sinner)";

/** How often a model's favourite won, against how sure it was: on the diagonal is honest */
function CalibrationChart({ calibration, label }: { calibration: Calibration; label: string }) {
  const bins = calibration.map((c, i) => ({ ...c, mid: 52.5 + i * 5, lo: 50 + i * 5 })).filter((b) => b.n >= 30);
  // How far, on average over every match, the model's chance runs above what happened
  const total = bins.reduce((t, b) => t + b.n, 0);
  const drift = bins.reduce((t, b) => t + (b.mid - (b.won / b.n) * 100) * b.n, 0) / (total || 1);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted">{label}</p>
      <Plot
        height={180}
        label={label}
        x={{ min: 50, max: 100, ticks: [50, 75, 100], format: (v) => `${v}%` }}
        y={{ min: 50, max: 100, ticks: [50, 75, 100], format: (v) => `${v}%` }}
        tip={(at) => {
          const b = bins.reduce((best, b) => (Math.abs(b.mid - at) < Math.abs(best.mid - at) ? b : best), bins[0]);
          return b && { at: b.mid, body: <>Model said {b.lo}–{b.lo + 5}%: the favourite won <strong>{pct1(b.won / b.n)}</strong> of {num(b.n)}</> };
        }}
      >
        {(s) => (
          <>
            <line x1={s.x(50)} y1={s.y(50)} x2={s.x(100)} y2={s.y(100)} stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1} />
            {bins.map((b) => (
              <circle key={b.mid} cx={s.x(b.mid)} cy={s.y((b.won / b.n) * 100)} r={4.5} fill={BLUE} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </>
        )}
      </Plot>
      <p className="text-xs text-muted">
        Each dot: how often the favourite really won, for matches the model gave that chance. Dots on the line mean the chances can be trusted.{" "}
        {Math.abs(drift) < 1.5 ? "These sit close to it." : drift > 0 ? `These sit a little under it: the model is overconfident by about ${Math.round(drift)} points.` : `These sit a little over it: the model is too cautious by about ${Math.round(-drift)} points.`}
      </p>
    </div>
  );
}

/* ---------- Upsets ---------- */

function UpsetsPanel({ books }: { books: InteractBooks }) {
  const m = books.upsets;
  const [fav, setFav] = useState(5);
  const [dog, setDog] = useState(60);
  const [court, setCourt] = useState<CourtOrAll>("all");
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const bo = m.bo5 ? bestOf : 3;
  const upset = 1 - upsetModelChance(m.coef, fav, dog, court, bo);
  const cell = cellIndex(court, m.bo5 ? bo : "any", bandOf(fav), bandOf(dog));
  const n = m.cells.n[cell];
  const real = m.cells.upsets[cell];
  const latest = m.cells.latest[cell];
  const sameBand = bandOf(fav) === bandOf(dog);
  const double = (extra: number) => Math.exp((m.coef.slope + extra) * Math.LN2);
  // The real record for each underdog band against this favourite's band
  const dots = BANDS.map((lo, b) => {
    const i = cellIndex(court, m.bo5 ? bo : "any", bandOf(fav), b);
    const hi = BANDS[b + 1] ? BANDS[b + 1] - 1 : RANK_MAX;
    return { b, n: m.cells.n[i], upsets: m.cells.upsets[i], x: Math.max(fav + 1, Math.sqrt(lo * hi)) };
  }).filter((d) => d.n >= 20 && d.b >= bandOf(fav));
  const curve: number[] = [];
  for (let r = fav + 1; r <= RANK_MAX; r = Math.max(r + 1, Math.round(r * 1.06))) curve.push(r);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <RankSlider label="Better-ranked player" rank={fav} onChange={(r) => (setFav(Math.min(r, RANK_MAX - 1)), r >= dog && setDog(Math.min(RANK_MAX, r + 1)))} />
          <RankSlider label="Lower-ranked player" rank={dog} onChange={(r) => (setDog(Math.max(r, 2)), r <= fav && setFav(Math.max(1, r - 1)))} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          <Chips label="Surface" options={(["all", "hard", "clay", "grass"] as CourtOrAll[]).map((c) => ({ id: c, label: courtWords[c] }))} value={court} onChange={setCourt} />
          {m.bo5 && <Chips label="Match" options={[{ id: 3, label: "Best of 3" }, { id: 5, label: "Best of 5" }]} value={bestOf} onChange={(v) => setBestOf(v as 3 | 5)} />}
        </div>
        <div className="mt-6">
          <Answer value={pct(upset)} label="chance of an upset" sub={<>No. {dog} beats No. {fav}{onCourt(court)}{m.bo5 ? `, best of ${bo}` : ""}, says the model.</>} />
          <p className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm text-muted">
            {n ? (
              <>
                <strong className="text-foreground">The real record:</strong> {num(n)} {n === 1 ? "match" : "matches"} between No. {bandLabels[bandOf(fav)]} and No. {bandLabels[bandOf(dog)]}
                {onCourt(court)}
                {m.bo5 ? `, best of ${bo}` : ""}
                {sameBand ? " (both in the same band, so the gap is small)" : ""}. The lower-ranked player won <strong className="text-foreground">{num(real)}</strong>
                {n >= 30 ? ` (${pct1(real / n)}).` : `. Too few to say much.`}{" "}
                {latest && (
                  <Link href={exploreHref(latest)} prefetch={false} className="font-semibold text-court underline-offset-4 hover:underline">
                    Open the latest one in Explore →
                  </Link>
                )}
              </>
            ) : (
              <>No real match has paired those rankings{onCourt(court)}{m.bo5 ? `, best of ${bo}` : ""}, so only the model can say.</>
            )}
          </p>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Upset chance against No. {fav}, by the lower-ranked player&apos;s ranking</p>
            <Legend items={[{ label: "Model", color: BLUE }, { label: "Real record, by ranking band", color: ORANGE, kind: "dot" }]} />
          </div>
          <Plot
            label={`Chance of an upset against No. ${fav}`}
            x={{ min: fav + 1, max: RANK_MAX, log: true, ticks: [2, 5, 10, 20, 50, 100, 200, 500].filter((t) => t > fav), format: (v) => `No. ${v}` }}
            y={{ min: 0, max: 50, ticks: [0, 10, 20, 30, 40, 50], format: (v) => `${v}%` }}
            tip={(at) => {
              const r = Math.round(at);
              const d = dots.find((d) => bandOf(r) === d.b);
              return {
                at: r,
                body: (
                  <>
                    <strong>No. {r}</strong> v No. {fav}: model {pct(1 - upsetModelChance(m.coef, fav, r, court, bo))}
                    {d && (
                      <>
                        <br />
                        No. {bandLabels[d.b]} really won {num(d.upsets)} of {num(d.n)} ({pct1(d.upsets / d.n)})
                      </>
                    )}
                  </>
                ),
              };
            }}
          >
            {(s) => (
              <>
                <path d={linePath(curve.map((r) => [s.x(r), s.y((1 - upsetModelChance(m.coef, fav, r, court, bo)) * 100)]))} fill="none" stroke={BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {dots.map((d) => (
                  <circle key={d.b} cx={s.x(d.x)} cy={s.y(Math.min(50, (d.upsets / d.n) * 100))} r={4.5} fill={ORANGE} stroke="var(--surface)" strokeWidth={2} />
                ))}
                <circle cx={s.x(dog)} cy={s.y(upset * 100)} r={6} fill={BLUE} stroke="var(--surface)" strokeWidth={2} />
              </>
            )}
          </Plot>
        </div>
      </Card>
      <Behind>
        <p>
          Built from <strong>{num(m.n)} completed matches</strong> with both players ranked, {books.from} to {books.last.slice(0, 4)}. Rankings are as they stood that week. Walkovers, retirements, the
          Laver Cup and the Next Gen Finals are left out, and carpet counts as hard.
        </p>
        <p>
          <strong>The model</strong> is a logistic regression on the gap between the two rankings. At equal rankings it&apos;s 50–50. Each time the gap doubles (No. 10 v No. 20, or No. 50 v No. 100), the
          better-ranked player&apos;s odds grow <strong>×{double(0).toFixed(2)}</strong> on hard courts, ×{double(m.coef.clay).toFixed(2)} on clay and ×{double(m.coef.grass).toFixed(2)} on grass
          {m.bo5 ? <>, and ×{double(m.coef.bo5).toFixed(2)} on hard in best of five</> : null}. &ldquo;Any surface&rdquo; uses the hard-court line.
        </p>
        <Formula>
          log-odds = ln(lower rank ÷ higher rank) × ({m.coef.slope} {m.bo5 ? `+ ${m.coef.bo5}·best-of-5 ` : ""}
          {m.coef.clay >= 0 ? "+" : "−"} {Math.abs(m.coef.clay)}·clay {m.coef.grass >= 0 ? "+" : "−"} {Math.abs(m.coef.grass)}·grass)
        </Formula>
        <p>
          <strong>The real record</strong> groups rankings into bands (1, 2–3, 4–5, 6–10, 11–20 … 251+) and counts every match between two bands. It&apos;s there to check the model against.
        </p>
        <p>
          The better-ranked player won <strong>{pct1(m.accuracy)}</strong> of these matches.
        </p>
        <CalibrationChart calibration={m.calibration} label="Is the model honest?" />
      </Behind>
    </div>
  );
}

/* ---------- Across eras: Elo ---------- */

type Choice = { key: string; season: number };

function RatingsPanel({ books }: { books: InteractBooks }) {
  const e = books.elo;
  const byPlayer = useMemo(() => {
    const map = new Map<string, SeasonRow[]>();
    for (const row of e.seasons) {
      const k = books.people[row[S.p]];
      map.set(k, [...(map.get(k) ?? []), row]);
    }
    return map;
  }, [e, books.people]);
  const keys = useMemo(() => [...byPlayer.keys()], [byPlayer]);
  const bestSeason = (k: string) => byPlayer.get(k)!.reduce((b, r) => (r[S.elo] > b[S.elo] ? r : b))[S.season];
  const defaults = useMemo(() => {
    // Two of the highest peaks, from different eras where possible
    const want = books.tour === "atp" ? ["Roger Federer", "Carlos Alcaraz"] : ["Serena Williams", "Iga Swiatek"];
    const found = want.map((n) => keys.find((k) => books.full[k] === n)).filter(Boolean) as string[];
    const peaks = Object.entries(e.peaks)
      .sort((a, b) => b[1].elo - a[1].elo)
      .map(([p]) => books.people[Number(p)])
      .filter((k) => byPlayer.has(k));
    return found.length === 2 ? found : peaks.slice(0, 2);
  }, [books, keys, e.peaks, byPlayer]);
  const [a, setA] = useState<Choice | null>(() => (defaults[0] ? { key: defaults[0], season: bestSeason(defaults[0]) } : null));
  const [b, setB] = useState<Choice | null>(() => (defaults[1] ? { key: defaults[1], season: bestSeason(defaults[1]) } : null));
  const [court, setCourt] = useState<CourtOrAll>("grass");
  const [mix, setMix] = useState(50);
  const [bestOf, setBestOf] = useState<3 | 5>(books.tour === "atp" ? 5 : 3);
  const bo5 = books.upsets.bo5;

  const rowOf = (p: Choice | null) => (p ? byPlayer.get(p.key)?.find((r) => r[S.season] === p.season) ?? null : null);
  const ratingOf = (row: SeasonRow) => (court === "all" ? row[S.elo] : blend(row[S.elo], courtRating(row, court), mix / 100));
  const ra = rowOf(a);
  const rb = rowOf(b);
  let chance = ra && rb ? eloChance(ratingOf(ra), ratingOf(rb)) : null;
  if (chance !== null && bo5 && bestOf === 5) chance = chance >= 0.5 ? bestOfFive(chance) : 1 - bestOfFive(1 - chance);
  const names = [a, b].filter(Boolean).map((p) => books.names[p!.key]);
  const styles = chartStyles(names);
  const colorOf = (k: string) => styles.get(books.names[k])?.color ?? "var(--muted)";

  // The top 10, month by month
  const [month, setMonth] = useState(e.months.length - 1);
  const [topCourt, setTopCourt] = useState<CourtOrAll>("all");
  const top = e.top[topCourt][month] ?? [];

  const seasonsShown = [...new Set(e.seasons.map((r) => r[S.season]))].sort((x, y) => x - y);
  const firstSeason = seasonsShown[0];
  const lastSeason = seasonsShown[seasonsShown.length - 1];
  const yValues = [ra, rb].flatMap((r, i) => {
    const p = i ? b : a;
    return r && p ? byPlayer.get(p.key)!.map(ratingOf) : [];
  });
  const yMin = Math.floor((Math.min(1500, ...yValues) - 20) / 100) * 100;
  const yMax = Math.ceil((Math.max(2000, ...yValues) + 20) / 100) * 100;
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += yMax - yMin > 600 ? 200 : 100) yTicks.push(v);

  const side = (p: Choice | null, set: (p: Choice | null) => void, label: string) => {
    const row = rowOf(p);
    const rows = p ? byPlayer.get(p.key) ?? [] : [];
    return (
      <div className="min-w-0 rounded-2xl border border-line p-3 sm:p-4">
        <PlayerPicker label={label} keys={keys} books={books} value={p?.key ?? null} onChange={(k) => set(k ? { key: k, season: bestSeason(k) } : null)} placeholder="Find a player" />
        {p && row && (
          <>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted">
              Season
              <select
                value={p.season}
                onChange={(ev) => set({ key: p.key, season: Number(ev.target.value) })}
                className="mt-1 block w-full cursor-pointer rounded-full border-2 border-line bg-background px-3 py-1.5 text-base font-semibold normal-case tracking-normal text-foreground focus:border-court focus:outline-none"
              >
                {rows.map((r) => (
                  <option key={r[S.season]} value={r[S.season]}>
                    {r[S.season]} · {r[S.w]}–{r[S.l]}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tabular-nums">{Math.round(ratingOf(row))}</span>
              <span className="text-sm text-muted">rating{court === "all" ? "" : ` on ${court}`}</span>
            </p>
            <p className="text-xs text-muted">
              {row[S.w]}–{row[S.l]} in {p.season}
              {court !== "all" && courtMatches(row, court) < 15 && <> · only {courtMatches(row, court)} {court} matches by then, so the {court} part is rough</>}
            </p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {side(a, setA, "First player")}
            {side(b, setB, "Second player")}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            <Chips label="Surface" options={(["hard", "clay", "grass", "all"] as CourtOrAll[]).map((c) => ({ id: c, label: c === "all" ? "Overall only" : courtWords[c] }))} value={court} onChange={setCourt} />
            {bo5 && <Chips label="Match" options={[{ id: 3, label: "Best of 3" }, { id: 5, label: "Best of 5" }]} value={bestOf} onChange={(v) => setBestOf(v as 3 | 5)} />}
          </div>
          {court !== "all" && (
            <div className="mt-4 max-w-md">
              <Slider label={`How much the ${court} rating counts`} value={mix} shown={`${mix}%`} min={0} max={100} step={5} onChange={setMix} hint={`The rest is the overall rating. 50% is the usual mix.`} />
            </div>
          )}
          {a && b && ra && rb && chance !== null && (
            <div className="mt-6" aria-live="polite">
              <p className="flex flex-wrap items-baseline justify-between gap-2 font-semibold">
                <span>
                  {books.names[a.key]} {a.season} <span className="font-display text-2xl font-bold tabular-nums">{pct(chance)}</span>
                </span>
                <span>
                  <span className="font-display text-2xl font-bold tabular-nums">{pct(1 - chance)}</span> {books.names[b.key]} {b.season}
                </span>
              </p>
              <div className="mt-2 flex h-4 gap-0.5 overflow-hidden rounded-full">
                <span className="rounded-l-full" style={{ width: `${chance * 100}%`, background: colorOf(a.key) }} />
                <span className="rounded-r-full" style={{ width: `${(1 - chance) * 100}%`, background: colorOf(b.key) }} />
              </div>
              <p className="mt-2 text-muted">
                The chance of winning one match{onCourt(court)}
                {bo5 ? `, best of ${bestOf}` : ""}, each at the end of that season.
              </p>
            </div>
          )}
          {a && b && (
            <div className="mt-6">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">Season by season{court === "all" ? "" : ` (${mix}% ${court})`}</p>
                <Legend items={[a, b].map((p) => ({ label: books.names[p.key], color: colorOf(p.key) }))} />
              </div>
              <Plot
                label="Ratings season by season"
                x={{ min: firstSeason, max: lastSeason, ticks: seasonsShown.filter((s) => s % 5 === 0), format: String }}
                y={{ min: yMin, max: yMax, ticks: yTicks, format: (v) => num(v) }}
                tip={(at) => {
                  const season = Math.round(at);
                  const lines = [a, b].map((p) => {
                    const r = byPlayer.get(p.key)!.find((x) => x[S.season] === season);
                    return r ? (
                      <span key={p.key} className="block">
                        <strong>{books.names[p.key]}</strong>: {Math.round(ratingOf(r))} ({r[S.w]}–{r[S.l]})
                      </span>
                    ) : null;
                  });
                  return { at: season, body: <>{season}{lines}</> };
                }}
              >
                {(s) =>
                  [a, b].map((p) => {
                    const rows = byPlayer.get(p.key)!;
                    const picked = rows.find((r) => r[S.season] === p.season);
                    return (
                      <g key={p.key}>
                        <path d={linePath(rows.map((r) => [s.x(r[S.season]), s.y(ratingOf(r))]))} fill="none" stroke={colorOf(p.key)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        {picked && <circle cx={s.x(p.season)} cy={s.y(ratingOf(picked))} r={5} fill={colorOf(p.key)} stroke="var(--surface)" strokeWidth={2} />}
                      </g>
                    );
                  })
                }
              </Plot>
            </div>
          )}
        </Card>
        <Behind>
          <p>
            <strong>Elo ratings</strong> from {num(e.n)} completed matches since {books.from}. Everyone starts at 1,500. A win takes points from the loser, more for beating someone rated higher. How far one result
            moves a rating: <strong>{e.K}</strong>, so a newcomer&apos;s moves fast and a veteran&apos;s settles.
          </p>
          <p>
            <strong>Each surface has its own rating</strong>, from matches on it alone (carpet counts as hard). The chance uses a mix of the two; the slider sets it.
          </p>
          <p>
            {books.from} is a warm-up, because everyone starts level however good, so seasons from <strong>{e.from}</strong> are shown. A season&apos;s rating is where it stood after the player&apos;s last match of
            it. Players need 30 matches, and a season 5.
          </p>
          {bo5 && <p>Best of five turns the best-of-three chance into a chance per set and plays to three sets won. Ratings learn from both lengths, so this is an estimate.</p>}
          <Formula>chance = 1 ÷ (1 + 10^((their rating − this rating) ÷ 400))</Formula>
          <p>
            On {num(e.calibration.reduce((t, c) => t + c.n, 0))} matches from {e.from}, the higher-rated player won <strong>{pct1(e.accuracy)}</strong>. The better-ranked player won {pct1(e.rankAccuracy)}.
          </p>
          <CalibrationChart calibration={e.calibration} label="Is the rating honest?" />
          <p>Ratings don&apos;t fade with time off, and they aren&apos;t the official rankings.</p>
        </Behind>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold tracking-tight">The top 10 at any moment</h3>
            <p className="text-sm text-muted">By rating at the end of the month, for anyone with a match in the year before and 20 matches in all (10 on the surface).</p>
          </div>
          <Chips label="Rating" options={(["all", "hard", "clay", "grass"] as CourtOrAll[]).map((c) => ({ id: c, label: c === "all" ? "Overall" : courtWords[c] }))} value={topCourt} onChange={setTopCourt} />
        </div>
        <div className="mt-4">
          <Slider label="Month" value={month} shown={monthLabel(e.months[month])} min={0} max={e.months.length - 1} onChange={setMonth} />
        </div>
        <ol className="mt-3 grid gap-x-8 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {top.map(([p, r], i) => {
            const k = books.people[p];
            return (
              <li key={k} className="flex items-center gap-3 py-2 sm:border-b sm:border-line">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display font-bold tabular-nums ${i === 0 ? "bg-ball text-[#0b0d12] ring-1 ring-black/10" : "text-muted"}`}>{i + 1}</span>
                <Avatar name={books.names[k]} size="h-8 w-8 text-xs" />
                <span className="min-w-0 flex-1 truncate font-semibold" title={books.full[k]}>
                  {books.names[k]}
                </span>
                <span className="font-display text-lg font-bold tabular-nums">{num(r)}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

/* ---------- Serving ---------- */

const serveLabels: Record<ServeStat, string> = { in1: "First serves in", won1: "Points won on first serve", won2: "Points won on second serve" };
const serveShort: Record<ServeStat, string> = { in1: "first serves in", won1: "first-serve points won", won2: "second-serve points won" };

function ServePanel({ books }: { books: InteractBooks }) {
  const m = books.serve;
  const [court, setCourt] = useState<CourtOrAll>("all");
  const [line, setLine] = useState<Record<ServeStat, number>>(() => ({ ...m.fits.all.mean }));
  const [player, setPlayer] = useState<string | null>(null);
  const fit = m.fits[court];
  const chance = serveChance(fit.coef, line);
  const keys = useMemo(() => Object.keys(m.players).map((p) => books.people[Number(p)]), [m.players, books.people]);
  const playerRow = (k: string, c: CourtOrAll) => m.players[books.people.indexOf(k)]?.[c];
  const load = (k: string | null, c: CourtOrAll) => {
    const row = k ? playerRow(k, c) ?? playerRow(k, "all") : null;
    setLine(row ? { in1: row[2], won1: row[3], won2: row[4] } : { ...m.fits[c].mean });
  };
  const levers = serveStats
    .map((s) => ({ s, gain: serveChance(fit.coef, { ...line, [s]: line[s] + 1 }) - chance }))
    .sort((x, y) => y.gain - x.gain);
  const row = player ? playerRow(player, court) : null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Chips
            label="Surface"
            options={(["all", "hard", "clay", "grass"] as CourtOrAll[]).map((c) => ({ id: c, label: courtWords[c] }))}
            value={court}
            onChange={(c) => {
              setCourt(c);
              load(player, c);
            }}
          />
        </div>
        <div className="mt-4 max-w-md">
          <PlayerPicker
            label="Load a player's serving (optional)"
            keys={keys}
            books={books}
            value={player}
            onChange={(k) => {
              setPlayer(k);
              load(k, court);
            }}
            placeholder="Find a player"
          />
        </div>
        <div className="mt-6">
          <Answer
            value={pct(chance)}
            label="chance of winning"
            sub={<>for a player who serves like this{onCourt(court)}, whatever the opponent does on serve.</>}
          />
          {player && (
            <p className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm text-muted">
              {row ? (
                <>
                  <strong className="text-foreground">{books.full[player]}</strong>, {num(row[0])} matches with serve stats{onCourt(court)}: won <strong className="text-foreground">{num(row[1])}</strong> (
                  {pct1(row[1] / row[0])}). The sliders hold those averages, which the model rates at {pct(serveChance(fit.coef, { in1: row[2], won1: row[3], won2: row[4] }))}.
                  {Math.abs(serveChance(fit.coef, { in1: row[2], won1: row[3], won2: row[4] }) - row[1] / row[0]) > 0.08 && (
                    <> The gap is the rest of the game, mostly returning, which this model can&apos;t see.</>
                  )}
                </>
              ) : (
                <>
                  {books.full[player]} has fewer than 20 matches with serve stats{onCourt(court)}, so the sliders hold every surface.
                </>
              )}
            </p>
          )}
        </div>
        <div className="mt-6 space-y-6">
          {serveStats.map((s) => (
            <ServeSlider key={s} stat={s} value={line[s]} onChange={(v) => setLine({ ...line, [s]: v })} bins={m.bins[court][s]} mean={fit.mean[s]} />
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-background px-4 py-3 text-sm">
          <p className="font-semibold">Worth most from here</p>
          <ol className="mt-1 space-y-0.5 text-muted">
            {levers.map((l) => (
              <li key={l.s}>
                {serveLabels[l.s]}, up 1 point: <strong className="text-foreground">+{(l.gain * 100).toFixed(1)}</strong> points of winning chance
              </li>
            ))}
          </ol>
        </div>
      </Card>
      <Behind>
        <p>
          Built from <strong>{num(m.fits.all.n)} serving lines</strong>, each side of every completed match with serve stats, {m.years[0]} to {m.years[1]}
          {m.years[0] > books.from ? <> (the data has no serve stats for this tour before {m.years[0]})</> : null}. Lines with fewer than 30 points served are left out.
        </p>
        <p>
          <strong>The model</strong> is a logistic regression of winning on three numbers from the player&apos;s own serve, fitted per surface ({courtWords[court].toLowerCase()}: {num(fit.n)} lines).
          Aces and double faults are already inside the points won.
        </p>
        <Formula>
          log-odds = {fit.coef.a} + {fit.coef.in1}·first in + {fit.coef.won1}·first won + {fit.coef.won2}·second won
        </Formula>
        <p>
          It sees only one side&apos;s serve: how the opponent served is in the opponent&apos;s own line. From the serve alone it picks the winner <strong>{pct1(fit.accuracy)}</strong> of the time.
        </p>
        <p>
          The columns under each slider are <strong>the real record</strong>: of players who served in that range, how many won. The darker column is where the slider sits.
        </p>
        <p>The averages{onCourt(court)}: {fit.mean.in1}% first serves in, {fit.mean.won1}% won on first serve, {fit.mean.won2}% won on second.</p>
      </Behind>
    </div>
  );
}

function ServeSlider({ stat, value, onChange, bins, mean }: { stat: ServeStat; value: number; onChange: (v: number) => void; bins: { n: number; won: number }[]; mean: number }) {
  const [lo, hi] = serveRange[stat];
  const here = Math.floor((value - lo) / 2);
  return (
    <div>
      <Slider label={serveLabels[stat]} value={value} shown={`${value.toFixed(1)}%`} min={lo} max={hi - 0.5} step={0.5} onChange={onChange} hint={`Average ${mean}%`} />
      <Plot
        height={110}
        label={`Real win rate by ${serveShort[stat]}`}
        x={{ min: lo, max: hi, ticks: Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10), format: (v) => `${v}%` }}
        y={{ min: 0, max: 100, ticks: [0, 50, 100], format: (v) => `${v}%` }}
        tip={(at) => {
          const b = Math.min(bins.length - 1, Math.max(0, Math.floor((at - lo) / 2)));
          const bin = bins[b];
          return {
            at: lo + b * 2 + 1,
            body: bin.n ? (
              <>
                {lo + b * 2}–{lo + b * 2 + 2}%: won <strong>{pct1(bin.won / bin.n)}</strong> of {num(bin.n)}
              </>
            ) : (
              <>No matches</>
            ),
          };
        }}
      >
        {(s) =>
          bins.map((bin, b) => {
            if (bin.n < 30) return null;
            const x0 = s.x(lo + b * 2) + 1;
            const x1 = s.x(lo + b * 2 + 2) - 1;
            const w = Math.min(24, x1 - x0);
            const y = s.y((bin.won / bin.n) * 100);
            return <rect key={b} x={(x0 + x1 - w) / 2} y={y} width={w} height={Math.max(0, s.bottom - y)} rx={Math.min(3, w / 2)} fill={BLUE} fillOpacity={b === here ? 1 : 0.35} />;
          })
        }
      </Plot>
    </div>
  );
}

/* ---------- Draws ---------- */

const drawCache = new Map<string, Promise<DrawBook>>();
const loadDraws = (tour: string) => {
  if (!drawCache.has(tour))
    drawCache.set(
      tour,
      fetch(`/api/draws/${tour}`).then((r) => {
        if (!r.ok) throw new Error("No draws");
        return r.json() as Promise<DrawBook>;
      }),
    );
  return drawCache.get(tour)!;
};

/** What a round is called, by how many matches from the final it is (0 is the final) */
const roundFromEnd = (k: number) => (k === 0 ? "Final" : k === 1 ? "Semifinal" : k === 2 ? "Quarterfinal" : `Round of ${2 ** (k + 1)}`);

function DrawsPanel({ books }: { books: InteractBooks }) {
  const [book, setBook] = useState<DrawBook | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadDraws(books.tour)
      .then((b) => live && setBook(b))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [books.tour]);
  if (failed) return <p className="rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">The draws aren&apos;t available right now. Try again in a little while.</p>;
  if (!book) return <p className="py-10 text-center font-medium text-muted" role="status">Loading the draws…</p>;
  return <DrawsLoaded book={book} books={books} />;
}

const chanceFor = (ev: DrawEvent) => (a: number, b: number) => {
  const p = eloChance(ev.ratings[a], ev.ratings[b]);
  return ev.bestOf === 5 ? (p >= 0.5 ? bestOfFive(p) : 1 - bestOfFive(1 - p)) : p;
};

function playOnce(bracket: Bracket, chance: (a: number, b: number) => number, out: Set<number>): { champion: number | null; finalist: number | null } {
  const walk = (node: Bracket): number | null => {
    if (typeof node === "number") return out.has(node) ? null : node;
    const x = walk(node[0]);
    const y = walk(node[1]);
    if (x === null || y === null) return x ?? y;
    return Math.random() < chance(x, y) ? x : y;
  };
  if (typeof bracket === "number") return { champion: walk(bracket), finalist: null };
  const x = walk(bracket[0]);
  const y = walk(bracket[1]);
  if (x === null || y === null) return { champion: x ?? y, finalist: null };
  return Math.random() < chance(x, y) ? { champion: x, finalist: y } : { champion: y, finalist: x };
}

function DrawsLoaded({ book, books }: { book: DrawBook; books: InteractBooks }) {
  const slams = book.events.filter((e) => e.tier === "slam");
  const [eventId, setEventId] = useState(slams[0]?.id ?? book.events[0]?.id);
  const [query, setQuery] = useState("");
  const [out, setOut] = useState<Set<number>>(new Set());
  const [find, setFind] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [tally, setTally] = useState<Map<number, number>>(new Map());
  const [lastPlay, setLastPlay] = useState<{ champion: number | null; finalist: number | null } | null>(null);
  const ev = book.events.find((e) => e.id === eventId) ?? book.events[0];
  const nameOf = (i: number) => book.names[book.people[ev.entrants[i]]] ?? "?";
  const fullOf = (i: number) => books.full[book.people[ev.entrants[i]]] ?? nameOf(i);

  const pick = (id: string) => {
    setEventId(id);
    setOut(new Set());
    setTally(new Map());
    setLastPlay(null);
    setFind("");
    setShowAll(false);
    setQuery("");
  };

  const chances = useMemo(() => drawOdds(ev.bracket, chanceFor(ev), out), [ev, out]);
  const real = useMemo(() => realWins(ev.bracket), [ev]);
  const champ = championOf(ev.bracket);
  const fresh = useMemo(() => drawOdds(ev.bracket, chanceFor(ev)), [ev]);
  const title = (r: number[] | undefined) => r?.at(-1) ?? 0;
  const rows = [...chances]
    .map(([i, r]) => ({ i, title: title(r), final: r.length >= 2 ? r.at(-2)! : title(r), path: r.length, won: real.get(i) ?? 0 }))
    .sort((x, y) => y.title - x.title || ev.ratings[y.i] - ev.ratings[x.i]);
  const favourite = [...fresh].reduce((best, [i, r]) => (title(r) > title(fresh.get(best)) ? i : best), champ);

  // Across every draw: how likely each champion was, and how often the favourite won
  const surprises = useMemo(() => {
    let favWon = 0;
    const list = book.events.map((e) => {
      const o = drawOdds(e.bracket, chanceFor(e));
      const c = championOf(e.bracket);
      const fav = [...o].reduce((best, [i, r]) => ((r.at(-1) ?? 0) > (o.get(best)?.at(-1) ?? 0) ? i : best), c);
      if (fav === c) favWon++;
      return { e, champion: c, chance: o.get(c)?.at(-1) ?? 0 };
    });
    return { favWon, list: list.sort((x, y) => x.chance - y.chance).slice(0, 5) };
  }, [book]);

  const found = query.trim() ? book.events.filter((e) => fold(`${e.event} ${e.season}`).includes(fold(query.trim()))).slice(0, 10) : [];
  const typed = fold(find.trim());
  const listed = typed ? rows.filter((r) => fold(fullOf(r.i)).includes(typed) || fold(nameOf(r.i)).includes(typed)) : showAll ? rows : rows.slice(0, 16);
  const resultOf = (r: (typeof rows)[number]) => (r.i === champ ? "Champion" : roundFromEnd(r.path - r.won - 1));
  const replays = [...tally.values()].reduce((t, v) => t + v, 0);

  const play = (times: number) => {
    const chance = chanceFor(ev);
    const next = new Map(tally);
    let last = null;
    for (let t = 0; t < times; t++) {
      last = playOnce(ev.bracket, chance, out);
      if (last.champion !== null) next.set(last.champion, (next.get(last.champion) ?? 0) + 1);
    }
    setTally(next);
    setLastPlay(last);
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <label className="block">
          <span className="font-display text-lg font-bold">Pick a draw</span>
          <span className="relative mt-2 block">
            <SearchIcon />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Try "Wimbledon 2008" or "Madrid"`} autoComplete="off" spellCheck={false} className={searchInput} />
          </span>
        </label>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {(query.trim() ? found : slams.slice(0, 4)).map((e) => (
            <button key={e.id} type="button" onClick={() => pick(e.id)} className={chip(e.id === ev.id)}>
              {e.event} {e.season}
            </button>
          ))}
          {query.trim() && !found.length && <span className="text-muted">No Slam or 1000 called &ldquo;{query.trim()}&rdquo;.</span>}
        </div>

        <div className="mt-6" aria-live="polite">
          <h3 className="font-display text-2xl font-bold tracking-tight">
            {ev.event} {ev.season}
          </h3>
          <p className="text-sm text-muted">
            {ev.entrants.length} players · {courtWords[ev.surface].toLowerCase()} · best of {ev.bestOf}
            {ev.final && (
              <>
                {" · "}
                <Link href={exploreHref(ev.final)} prefetch={false} className="font-semibold text-court underline-offset-4 hover:underline">
                  Open the final in Explore →
                </Link>
              </>
            )}
          </p>
          <div className="mt-4">
            <Answer
              value={odds(title(fresh.get(champ)))}
              label={`${fullOf(champ)}'s chance of the title`}
              sub={
                favourite === champ ? (
                  <>The favourite won it.</>
                ) : (
                  <>
                    as the draw began. The favourite was {fullOf(favourite)} at {pct(title(fresh.get(favourite)))}.
                  </>
                )
              }
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => play(1)} className="cursor-pointer rounded-full bg-court px-4 py-2 font-semibold text-court-ink shadow-sm transition hover:opacity-90">
            Replay it once
          </button>
          <button type="button" onClick={() => play(100)} className="cursor-pointer rounded-full border-2 border-court px-4 py-1.5 font-semibold text-court transition hover:bg-court/5">
            Replay it 100 times
          </button>
          {(replays > 0 || out.size > 0) && (
            <button
              type="button"
              onClick={() => {
                setTally(new Map());
                setLastPlay(null);
                setOut(new Set());
              }}
              className="cursor-pointer px-2 text-sm font-semibold text-court underline-offset-4 hover:underline"
            >
              Start again
            </button>
          )}
        </div>
        {lastPlay && (
          <div className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm text-muted" aria-live="polite">
            {lastPlay.champion !== null && (
              <p>
                Replay {num(replays)}: <strong className="text-foreground">{fullOf(lastPlay.champion)}</strong> won
                {lastPlay.finalist !== null && <>, beating {fullOf(lastPlay.finalist)} in the final</>}.
              </p>
            )}
            <p className="mt-1">
              Titles in {num(replays)} {replays === 1 ? "replay" : "replays"}:{" "}
              {[...tally]
                .sort((x, y) => y[1] - x[1])
                .slice(0, 6)
                .map(([i, n]) => `${nameOf(i)} ${n}`)
                .join(", ")}
            </p>
          </div>
        )}

        <div className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Every player&apos;s chances as the draw began</p>
            <p className="text-xs text-muted">Take a player out and the rest of the draw adjusts.</p>
          </div>
          <div className="relative mt-2 max-w-sm">
            <SearchIcon />
            <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a player in this draw" autoComplete="off" spellCheck={false} className={searchInput} aria-label="Find a player in this draw" />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-2 font-semibold">Player</th>
                  <th className="px-2 text-right font-semibold">Rating</th>
                  <th className="px-2 text-right font-semibold">Final</th>
                  <th className="px-2 text-right font-semibold">Title</th>
                  <th className="px-2 font-semibold">Really</th>
                  <th className="pl-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {listed.map((r) => {
                  const isOut = out.has(r.i);
                  return (
                    <tr key={r.i} className={isOut ? "opacity-45" : ""}>
                      <td className="py-1.5 pr-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar name={nameOf(r.i)} size="h-7 w-7 text-[10px]" />
                          <span className="truncate font-semibold" title={fullOf(r.i)}>
                            {nameOf(r.i)}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 text-right tabular-nums text-muted">{num(ev.ratings[r.i])}</td>
                      <td className="px-2 text-right tabular-nums">{isOut ? "–" : pct(r.final)}</td>
                      <td className="px-2 text-right font-display text-base font-bold tabular-nums">{isOut ? "–" : pct(r.title)}</td>
                      <td className={`px-2 ${r.i === champ ? "font-semibold" : "text-muted"}`}>{resultOf(r)}</td>
                      <td className="pl-2 text-right">
                        <button
                          type="button"
                          aria-pressed={isOut}
                          onClick={() => {
                            const next = new Set(out);
                            if (isOut) next.delete(r.i);
                            else next.add(r.i);
                            setOut(next);
                            setTally(new Map());
                            setLastPlay(null);
                          }}
                          className="cursor-pointer whitespace-nowrap text-xs font-semibold text-court underline-offset-4 hover:underline"
                        >
                          {isOut ? "Put back" : "Take out"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!typed && rows.length > 16 && (
            <button type="button" onClick={() => setShowAll(!showAll)} className="mt-2 cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline">
              {showAll ? "Show the top 16" : `Show all ${rows.length}`}
            </button>
          )}
          {typed && !listed.length && <p className="mt-2 text-sm text-muted">No one called &ldquo;{find.trim()}&rdquo; in this draw.</p>}
        </div>

        <div className="mt-6 rounded-2xl bg-background px-4 py-3 text-sm">
          <p className="font-semibold">The unlikeliest champions</p>
          <ol className="mt-1 space-y-1">
            {surprises.list.map((s) => (
              <li key={s.e.id}>
                <button type="button" onClick={() => pick(s.e.id)} className="cursor-pointer text-left text-muted transition hover:text-court">
                  <strong className="text-foreground">{book.names[book.people[s.e.entrants[s.champion]]]}</strong>, {s.e.event} {s.e.season}: {odds(s.chance)}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </Card>
      <Behind>
        <p>
          <strong>{num(book.events.length)} Slam and 1000 draws</strong>, {book.events[book.events.length - 1]?.season} to {book.events[0]?.season}, rebuilt from their matches: the final, the two
          matches its players came from, and so on down. Walkovers count as matches here, because they move players through a draw.
          {book.skipped ? <> {book.skipped} draws whose matches don&apos;t join up are left out.</> : null}
        </p>
        <p>
          <strong>Each player&apos;s rating</strong> is where it stood as the event began: half overall, half surface, from Across eras. Each match&apos;s chance comes from the same formula
          {books.tour === "atp" ? ", turned into best of five at the Slams" : ""}.
        </p>
        <p>
          <strong>The chances are exact</strong>: every way the draw could go is added up, not simulated. &ldquo;Replay it&rdquo; rolls the dice with those chances, for fun.
        </p>
        <p>Taking a player out gives each would-be opponent a walkover. Qualifiers come in with their ratings; qualifying itself isn&apos;t included.</p>
        <p>
          The pre-draw favourite won <strong>{surprises.favWon}</strong> of {num(book.events.length)} ({pct1(surprises.favWon / book.events.length)}). A rating can&apos;t see injuries, form inside a week or
          how a draw opens up.
        </p>
      </Behind>
    </div>
  );
}

/* ---------- Ages ---------- */

function AgesPanel({ books }: { books: InteractBooks }) {
  const m = books.ages;
  const [era, setEra] = useState<AgeEra>("all");
  const keys = useMemo(() => Object.keys(m.players).map((p) => books.people[Number(p)]), [m.players, books.people]);
  const [picked, setPicked] = useState<string[]>(() => {
    const want = books.tour === "atp" ? ["Roger Federer", "Carlos Alcaraz"] : ["Serena Williams", "Coco Gauff"];
    return want.map((n) => keys.find((k) => books.full[k] === n)).filter(Boolean) as string[];
  });
  const typical = m.eras[era];
  const styles = chartStyles(picked.map((k) => books.names[k]));
  const colorOf = (k: string) => styles.get(books.names[k])?.color ?? "var(--muted)";
  const careers = picked.map((k) => {
    const list = m.players[books.people.indexOf(k)] ?? [];
    const w = list.reduce((t, x) => t + x[1], 0);
    const l = list.reduce((t, x) => t + x[2], 0);
    const career = w / (w + l);
    const ages = list.filter((x) => x[1] + x[2] >= 10).map(([age, aw, al]) => ({ age, w: aw, l: al, diff: (aw / (aw + al) - career) * 100 }));
    const best = ages.reduce<(typeof ages)[number] | null>((b, x) => (!b || x.diff > b.diff ? x : b), null);
    return { k, career, ages, best, w, l };
  });
  const allDiffs = [...typical.ages.map((a) => a.diff), ...careers.flatMap((c) => c.ages.map((a) => a.diff))];
  const yMin = Math.max(-40, Math.floor(Math.min(-10, ...allDiffs) / 10) * 10);
  const yMax = Math.min(40, Math.ceil(Math.max(10, ...allDiffs) / 10) * 10);
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += 10) yTicks.push(v);
  const ageMin = 16;
  const ageMax = 40;
  const fitAt = (age: number) => typical.fit[0] + typical.fit[1] * age + typical.fit[2] * age * age;
  const fitAges = typical.ages.length ? [typical.ages[0].age, typical.ages[typical.ages.length - 1].age] : [ageMin, ageMax];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Chips label="Seasons" options={ageEras.map((x) => ({ id: x.id, label: x.label }))} value={era} onChange={setEra} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <PlayerPicker
              key={`${slot}-${picked[slot] ?? ""}`}
              label={slot === 0 ? "Compare a player" : "And another"}
              keys={keys}
              books={books}
              value={picked[slot] ?? null}
              onChange={(k) => {
                const next = picked.filter((_, i) => i !== slot);
                if (k && !next.includes(k)) next.splice(Math.min(slot, next.length), 0, k);
                setPicked(next);
              }}
              placeholder="Find a player"
            />
          ))}
        </div>
        <div className="mt-6">
          <Answer value={Number.isFinite(typical.peak) ? `${typical.peak}` : "–"} label="years old: the typical peak" sub={<>where the smooth curve tops out, from {num(typical.players)} players.</>} />
          {careers.some((c) => c.best) && (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {careers.map(
                (c) =>
                  c.best && (
                    <li key={c.k} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(c.k) }} />
                      <span>
                        <strong className="text-foreground">{books.full[c.k]}</strong>: best at {c.best.age} ({c.best.w}–{c.best.l}, {pct(c.best.w / (c.best.w + c.best.l))}), against{" "}
                        {pct(c.career)} over a whole career
                      </span>
                    </li>
                  ),
              )}
            </ul>
          )}
        </div>
        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold">Win rate at each age, against the player&apos;s own career win rate</p>
            <Legend items={[{ label: "Typical player", color: "var(--foreground)" }, { label: "Smooth curve", color: "var(--muted)" }, ...picked.map((k) => ({ label: books.names[k], color: colorOf(k) }))]} />
          </div>
          <Plot
            height={260}
            label="Win rate by age against career average"
            x={{ min: ageMin, max: ageMax, ticks: [16, 20, 24, 28, 32, 36, 40], format: String }}
            y={{ min: yMin, max: yMax, ticks: yTicks, format: (v) => (v > 0 ? `+${v}` : `${v}`) }}
            tip={(at) => {
              const age = Math.round(at);
              const t = typical.ages.find((a) => a.age === age);
              return {
                at: age,
                body: (
                  <>
                    <strong>Age {age}</strong>
                    {t && (
                      <span className="block">
                        Typical: {t.diff > 0 ? "+" : ""}
                        {t.diff} points ({num(t.players)} players)
                      </span>
                    )}
                    {careers.map((c) => {
                      const a = c.ages.find((x) => x.age === age);
                      return a ? (
                        <span key={c.k} className="block">
                          {books.names[c.k]}: {a.w}–{a.l} ({pct(a.w / (a.w + a.l))}), {a.diff > 0 ? "+" : ""}
                          {a.diff.toFixed(0)}
                        </span>
                      ) : null;
                    })}
                  </>
                ),
              };
            }}
          >
            {(s) => (
              <>
                <line x1={s.left} x2={s.right} y1={s.y(0)} y2={s.y(0)} stroke="var(--muted)" strokeOpacity={0.6} strokeWidth={1} />
                {typical.fit[2] < 0 && (
                  <path
                    d={linePath(Array.from({ length: 41 }, (_, i) => fitAges[0] + ((fitAges[1] - fitAges[0]) * i) / 40).map((age) => [s.x(age), s.y(Math.max(yMin, Math.min(yMax, fitAt(age))))]))}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                  />
                )}
                <path d={linePath(typical.ages.map((a) => [s.x(a.age), s.y(Math.max(yMin, a.diff))]))} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {careers.map((c) => (
                  <g key={c.k}>
                    <path d={linePath(c.ages.map((a) => [s.x(a.age), s.y(Math.max(yMin, Math.min(yMax, a.diff)))]))} fill="none" stroke={colorOf(c.k)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    {c.ages.map((a) => (
                      <circle key={a.age} cx={s.x(a.age)} cy={s.y(Math.max(yMin, Math.min(yMax, a.diff)))} r={4} fill={colorOf(c.k)} stroke="var(--surface)" strokeWidth={2} />
                    ))}
                  </g>
                ))}
              </>
            )}
          </Plot>
          <p className="mt-1 text-xs text-muted">Above the line: winning more than usual for that player. A player&apos;s ages with fewer than 10 matches are left off.</p>
        </div>
      </Card>
      <Behind>
        <p>
          Built from <strong>{num(typical.players)} players with {m.minMatches}+ completed matches</strong> in those seasons. Age is at the time of each match, in whole years. The data starts in{" "}
          {books.from}, so a career that began earlier counts from then.
        </p>
        <p>
          <strong>Each player is compared with themselves</strong>: their win rate at each age, minus their win rate over all those seasons, averaged across players and weighted by matches. Comparing raw win
          rates would flatter old age, because only the best are still playing at 35.
        </p>
        <p>
          An age is shown once 10 players reach it. <strong>The smooth curve</strong> is a quadratic fitted through them, weighted by matches; its top is the typical peak.
        </p>
        <Formula>
          points = {typical.fit[0]} {typical.fit[1] >= 0 ? "+" : "−"} {Math.abs(typical.fit[1])}·age {typical.fit[2] >= 0 ? "+" : "−"} {Math.abs(typical.fit[2])}·age²
        </Formula>
        <p>Players who fade early leave the tour, so the late thirties are the strongest players&apos; late thirties even after the comparison. The teenage years are the few who made the tour that young.</p>
      </Behind>
    </div>
  );
}

/* ---------- Match length ---------- */

const minutesWord = (m: number) => (Math.round(m) === 0 ? "makes no difference" : m > 0 ? `adds ${Math.round(m)} minutes` : `takes ${Math.round(-m)} minutes off`);

function LengthPanel({ books }: { books: InteractBooks }) {
  const fits = books.length;
  const options = ([3, 5] as const).filter((b) => fits[b]);
  const [bo, setBo] = useState<3 | 5>(options[0] ?? 3);
  const fit = fits[bo]!;
  const [sets, setSets] = useState<number | null>(null);
  const [court, setCourt] = useState<CourtOrAll>("all");
  const [season, setSeason] = useState(fit.years[1]);
  const minutes = lengthPrediction(fit, court, 1, 1, season, sets);
  const hist = fit.hist[court][sets === null ? 0 : fit.sets.indexOf(sets) + 1] ?? [];
  const total = hist.reduce((t, v) => t + v, 0);
  // Before a match, the range is the real spread; with the sets known, the model's own
  const quantileOf = (q: number) => {
    let seen = 0;
    for (let i = 0; i < hist.length; i++) {
      seen += hist[i];
      if (seen >= q * total) return i * 10 + 5;
    }
    return hist.length * 10;
  };
  const [lo, hi] = sets === null ? [quantileOf(0.1), quantileOf(0.9)] : [minutes + fit.spread[0], minutes + fit.spread[1]];
  const binTicks = niceTicks(Math.max(1, ...hist));
  const xMax = Math.max(180, Math.ceil((hist.length * 10) / 60) * 60);
  const share = fit.share[court];
  const shareTotal = share.reduce((t, v) => t + v, 0) || 1;
  const decade = fit.coef.year * 10;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {options.length > 1 && (
            <Chips
              label="Match"
              options={options.map((b) => ({ id: b, label: `Best of ${b}` }))}
              value={bo}
              onChange={(b) => {
                setBo(b as 3 | 5);
                setSets(null);
              }}
            />
          )}
          <Chips label="Sets played" options={[{ id: 0, label: "Not known yet" }, ...fit.sets.map((n) => ({ id: n, label: `${n} sets` }))]} value={sets ?? 0} onChange={(n) => setSets(n || null)} />
          <Chips label="Surface" options={(["all", "hard", "clay", "grass"] as CourtOrAll[]).map((c) => ({ id: c, label: courtWords[c] }))} value={court} onChange={setCourt} />
        </div>
        <div className="mt-4 max-w-md">
          <Slider label="Season" value={season} shown={String(season)} min={fit.years[0]} max={fit.years[1]} onChange={setSeason} />
        </div>
        <div className="mt-6">
          <Answer
            value={hm(minutes)}
            label="expected"
            sub={
              <>
                Most such matches take {hm(Math.max(0, lo))} to {hm(hi)}.
                {sets === null && (
                  <>
                    {" "}
                    Best of {bo}
                    {onCourt(court)}, matches went{" "}
                    {fit.sets.map((n, i) => `${n} sets ${pct(share[i] / shareTotal)}`).join(", ")} of the time.
                  </>
                )}
              </>
            }
          />
        </div>
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold">
            Real lengths: best of {bo}
            {sets === null ? "" : `, ${sets} sets`}
            {onCourt(court)} ({num(total)} matches), with the model&apos;s answer
          </p>
          <Plot
            height={200}
            label="Real match lengths"
            x={{ min: 0, max: xMax, ticks: Array.from({ length: xMax / 60 + 1 }, (_, i) => i * 60), format: (v) => (v ? `${v / 60} h` : "0") }}
            y={{ min: 0, max: binTicks[binTicks.length - 1], ticks: binTicks, format: (v) => num(v) }}
            tip={(at) => {
              const b = Math.max(0, Math.min(hist.length - 1, Math.floor(at / 10)));
              return { at: b * 10 + 5, body: <>{hm(b * 10)}–{hm(b * 10 + 10)}: <strong>{num(hist[b] ?? 0)}</strong> matches</> };
            }}
          >
            {(s) => (
              <>
                {hist.map((v, b) => {
                  if (!v) return null;
                  const x0 = s.x(b * 10) + 1;
                  const x1 = s.x(b * 10 + 10) - 1;
                  const y = s.y(v);
                  return <rect key={b} x={x0} y={y} width={Math.max(1, x1 - x0)} height={s.bottom - y} rx={Math.min(3, (x1 - x0) / 2)} fill={BLUE} fillOpacity={0.45} />;
                })}
                <line x1={s.x(minutes)} x2={s.x(minutes)} y1={s.top} y2={s.bottom} stroke={ORANGE} strokeWidth={2} />
              </>
            )}
          </Plot>
          <Legend items={[{ label: "Real matches, per 10 minutes", color: BLUE, kind: "dot" }, { label: "The model's answer", color: ORANGE }]} />
        </div>
        <div className="mt-6 rounded-2xl bg-background px-4 py-3 text-sm">
          <p className="font-semibold">Furthest past the model, best of {bo}</p>
          <ol className="mt-1 space-y-1">
            {fit.longest.slice(0, 5).map((l) => (
              <li key={l.id}>
                <Link href={exploreHref(l.id)} prefetch={false} className="group text-muted transition hover:text-court">
                  <strong className="text-foreground">
                    {books.names[books.people[l.w]]} beat {books.names[books.people[l.l]]}
                  </strong>
                  , {l.at}: {hm(l.minutes)}, model {hm(l.predicted)} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </Card>
      <Behind>
        <p>
          Built from <strong>{num(fit.n)} completed best-of-{bo} matches</strong> with a time and both players ranked, {fit.years[0]} to {fit.years[1]}
          {fit.years[0] > books.from ? <> (the data has few match times for this tour before {fit.years[0]})</> : null}. Times under two or over eight minutes a game are left out as typos.
        </p>
        <p>
          <strong>The model</strong> is a linear regression on minutes. Each set past {fit.sets[0]} adds about <strong>{Math.round(fit.coef.perSet[1])} minutes</strong>. Against hard courts, clay{" "}
          {minutesWord(fit.coef.clay)} and grass {minutesWord(fit.coef.grass)}. Matches have grown {Math.abs(decade).toFixed(0)} minutes {decade >= 0 ? "longer" : "shorter"} a decade. The ranking gap
          hardly matters (doubling it changes a match by {Math.abs(fit.coef.gap * Math.LN2).toFixed(1)} minutes), so the answer is for two players ranked alike.
        </p>
        <Formula>
          minutes = {fit.coef.a} {fit.coef.clay >= 0 ? "+" : "−"} {Math.abs(fit.coef.clay)}·clay {fit.coef.grass >= 0 ? "+" : "−"} {Math.abs(fit.coef.grass)}·grass {fit.coef.gap >= 0 ? "+" : "−"}{" "}
          {Math.abs(fit.coef.gap)}·gap + {fit.coef.year}·(season − 2015){fit.coef.perSet.slice(1).map((v, i) => ` + ${v}·${fit.sets[i + 1]} sets`).join("")}
        </Formula>
        <p>
          <strong>How good it is:</strong> before a ball is struck, these facts explain only <strong>{pct(fit.r2Before)}</strong> of why one match is longer than another. Once the sets are known, they explain{" "}
          {pct(fit.r2)}. Not known yet averages over how often matches go each number of sets.
        </p>
        <p>The range is where 8 in 10 real matches land: around the model&apos;s answer once the sets are known, and from the real lengths before.</p>
      </Behind>
    </div>
  );
}

/* ---------- The page ---------- */

export function InteractView({ books }: { books: InteractBooks }) {
  const hash = useSyncExternalStore(subscribeHash, () => location.hash, () => "");
  const panel = panels.find((p) => `#${p.id}` === hash)?.id ?? "upsets";
  const current = panels.find((p) => p.id === panel)!;
  const here = tours.find((t) => t.tour === books.tour)!;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-line bg-surface p-4 shadow-xl shadow-court/5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-bold">
            Pick a model <span className="font-sans text-sm font-normal text-muted">· six ways to play with the numbers</span>
          </p>
          <div className="flex rounded-full bg-background p-1 ring-1 ring-line" role="group" aria-label="Tour">
            {tours.map((t) => (
              <Link
                key={t.tour}
                href={`${t.href}#${panel}`}
                aria-current={t.tour === books.tour ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${t.tour === books.tour ? "bg-court text-court-ink shadow-sm" : "text-court hover:bg-court/10"}`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {panels.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={panel === p.id}
              onClick={() => setHash(`#${p.id}`)}
              style={{ animationDelay: `${i * 50}ms` }}
              className={`rise-in group relative flex aspect-[4/3] cursor-pointer flex-col justify-end overflow-hidden rounded-2xl text-left text-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${
                panel === p.id ? "-translate-y-1 shadow-md ring-4 ring-ball" : "ring-1 ring-black/10"
              }`}
            >
              <Image src={p.photo} alt={p.alt} fill placeholder="blur" sizes="(min-width: 640px) 12rem, 33vw" className={`object-cover transition-transform duration-500 group-hover:scale-105 ${p.position}`} />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <span className="relative px-2.5 pb-2 font-display text-sm font-bold leading-tight sm:px-3 sm:pb-2.5 sm:text-base">{p.title}</span>
            </button>
          ))}
        </div>
      </div>

      <section aria-labelledby="panel-title" key={`${books.tour}-${panel}`} className="fade-in">
        <h2 id="panel-title" className="font-display text-2xl font-bold tracking-tight">
          {current.title}
        </h2>
        <p className="mb-4 text-muted">{current.blurb}</p>
        {panel === "upsets" && <UpsetsPanel books={books} />}
        {panel === "ratings" && <RatingsPanel books={books} />}
        {panel === "serve" && <ServePanel books={books} />}
        {panel === "draws" && <DrawsPanel books={books} />}
        {panel === "ages" && <AgesPanel books={books} />}
        {panel === "length" && <LengthPanel books={books} />}
      </section>

      <p className="text-sm text-muted">
        Every model is fitted to {here.label.toLowerCase()}&apos;s tour-level singles from {books.from} to{" "}
        {new Date(`${books.last}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}, team cups and the Olympics included, and rebuilt as new matches come in. Models describe the
        past; none of this is a betting tip.
      </p>
    </div>
  );
}
