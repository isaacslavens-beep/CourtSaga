"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import upsetsPhoto from "@/public/photos/rybakina-uso-2026.jpg";
import ratingsPhoto from "@/public/photos/nadal-federer-ao-2009-final.jpg";
import servePhoto from "@/public/photos/sinner-wimbledon-2025.jpg";
import pressurePhoto from "@/public/photos/djokovic-wimbledon-centre-court.jpg";
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
  courtMatches,
  courtRating,
  eloChance,
  lengthPrediction,
  P,
  pressureMeasures,
  S,
  serveChance,
  serveRange,
  serveStats,
  upsetModelChance,
  type AgeEra,
  type Calibration,
  type CourtOrAll,
  type InteractBooks,
  type PressureMeasure,
  type SeasonRow,
  type ServeStat,
} from "./models";

/* Interact on screen: pick a model, move its numbers, and read the answer beside what it was built from.
   The models themselves come from models.ts; everything here runs in the browser, so every change shows
   at once. Every chart is drawn with one kit (Plot, Figure, Callout), so they read as one set of figures. */

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const exploreHref = (id: string) => `/explore?m=${encodeURIComponent(id)}`;
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : x < 1 && x > 0.995 ? ">99%" : `${Math.round(x * 100)}%`);
const pct1 = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString("en-GB")}%`;
const num = (n: number) => n.toLocaleString("en-GB");
/** A signed number with a true minus sign: +45, −12, ±0 */
const signed = (n: number, digits = 0) => {
  const s = Math.abs(n).toFixed(digits);
  return Number(s) === 0 ? `±${s}` : `${n > 0 ? "+" : "−"}${s}`;
};
/** A fixed-point number with a true minus sign */
const fixed = (n: number, digits: number) => n.toFixed(digits).replace("-", "−");
const hm = (min: number) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}`;
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${monthNames[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const courtWords: Record<CourtOrAll, string> = { all: "Any surface", hard: "Hard", clay: "Clay", grass: "Grass" };
const onCourt = (c: CourtOrAll) => (c === "all" ? "" : ` on ${c}`);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The 95% Wilson interval for `won` out of `n`: honest even near 0% and 100% */
function wilson(won: number, n: number, z = 1.96): [number, number] {
  if (!n) return [0, 1];
  const p = won / n;
  const centre = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  const scale = 1 + (z * z) / n;
  return [(centre - half) / scale, (centre + half) / scale];
}

/* ---------- The panels, and which is open ---------- */

type PanelId = "upsets" | "ratings" | "serve" | "pressure" | "ages" | "length";
const panels: { id: PanelId; title: string; blurb: string; photo: StaticImageData; alt: string; position: string }[] = [
  { id: "upsets", title: "Upsets", blurb: "Set two rankings and a surface, and see how often the lower-ranked player wins.", photo: upsetsPhoto, alt: "Rybakina at the US Open", position: "object-[45%_25%]" },
  { id: "ratings", title: "Across eras", blurb: "Put any two players, each in any season, against each other, and see who led when.", photo: ratingsPhoto, alt: "Nadal and Federer after the 2009 Australian Open final", position: "object-[50%_30%]" },
  { id: "serve", title: "Serving", blurb: "Set a serving line, or load a player's, and see what it's worth.", photo: servePhoto, alt: "Sinner stretching for a forehand at Wimbledon", position: "object-[55%_35%]" },
  { id: "pressure", title: "Under pressure", blurb: "Break points, tiebreaks and deciding sets: who wins more of the big points than the rest of their play says they should, and whether that lasts.", photo: pressurePhoto, alt: "Djokovic lunging on Centre Court at Wimbledon", position: "object-center" },
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
        <span className="font-mono text-base font-semibold tabular-nums">{shown}</span>
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
        <span className="font-display text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">{value}</span>
        <span className="text-lg font-semibold text-muted">{label}</span>
      </p>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

/** A chance as a measured bar from 0 to 100%, with quarter marks, so the number has a length */
function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-3 max-w-xl" role="img" aria-label={`${label}: ${pct1(value)}`}>
      <div className="relative h-3 overflow-hidden rounded-full bg-line/60">
        <div className="absolute inset-y-0 left-0 rounded-r-full transition-[width] duration-300" style={{ width: `${value * 100}%`, background: BLUE }} />
        {[25, 75].map((t) => (
          <span key={t} className="absolute inset-y-0 w-0.5 bg-surface" style={{ left: `${t}%` }} />
        ))}
        <span className="absolute inset-y-0 left-1/2 w-0.5 bg-foreground/50" />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10.5px] text-muted">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/** What a model was built from and how good it is, beside it */
function Behind({ children }: { children: ReactNode }) {
  return (
    <Card className="bg-background/60">
      <h3 className="font-display text-lg font-bold">Behind the numbers</h3>
      <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted [&_strong]:font-semibold [&_strong]:text-foreground">{children}</div>
    </Card>
  );
}

/** A model's key figures, set like a table's summary line; hover one for what it means */
function Stats({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line">
      {items.map((i) => (
        <div key={i.label} className={`bg-surface px-3 py-2.5 ${i.hint ? "cursor-help" : ""}`} title={i.hint}>
          <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-muted">{i.label}</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Formulas, set as mathematics ---------- */

const V = ({ children }: { children: ReactNode }) => <i className="px-[0.04em]">{children}</i>;
const Sub = ({ children }: { children: ReactNode }) => <sub className="text-[0.68em] not-italic">{children}</sub>;
const Sup = ({ children }: { children: ReactNode }) => <sup className="text-[0.68em]">{children}</sup>;
const Op = ({ children }: { children: ReactNode }) => <span className="px-[0.26em]">{children}</span>;
const Sigma = () => <span className="text-[1.3em] leading-none">Σ</span>;
function Frac({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span className="mx-[0.15em] inline-flex flex-col items-center align-middle text-[0.88em] leading-tight">
      <span className="px-[0.2em]">{n}</span>
      <span className="w-full border-t border-current px-[0.2em] text-center">{d}</span>
    </span>
  );
}
/** One equation, or one piece of a long one: it never breaks inside */
const Eq = ({ children }: { children: ReactNode }) => <span className="whitespace-nowrap">{children}</span>;
/** Formulas set as mathematics, each Eq on a line of its own when they don't fit side by side, with what each symbol means under them */
function Formula({ children, where }: { children: ReactNode; where?: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-3 ring-1 ring-line">
      <p className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 overflow-x-auto py-1 text-[16px] text-foreground" style={{ fontFamily: "var(--font-math), 'Cambria Math', 'Times New Roman', serif" }}>
        {children}
      </p>
      {where && <p className="mt-2 border-t border-line pt-2 text-xs leading-relaxed text-muted">{where}</p>}
    </div>
  );
}

/* ---------- Player search ---------- */

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
  color,
}: {
  label: string;
  keys: string[];
  books: Pick<InteractBooks, "names" | "full">;
  value: string | null;
  onChange: (k: string | null) => void;
  placeholder: string;
  color?: string; // the player's line in the charts below
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
            {color && <span aria-hidden className="h-1 w-4 shrink-0 rounded-full" style={{ background: color }} />}
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

/* ---------- The chart kit ---------- */

const BLUE = "var(--p-alcaraz)";
const ORANGE = "var(--p-sinner)";
const INK = "var(--foreground)";
// Numbers on a chart in the mono face; axis titles in small capitals
const tickText = "fill-muted font-mono text-[10.5px] tabular-nums";
const axisTitle = "fill-muted text-[10px] font-semibold uppercase tracking-[0.12em]";

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type Axis = { min: number; max: number; log?: boolean; ticks: number[]; minor?: number[]; format: (v: number) => string; title?: string };
type Scales = { x: (v: number) => number; y: (v: number) => number; left: number; right: number; top: number; bottom: number };
type Tip = { at: number; body: ReactNode; marks?: { y: number; color: string }[] };

// Rounded, so the server's maths and the browser's draw the same picture
const px = (v: number) => Math.round(v * 10) / 10;

/**
 * A chart's frame: axes with ticks, a hairline grid, a title on each axis, and a crosshair whose tooltip
 * follows the pointer. `tip` gets the x under the pointer and says where to snap and what to show;
 * `onPick` lets a press or a drag across the chart set a value.
 */
function Plot({
  x,
  y,
  height = 240,
  label,
  children,
  tip,
  onPick,
  xGrid = false,
}: {
  x: Axis;
  y: Axis;
  height?: number;
  label: string;
  children: (s: Scales) => ReactNode;
  tip?: (at: number) => Tip | null;
  onPick?: (x: number, y: number) => void;
  xGrid?: boolean;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const left = 50;
  const right = width - 14;
  const top = y.title ? 26 : 10;
  const bottom = height - (x.title ? 42 : 24);
  const tx = (v: number) => (x.log ? Math.log(v) : v);
  const ty = (v: number) => (y.log ? Math.log(v) : v);
  const sx = (v: number) => px(left + ((tx(v) - tx(x.min)) / (tx(x.max) - tx(x.min))) * (right - left));
  const sy = (v: number) => px(bottom - ((ty(v) - ty(y.min)) / (ty(y.max) - ty(y.min))) * (bottom - top));
  const fromX = (p: number) => {
    const t = tx(x.min) + ((p - left) / (right - left)) * (tx(x.max) - tx(x.min));
    return x.log ? Math.exp(t) : t;
  };
  const fromY = (p: number) => {
    const t = ty(y.min) + ((bottom - p) / (bottom - top)) * (ty(y.max) - ty(y.min));
    return y.log ? Math.exp(t) : t;
  };
  const shown = hover === null || !tip ? null : tip(hover);
  const at = shown ? sx(shown.at) : 0;
  const where = (e: ReactPointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return [e.clientX - box.left, e.clientY - box.top] as const;
  };
  return (
    <div ref={ref} className="relative select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        className={`block touch-pan-y overflow-visible ${onPick ? "cursor-crosshair" : ""}`}
        onPointerDown={(e) => {
          if (!onPick) return;
          const [cx, cy] = where(e);
          if (cx < left || cx > right) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          onPick(fromX(cx), fromY(cy));
        }}
        onPointerMove={(e) => {
          const [cx, cy] = where(e);
          const inside = cx >= left && cx <= right;
          setHover(inside ? fromX(cx) : null);
          if (onPick && inside && e.buttons & 1) onPick(fromX(cx), fromY(cy));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {y.title && (
          <text x={0} y={10} className={axisTitle}>
            ↑ {y.title}
          </text>
        )}
        {y.ticks.map((v) => (
          <g key={`y${v}`}>
            <line x1={left} x2={right} y1={sy(v)} y2={sy(v)} stroke="var(--line)" strokeWidth={1} />
            <line x1={left - 4} x2={left} y1={sy(v)} y2={sy(v)} stroke={INK} strokeOpacity={0.5} />
            <text x={left - 8} y={sy(v)} dy="0.32em" textAnchor="end" className={tickText}>
              {y.format(v)}
            </text>
          </g>
        ))}
        {(y.minor ?? []).map((v) => (
          <line key={`my${v}`} x1={left - 2.5} x2={left} y1={sy(v)} y2={sy(v)} stroke={INK} strokeOpacity={0.35} />
        ))}
        {xGrid && x.ticks.map((v) => <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={top} y2={bottom} stroke="var(--line)" strokeWidth={1} />)}
        {(x.minor ?? []).map((v) => (
          <line key={`mx${v}`} x1={sx(v)} x2={sx(v)} y1={bottom} y2={bottom + 2.5} stroke={INK} strokeOpacity={0.35} />
        ))}
        {x.ticks.map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={bottom} y2={bottom + 5} stroke={INK} strokeOpacity={0.5} />
            <text x={sx(v)} y={bottom + 17} textAnchor="middle" className={tickText}>
              {x.format(v)}
            </text>
          </g>
        ))}
        <path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={1} />
        {x.title && (
          <text x={(left + right) / 2} y={height - 4} textAnchor="middle" className={axisTitle}>
            {x.title} →
          </text>
        )}
        {children({ x: sx, y: sy, left, right, top, bottom })}
        {shown && (
          <g pointerEvents="none">
            <line x1={at} x2={at} y1={top} y2={bottom} stroke={INK} strokeOpacity={0.3} strokeWidth={1} />
            {shown.marks?.map((m, i) => (
              <circle key={i} cx={at} cy={sy(m.y)} r={4.5} fill={m.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {shown && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-[17rem] rounded-xl bg-surface px-3 py-2 text-xs leading-snug shadow-lg ring-1 ring-line [&_.n]:font-mono [&_.n]:tabular-nums"
          style={{ top, ...(at > width / 2 ? { right: width - at + 12 } : { left: at + 12 }) }}
        >
          {shown.body}
        </div>
      )}
    </div>
  );
}

/** A value pinned to a point: a small label with a leader line, kept inside the plot */
function Callout({ x, y, text, s, above = true }: { x: number; y: number; text: string; s: Scales; above?: boolean }) {
  const w = text.length * 6.7 + 14;
  const h = 20;
  const boxX = clamp(x - w / 2, s.left + 2, s.right - w - 2);
  // Above if asked and there's room, else below; and the other way round
  const up = above ? y - h - 12 >= s.top : y + h + 12 > s.bottom;
  const boxY = up ? y - h - 12 : y + 12;
  return (
    <g pointerEvents="none">
      <line x1={x} x2={x} y1={up ? y - 7 : y + 7} y2={up ? boxY + h : boxY} stroke={INK} strokeOpacity={0.45} />
      <rect x={px(boxX)} y={px(boxY)} width={px(w)} height={h} rx={6} fill="var(--surface)" stroke={INK} strokeOpacity={0.3} />
      <text x={px(boxX + w / 2)} y={px(boxY + h / 2)} dy="0.34em" textAnchor="middle" className="fill-foreground font-mono text-[11px] font-semibold tabular-nums">
        {text}
      </text>
    </g>
  );
}

/** Thin rules from a point to both axes, for reading its value off them */
const Guides = ({ x, y, s }: { x: number; y: number; s: Scales }) => (
  <path d={`M${s.left} ${y}H${x}V${s.bottom}`} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="1 3" strokeLinecap="round" pointerEvents="none" />
);

/** A colour key for a chart with more than one thing on it */
function Legend({ items }: { items: { label: string; color: string; kind?: "line" | "dash" | "dot" | "band" | "bar" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.kind === "dot" ? (
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
          ) : i.kind === "band" ? (
            <span className="h-2.5 w-4 rounded-sm opacity-25" style={{ background: i.color }} />
          ) : i.kind === "bar" ? (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          ) : i.kind === "dash" ? (
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="h-0.5 w-4 rounded-full" style={{ background: i.color }} />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** A numbered figure: what it shows, its key, the chart, and a line on how to read it */
function Figure({ n, title, sub, legend, note, children }: { n: string; title: string; sub?: ReactNode; legend?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2">
        <p className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-court">Fig. {n}</span>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
        {legend && <div className="mt-1.5">{legend}</div>}
      </figcaption>
      {children}
      {note && <p className="mt-1.5 text-[11px] leading-snug text-muted">{note}</p>}
    </figure>
  );
}

/** Round ticks from `min` to just past `max`: 0, 2,000, 4,000, 6,000, 8,000 */
function niceTicks(max: number, count = 4, min = 0) {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  return Array.from({ length: Math.ceil((max - start) / step) + 1 }, (_, i) => start + i * step);
}
/** Minor ticks for a log axis: 2 to 9 in each decade */
const logMinor = (lo: number, hi: number) => {
  const out: number[] = [];
  for (let d = 10 ** Math.floor(Math.log10(lo)); d <= hi; d *= 10) for (let m = 2; m <= 9; m++) if (m * d > lo && m * d < hi) out.push(Number((m * d).toPrecision(3)));
  return out;
};

const linePath = (points: [number, number][]) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
const areaPath = (points: [number, number][], base: number) =>
  points.length ? `${linePath(points)}L${points[points.length - 1][0].toFixed(1)} ${base}L${points[0][0].toFixed(1)} ${base}Z` : "";
/** The shape between an upper and a lower line */
const bandPath = (upper: [number, number][], lower: [number, number][]) =>
  upper.length ? `${linePath(upper)}${[...lower].reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join("")}Z` : "";

/** How often a model's favourite won, against how sure it was: on the diagonal is honest */
function CalibrationChart({ calibration, n }: { calibration: Calibration; n: string }) {
  const bins = calibration.map((c, i) => ({ ...c, mid: 52.5 + i * 5, lo: 50 + i * 5 })).filter((b) => b.n >= 30);
  // How far, on average over every match, the model's chance runs above what happened
  const total = bins.reduce((t, b) => t + b.n, 0);
  const drift = bins.reduce((t, b) => t + (b.mid - (b.won / b.n) * 100) * b.n, 0) / (total || 1);
  const biggest = Math.max(1, ...bins.map((b) => b.n));
  return (
    <Figure
      n={n}
      title="Is the model honest?"
      sub="Matches grouped by the chance the model gave the favourite"
      legend={<Legend items={[{ label: "What happened, 95% interval", color: BLUE, kind: "dot" }, { label: "Perfectly honest", color: "var(--muted)", kind: "dash" }]} />}
      note={
        <>
          Dot size: how many matches.{" "}
          {Math.abs(drift) < 1.5
            ? "The dots sit on the line: the chances can be taken at face value."
            : drift > 0
              ? `The dots sit a little under the line: the model is overconfident by about ${Math.round(drift)} points.`
              : `The dots sit a little over the line: the model is too cautious by about ${Math.round(-drift)} points.`}
        </>
      }
    >
      <Plot
        height={240}
        label="Calibration: the model's chance against how often the favourite won"
        x={{ min: 50, max: 100, ticks: [50, 60, 70, 80, 90, 100], minor: [55, 65, 75, 85, 95], format: (v) => `${v}%`, title: "Model's chance" }}
        y={{ min: 50, max: 100, ticks: [50, 60, 70, 80, 90, 100], format: (v) => `${v}%`, title: "Favourite won" }}
        tip={(at) => {
          if (!bins.length) return null;
          const b = bins.reduce((best, b) => (Math.abs(b.mid - at) < Math.abs(best.mid - at) ? b : best), bins[0]);
          const [lo, hi] = wilson(b.won, b.n);
          return {
            at: b.mid,
            marks: [{ y: clamp((b.won / b.n) * 100, 50, 100), color: BLUE }],
            body: (
              <>
                Model said <span className="n">{b.lo}–{b.lo + 5}%</span>
                <br />
                Favourite won <strong className="n">{pct1(b.won / b.n)}</strong> of <span className="n">{num(b.n)}</span>
                <br />
                <span className="text-muted">
                  95% interval <span className="n">{pct1(lo)}–{pct1(hi)}</span>
                </span>
              </>
            ),
          };
        }}
      >
        {(s) => (
          <>
            <line x1={s.x(50)} y1={s.y(50)} x2={s.x(100)} y2={s.y(100)} stroke="var(--muted)" strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="5 4" />
            {bins.map((b) => {
              const [lo, hi] = wilson(b.won, b.n);
              return (
                <g key={b.mid}>
                  <line x1={s.x(b.mid)} x2={s.x(b.mid)} y1={s.y(clamp(lo * 100, 50, 100))} y2={s.y(clamp(hi * 100, 50, 100))} stroke={BLUE} strokeWidth={1.5} />
                  <circle cx={s.x(b.mid)} cy={s.y(clamp((b.won / b.n) * 100, 50, 100))} r={px(3 + 4 * Math.sqrt(b.n / biggest))} fill={BLUE} stroke="var(--surface)" strokeWidth={2} />
                </g>
              );
            })}
          </>
        )}
      </Plot>
    </Figure>
  );
}

/**
 * A regression's coefficients with their 95% intervals (±1.96 standard errors), against a line at zero:
 * an interval clear of the line is an effect the data is sure of.
 */
function Coefficients({ n, title, rows, unit, digits = 3 }: { n: string; title: string; rows: { label: string; value: number; se: number }[]; unit: string; digits?: number }) {
  const [ref, width] = useWidth();
  const labelW = Math.min(130, Math.round(width * 0.34));
  const valueW = 96;
  const lo = Math.min(0, ...rows.map((r) => r.value - 1.96 * r.se));
  const hi = Math.max(0, ...rows.map((r) => r.value + 1.96 * r.se));
  const pad = (hi - lo) * 0.08 || 1;
  const x0 = labelW + 8;
  const x1 = width - valueW - 8;
  const sx = (v: number) => px(x0 + ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (x1 - x0));
  const rowH = 28;
  const base = rows.length * rowH;
  const ticks = niceTicks(hi + pad, 3, lo - pad).filter((t) => t >= lo - pad && t <= hi + pad);
  return (
    <Figure n={n} title={title} sub={`Each estimate with its 95% interval, ${unit}`} note="An interval clear of the zero line is an effect the data is sure of.">
      <div ref={ref}>
        <svg width={width} height={base + 22} role="img" aria-label={title} className="block overflow-visible">
          {ticks.map((t) => (
            <line key={t} x1={sx(t)} x2={sx(t)} y1={0} y2={base} stroke="var(--line)" />
          ))}
          <line x1={sx(0)} x2={sx(0)} y1={0} y2={base} stroke={INK} strokeOpacity={0.55} />
          {rows.map((r, i) => {
            const y = i * rowH + rowH / 2;
            const a = sx(r.value - 1.96 * r.se);
            const b = sx(r.value + 1.96 * r.se);
            return (
              <g key={r.label}>
                <text x={0} y={y} dy="0.34em" className="fill-foreground text-[12px] font-semibold">
                  {r.label}
                </text>
                <line x1={a} x2={b} y1={y} y2={y} stroke={BLUE} strokeWidth={2} />
                <line x1={a} x2={a} y1={y - 4} y2={y + 4} stroke={BLUE} strokeWidth={1.5} />
                <line x1={b} x2={b} y1={y - 4} y2={y + 4} stroke={BLUE} strokeWidth={1.5} />
                <rect x={sx(r.value) - 4} y={y - 4} width={8} height={8} fill={BLUE} stroke="var(--surface)" strokeWidth={1.5} transform={`rotate(45 ${sx(r.value)} ${y})`} />
                <text x={width} y={y} dy="0.34em" textAnchor="end" className="fill-foreground font-mono text-[11px] tabular-nums">
                  {fixed(r.value, digits)}
                  <tspan className="fill-muted"> ±{(1.96 * r.se).toFixed(digits)}</tspan>
                </text>
              </g>
            );
          })}
          <line x1={x0} x2={x1} y1={base} y2={base} stroke={INK} strokeOpacity={0.5} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={sx(t)} x2={sx(t)} y1={base} y2={base + 4} stroke={INK} strokeOpacity={0.5} />
              <text x={sx(t)} y={base + 16} textAnchor="middle" className={tickText}>
                {Math.abs(t) < 1e-9 ? "0" : signed(t, Math.abs(hi - lo) < 1 ? 2 : Math.abs(hi - lo) < 10 ? 1 : 0)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </Figure>
  );
}

/* ---------- Colour for amounts: one hue, light to dark ---------- */

// The site's rating ramp, from a pale tint to the darkest blue
const ramp = ["#e6eef8", "#b3d0f3", "#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];
function rampColor(t: number) {
  const x = clamp(t, 0, 1) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const rgb = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const [a, b] = [rgb(ramp[i]), rgb(ramp[i + 1])];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(" ")})`;
}

/* ---------- Upsets ---------- */

function UpsetsPanel({ books }: { books: InteractBooks }) {
  const m = books.upsets;
  const [fav, setFav] = useState(5);
  const [dog, setDog] = useState(60);
  const [court, setCourt] = useState<CourtOrAll>("all");
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const bo = m.bo5 ? bestOf : 3;
  const boKey = m.bo5 ? bo : "any";
  const upset = 1 - upsetModelChance(m.coef, fav, dog, court, bo);
  const cell = cellIndex(court, boKey, bandOf(fav), bandOf(dog));
  const n = m.cells.n[cell];
  const real = m.cells.upsets[cell];
  const latest = m.cells.latest[cell];
  const sameBand = bandOf(fav) === bandOf(dog);
  const setPair = (f: number, d: number) => {
    const a = clamp(Math.round(f), 1, RANK_MAX - 1);
    setFav(a);
    setDog(clamp(Math.round(d), a + 1, RANK_MAX));
  };
  // The real record for each underdog band against this favourite's band
  const dots = BANDS.map((lo, b) => {
    const i = cellIndex(court, boKey, bandOf(fav), b);
    const hi = BANDS[b + 1] ? BANDS[b + 1] - 1 : RANK_MAX;
    return { b, n: m.cells.n[i], upsets: m.cells.upsets[i], x: Math.max(fav + 1, Math.sqrt(lo * hi)) };
  }).filter((d) => d.n >= 20 && d.b >= bandOf(fav));
  const biggest = Math.max(1, ...dots.map((d) => d.n));
  const curve: number[] = [];
  for (let r = fav + 1; r <= RANK_MAX; r = Math.max(r + 1, Math.round(r * 1.04))) curve.push(r);
  if (curve[curve.length - 1] !== RANK_MAX) curve.push(RANK_MAX);
  const modelAt = (r: number) => 1 - upsetModelChance(m.coef, fav, r, court, bo);
  const yMax = clamp(Math.ceil((Math.max(0, ...dots.map((d) => wilson(d.upsets, d.n)[1])) * 100) / 10) * 10, 50, 100);
  const doubling = (extra: number) => Math.exp((m.coef.slope + extra) * Math.LN2);
  const [wlo, whi] = wilson(real, n);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <RankSlider label="Better-ranked player" rank={fav} onChange={(r) => setPair(r, Math.max(dog, r + 1))} />
          <RankSlider label="Lower-ranked player" rank={dog} onChange={(r) => (r <= fav ? setPair(r - 1, r) : setDog(r))} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          <Chips label="Surface" options={(["all", "hard", "clay", "grass"] as CourtOrAll[]).map((c) => ({ id: c, label: courtWords[c] }))} value={court} onChange={setCourt} />
          {m.bo5 && <Chips label="Match" options={[{ id: 3, label: "Best of 3" }, { id: 5, label: "Best of 5" }]} value={bestOf} onChange={(v) => setBestOf(v as 3 | 5)} />}
        </div>
        <div className="mt-6">
          <Answer value={pct1(upset)} label="chance of an upset" sub={<>No. {dog} beats No. {fav}{onCourt(court)}{m.bo5 ? `, best of ${bo}` : ""}, says the model.</>} />
          <Meter value={upset} label="Chance of an upset" />
          <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm text-muted">
            {n ? (
              <>
                <strong className="text-foreground">The real record:</strong> {num(n)} {n === 1 ? "match" : "matches"} between No. {bandLabels[bandOf(fav)]} and No. {bandLabels[bandOf(dog)]}
                {onCourt(court)}
                {m.bo5 ? `, best of ${bo}` : ""}
                {sameBand ? " (both in the same band, so the gap is small)" : ""}. The lower-ranked player won <strong className="text-foreground">{num(real)}</strong>
                {n >= 30 ? (
                  <>
                    {" "}
                    ({pct1(real / n)}; 95% interval {pct1(wlo)} to {pct1(whi)}).
                  </>
                ) : (
                  ". Too few to say much."
                )}{" "}
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

        <div className="mt-8">
          <Figure
            n="1.1"
            title={`Upset chance against No. ${fav}`}
            sub="Drag across the chart to move the lower-ranked player."
            legend={<Legend items={[{ label: "Model", color: BLUE }, { label: "Real record by ranking band, 95% interval", color: ORANGE, kind: "dot" }]} />}
            note="Dot size: how many matches. The model is one smooth line through every band at once; each dot is one band on its own."
          >
            <Plot
              height={280}
              label={`Chance of an upset against No. ${fav}`}
              x={{
                min: fav + 1,
                max: RANK_MAX,
                log: true,
                ticks: [2, 5, 10, 20, 50, 100, 200, 500].filter((t) => t > fav),
                minor: logMinor(fav + 1, RANK_MAX),
                format: (v) => `${v}`,
                title: "Lower-ranked player's ranking, log scale",
              }}
              y={{ min: 0, max: yMax, ticks: niceTicks(yMax, 5), format: (v) => `${v}%`, title: "Chance of an upset" }}
              onPick={(r) => setDog(clamp(Math.round(r), fav + 1, RANK_MAX))}
              tip={(at) => {
                const r = clamp(Math.round(at), fav + 1, RANK_MAX);
                const d = dots.find((d) => bandOf(r) === d.b);
                return {
                  at: r,
                  marks: [{ y: modelAt(r) * 100, color: BLUE }],
                  body: (
                    <>
                      <strong>
                        No. <span className="n">{r}</span> v No. <span className="n">{fav}</span>
                      </strong>
                      <br />
                      Model <span className="n">{pct1(modelAt(r))}</span>
                      {d && (
                        <>
                          <br />
                          No. {bandLabels[d.b]} won <span className="n">{num(d.upsets)}</span> of <span className="n">{num(d.n)}</span> (<span className="n">{pct1(d.upsets / d.n)}</span>)
                        </>
                      )}
                    </>
                  ),
                };
              }}
            >
              {(s) => {
                const pts = curve.map((r): [number, number] => [s.x(r), s.y(modelAt(r) * 100)]);
                return (
                  <>
                    <path d={areaPath(pts, s.bottom)} fill={BLUE} fillOpacity={0.08} />
                    <path d={linePath(pts)} fill="none" stroke={BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    {dots.map((d) => {
                      const [lo, hi] = wilson(d.upsets, d.n);
                      return (
                        <g key={d.b}>
                          <line x1={s.x(d.x)} x2={s.x(d.x)} y1={s.y(lo * 100)} y2={s.y(Math.min(yMax, hi * 100))} stroke={ORANGE} strokeWidth={1.5} />
                          <circle cx={s.x(d.x)} cy={s.y(Math.min(yMax, (d.upsets / d.n) * 100))} r={px(3 + 3.5 * Math.sqrt(d.n / biggest))} fill={ORANGE} stroke="var(--surface)" strokeWidth={2} />
                        </g>
                      );
                    })}
                    <Guides x={s.x(dog)} y={s.y(upset * 100)} s={s} />
                    <circle cx={s.x(dog)} cy={s.y(upset * 100)} r={6.5} fill={BLUE} stroke="var(--surface)" strokeWidth={2.5} />
                    <Callout x={s.x(dog)} y={s.y(upset * 100)} text={`No. ${dog}: ${pct1(upset)}`} s={s} />
                  </>
                );
              }}
            </Plot>
          </Figure>
        </div>

        <div className="mt-8">
          <UpsetGrid books={books} court={court} boKey={boKey} fav={fav} dog={dog} onPick={setPair} />
        </div>
      </Card>
      <Behind>
        <Stats
          items={[
            { label: "Matches", value: num(m.n) },
            { label: "Better-ranked won", value: pct1(m.accuracy) },
            { label: "Brier score", value: m.brier.toFixed(3), hint: "The mean squared error of the chances. A coin flip scores 0.250; lower is better." },
            { label: "Log-loss", value: m.logLoss.toFixed(3), hint: "The mean of −ln(the chance given to what happened). A coin flip scores 0.693; lower is better." },
          ]}
        />
        <p>
          Built from <strong>{num(m.n)} completed matches</strong> with both players ranked, {books.from} to {books.last.slice(0, 4)}. Rankings are as they stood that week. Walkovers, retirements, the
          Laver Cup and the Next Gen Finals are left out, and carpet counts as hard. On the last two scores a coin flip would get 0.250 and 0.693.
        </p>
        <Formula
          where={
            <>
              <i>p</i> is the better-ranked player&apos;s chance; <i>r</i> are the two rankings; <i>b</i> is how much the gap counts; a bracket is 1 when true, else 0. At equal rankings ln 1 = 0, so it&apos;s 50–50. Fitted by maximum
              likelihood.
            </>
          }
        >
          <Eq>
            logit <V>p</V>
            <Op>=</Op>
            <V>b</V>
            <Op>·</Op>ln
            <Frac
              n={
                <>
                  <V>r</V>
                  <Sub>low</Sub>
                </>
              }
              d={
                <>
                  <V>r</V>
                  <Sub>high</Sub>
                </>
              }
            />
          </Eq>
          <Eq>
            <V>b</V>
            <Op>=</Op>
            <V>β</V>
            <Sub>0</Sub>
            {m.bo5 && (
              <>
                <Op>+</Op>
                <V>β</V>
                <Sub>1</Sub>[bo5]
              </>
            )}
            <Op>+</Op>
            <V>β</V>
            <Sub>2</Sub>[clay]
            <Op>+</Op>
            <V>β</V>
            <Sub>3</Sub>[grass]
          </Eq>
        </Formula>
        <p>
          Each time the gap doubles (No. 10 v No. 20, or No. 50 v No. 100), the better-ranked player&apos;s odds grow <strong>×{doubling(0).toFixed(2)}</strong> on hard courts, ×{doubling(m.coef.clay).toFixed(2)}{" "}
          on clay and ×{doubling(m.coef.grass).toFixed(2)} on grass{m.bo5 ? <>, and ×{doubling(m.coef.bo5).toFixed(2)} on hard in best of five</> : null}. &ldquo;Any surface&rdquo; uses the hard-court line.
        </p>
        <Coefficients
          n="1.3"
          title="The fitted coefficients"
          unit="on the log-odds scale"
          rows={[
            { label: "β₀ ranking gap", value: m.coef.slope, se: m.se.slope },
            ...(m.bo5 ? [{ label: "β₁ best of five", value: m.coef.bo5, se: m.se.bo5 }] : []),
            { label: "β₂ clay", value: m.coef.clay, se: m.se.clay },
            { label: "β₃ grass", value: m.coef.grass, se: m.se.grass },
          ]}
        />
        <p>
          <strong>The real record</strong> groups rankings into bands (1, 2–3, 4–5, 6–10, 11–20 … 251+) and counts every match between two bands. It&apos;s there to check the model against.
        </p>
        <CalibrationChart calibration={m.calibration} n="1.4" />
      </Behind>
    </div>
  );
}

/** Every pairing of ranking bands at once: how often the lower-ranked player won */
function UpsetGrid({ books, court, boKey, fav, dog, onPick }: { books: InteractBooks; court: CourtOrAll; boKey: 3 | 5 | "any"; fav: number; dog: number; onPick: (f: number, d: number) => void }) {
  const m = books.upsets;
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<[number, number] | null>(null);
  const bands = BANDS.length;
  const left = 34;
  const top = 22;
  const size = Math.max(18, Math.min(46, Math.floor((width - left - 4) / bands)));
  const grid = size * bands;
  const height = top + grid + 36;
  const showText = size >= 34;
  const cellOf = (f: number, d: number) => {
    const i = cellIndex(court, boKey, f, d);
    return { n: m.cells.n[i], upsets: m.cells.upsets[i] };
  };
  // A ranking inside band b, to set when its square is clicked
  const inside = (b: number) => (BANDS[b + 1] ? Math.round(Math.sqrt(BANDS[b] * (BANDS[b + 1] - 1))) : 300);
  const fb = bandOf(fav);
  const db = bandOf(dog);
  const hovered = hover ? cellOf(hover[0], hover[1]) : null;
  const steps = [0, 10, 20, 30, 40, 50];
  return (
    <Figure
      n="1.2"
      title="The real record, every pairing of ranking bands"
      sub="Click a square to set both rankings."
      legend={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
          <span>Lower-ranked player won</span>
          <span className="inline-flex items-center gap-0.5">
            {steps.map((t) => (
              <span key={t} className="flex flex-col items-center">
                <span className="h-2.5 w-6 rounded-sm" style={{ background: rampColor(t / 50) }} />
                <span className="font-mono text-[9.5px] font-normal">{t === 50 ? "50+" : t}</span>
              </span>
            ))}
            <span className="ml-1 font-mono text-[9.5px] font-normal">%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-line" /> under 20 matches
          </span>
        </div>
      }
      note={
        hovered && hover ? (
          <>
            <strong className="text-foreground">
              No. {bandLabels[hover[0]]} v No. {bandLabels[hover[1]]}
            </strong>
            :{" "}
            {hovered.n ? (
              <>
                {num(hovered.upsets)} upsets in {num(hovered.n)} matches ({pct1(hovered.upsets / hovered.n)})
              </>
            ) : (
              "no matches"
            )}
          </>
        ) : (
          <>Rows: the better-ranked player&apos;s band. Columns: the lower-ranked player&apos;s. Outlined: the rankings set above.</>
        )
      }
    >
      <div ref={ref}>
        <svg width={width} height={height} role="img" aria-label="Upset rate for every pairing of ranking bands" className="block overflow-visible" onPointerLeave={() => setHover(null)}>
          <text x={left} y={10} className={axisTitle}>
            Lower-ranked player, from No. →
          </text>
          {BANDS.map((lo, d) => (
            <text key={`c${d}`} x={px(left + d * size + size / 2)} y={top + grid + 14} textAnchor="middle" className={`${tickText} ${d === db ? "fill-foreground font-semibold" : ""}`}>
              {lo}
            </text>
          ))}
          {BANDS.map((lo, f) => (
            <text key={`r${f}`} x={left - 6} y={px(top + f * size + size / 2)} dy="0.34em" textAnchor="end" className={`${tickText} ${f === fb ? "fill-foreground font-semibold" : ""}`}>
              {lo}
            </text>
          ))}
          <text x={0} y={height - 2} className={axisTitle}>
            ↑ Better-ranked player, from No.
          </text>
          {BANDS.map((_, f) =>
            BANDS.map((__, d) => {
              if (d < f) return null;
              const c = cellOf(f, d);
              const rate = c.n ? c.upsets / c.n : 0;
              const enough = c.n >= 20;
              const x = left + d * size;
              const y = top + f * size;
              return (
                <g key={`${f}-${d}`} className="cursor-pointer" onPointerEnter={() => setHover([f, d])} onClick={() => onPick(BANDS[f], Math.max(BANDS[f] + 1, inside(d)))}>
                  <rect x={x + 1} y={y + 1} width={size - 2} height={size - 2} rx={3} fill={enough ? rampColor(rate / 0.5) : "var(--line)"} fillOpacity={enough ? 1 : 0.55} />
                  {showText && enough && (
                    <text x={px(x + size / 2)} y={px(y + size / 2)} dy="0.34em" textAnchor="middle" className="pointer-events-none font-mono text-[10px] font-semibold tabular-nums" fill={rate > 0.24 ? "#ffffff" : "#0f1b2d"}>
                      {Math.round(rate * 100)}
                    </text>
                  )}
                </g>
              );
            }),
          )}
          {hover && <rect x={left + hover[1] * size + 0.5} y={top + hover[0] * size + 0.5} width={size - 1} height={size - 1} rx={3.5} fill="none" stroke={INK} strokeOpacity={0.45} pointerEvents="none" />}
          <rect x={left + db * size} y={top + fb * size} width={size} height={size} rx={4} fill="none" stroke={INK} strokeWidth={2.5} pointerEvents="none" />
        </svg>
      </div>
    </Figure>
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
  const five = bo5 && bestOf === 5;

  const rowOf = (p: Choice | null) => (p ? byPlayer.get(p.key)?.find((r) => r[S.season] === p.season) ?? null : null);
  const ratingOf = (row: SeasonRow) => (court === "all" ? row[S.elo] : blend(row[S.elo], courtRating(row, court), mix / 100));
  const chanceAt = (gap: number) => {
    const p = eloChance(gap, 0);
    return five ? (p >= 0.5 ? bestOfFive(p) : 1 - bestOfFive(1 - p)) : p;
  };
  const ra = rowOf(a);
  const rb = rowOf(b);
  const gap = ra && rb ? ratingOf(ra) - ratingOf(rb) : 0;
  const chance = ra && rb ? chanceAt(gap) : null;
  const names = [a, b].filter(Boolean).map((p) => books.names[p!.key]);
  const styles = chartStyles(names);
  const colorOf = (k: string) => styles.get(books.names[k])?.color ?? "var(--muted)";

  const seasonsShown = [...new Set(e.seasons.map((r) => r[S.season]))].sort((x, y) => x - y);
  const firstSeason = seasonsShown[0];
  const lastSeason = seasonsShown[seasonsShown.length - 1];
  const yValues = [a, b].flatMap((p) => (p ? byPlayer.get(p.key)!.map(ratingOf) : []));
  const yTicks = niceTicks(Math.max(2000, ...yValues) + 90, 5, Math.min(1500, ...yValues) - 20);

  const side = (p: Choice | null, set: (p: Choice | null) => void, label: string) => {
    const row = rowOf(p);
    const rows = p ? byPlayer.get(p.key) ?? [] : [];
    return (
      <div className="min-w-0 rounded-2xl border border-line p-3 sm:p-4">
        <PlayerPicker label={label} keys={keys} books={books} value={p?.key ?? null} onChange={(k) => set(k ? { key: k, season: bestSeason(k) } : null)} placeholder="Find a player" color={p ? colorOf(p.key) : undefined} />
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
              <span className="font-mono text-3xl font-semibold tabular-nums">{Math.round(ratingOf(row))}</span>
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
              <Slider label={`How much the ${court} rating counts`} value={mix} shown={`${mix}%`} min={0} max={100} step={5} onChange={setMix} hint="The rest is the overall rating. 50% is the usual mix." />
            </div>
          )}
          {a && b && ra && rb && chance !== null && (
            <div className="mt-6" aria-live="polite">
              <p className="flex flex-wrap items-baseline justify-between gap-2 font-semibold">
                <span>
                  {books.names[a.key]} {a.season} <span className="font-display text-3xl font-bold tabular-nums">{pct(chance)}</span>
                </span>
                <span>
                  <span className="font-display text-3xl font-bold tabular-nums">{pct(1 - chance)}</span> {books.names[b.key]} {b.season}
                </span>
              </p>
              <div className="relative mt-2 flex h-4 gap-0.5 overflow-hidden rounded-full">
                <span className="rounded-l-full transition-[width] duration-300" style={{ width: `${chance * 100}%`, background: colorOf(a.key) }} />
                <span className="flex-1 rounded-r-full" style={{ background: colorOf(b.key) }} />
                <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-surface/80" />
              </div>
              <p className="mt-2 text-muted">
                The chance of winning one match{onCourt(court)}
                {bo5 ? `, best of ${bestOf}` : ""}, each at the end of that season: a gap of <span className="font-mono tabular-nums">{signed(Math.round(gap))}</span> rating points.
              </p>
            </div>
          )}

          {a && b && (
            <div className="mt-8">
              <Figure
                n="2.1"
                title={`Season by season${court === "all" ? "" : `, ${mix}% ${court}`}`}
                sub="Click a season on either line to pick it."
                legend={<Legend items={[a, b].map((p) => ({ label: books.names[p.key], color: colorOf(p.key) }))} />}
              >
                <Plot
                  height={270}
                  label="Ratings season by season"
                  x={{ min: firstSeason - 0.5, max: lastSeason + 0.5, ticks: seasonsShown.filter((s) => s % 5 === 0), minor: seasonsShown.filter((s) => s % 5 !== 0), format: String, title: "Season" }}
                  y={{ min: yTicks[0], max: yTicks[yTicks.length - 1], ticks: yTicks, format: (v) => num(v), title: "Elo rating, end of season" }}
                  onPick={(at, yAt) => {
                    const season = Math.round(at);
                    const near = [a, b]
                      .map((p, i) => ({ i, p, r: byPlayer.get(p.key)!.find((x) => x[S.season] === season) }))
                      .filter((c) => c.r)
                      .sort((x, y) => Math.abs(ratingOf(x.r!) - yAt) - Math.abs(ratingOf(y.r!) - yAt))[0];
                    if (near) (near.i ? setB : setA)({ key: near.p.key, season });
                  }}
                  tip={(at) => {
                    const season = Math.round(at);
                    const marks: Tip["marks"] = [];
                    const lines = [a, b].map((p) => {
                      const r = byPlayer.get(p.key)!.find((x) => x[S.season] === season);
                      if (!r) return null;
                      marks.push({ y: ratingOf(r), color: colorOf(p.key) });
                      return (
                        <span key={p.key} className="block">
                          <strong>{books.names[p.key]}</strong> <span className="n">{Math.round(ratingOf(r))}</span>{" "}
                          <span className="text-muted">
                            (<span className="n">{r[S.w]}–{r[S.l]}</span>)
                          </span>
                        </span>
                      );
                    });
                    return {
                      at: season,
                      marks,
                      body: (
                        <>
                          <span className="n">{season}</span>
                          {lines}
                        </>
                      ),
                    };
                  }}
                >
                  {(s) =>
                    [a, b].map((p, i) => {
                      const rows = byPlayer.get(p.key)!;
                      const picked = rows.find((r) => r[S.season] === p.season);
                      const other = rowOf(i ? a : b);
                      return (
                        <g key={p.key}>
                          <path d={linePath(rows.map((r) => [s.x(r[S.season]), s.y(ratingOf(r))]))} fill="none" stroke={colorOf(p.key)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          {rows.map((r) => (
                            <circle key={r[S.season]} cx={s.x(r[S.season])} cy={s.y(ratingOf(r))} r={2.5} fill={colorOf(p.key)} />
                          ))}
                          {picked && (
                            <>
                              <circle cx={s.x(p.season)} cy={s.y(ratingOf(picked))} r={6} fill={colorOf(p.key)} stroke="var(--surface)" strokeWidth={2.5} />
                              <Callout
                                x={s.x(p.season)}
                                y={s.y(ratingOf(picked))}
                                text={`${books.names[p.key]} ${p.season}: ${Math.round(ratingOf(picked))}`}
                                s={s}
                                above={!other || ratingOf(picked) >= ratingOf(other)}
                              />
                            </>
                          )}
                        </g>
                      );
                    })
                  }
                </Plot>
              </Figure>
            </div>
          )}
        </Card>
        <Behind>
          <Stats
            items={[
              { label: "Matches rated", value: num(e.calibration.reduce((t, c) => t + c.n, 0)), hint: `From ${e.from}, after the warm-up season` },
              { label: "Higher-rated won", value: pct1(e.accuracy) },
              { label: "Brier score", value: e.brier.toFixed(3), hint: "The mean squared error of the chances. A coin flip scores 0.250; lower is better." },
              { label: "Log-loss", value: e.logLoss.toFixed(3), hint: "The mean of −ln(the chance given to what happened). A coin flip scores 0.693; lower is better." },
            ]}
          />
          <p>
            <strong>Elo ratings</strong> from {num(e.n)} completed matches since {books.from}. Everyone starts at 1,500. After each match the winner takes points from the loser: more for an upset, fewer
            for a win that was expected. On the same matches, the better-ranked player won {pct1(e.rankAccuracy)}.
          </p>
          <Formula
            where={
              <>
                <i>E</i> is A&apos;s expected chance against B; <i>S</i> is 1 for a win, 0 for a loss; <i>n</i> is how many matches A has played, so a newcomer&apos;s rating moves fast and a veteran&apos;s
                settles.
              </>
            }
          >
            <Eq>
              <V>E</V>
              <Sub>A</Sub>
              <Op>=</Op>
              <Frac
                n="1"
                d={
                  <>
                    1 + 10
                    <Sup>
                      (<i>R</i>
                      <sub>B</sub> − <i>R</i>
                      <sub>A</sub>)/400
                    </Sup>
                  </>
                }
              />
            </Eq>
            <Eq>
              <V>R</V>
              <Sub>A</Sub>′<Op>=</Op>
              <V>R</V>
              <Sub>A</Sub>
              <Op>+</Op>
              <Frac
                n="250"
                d={
                  <>
                    (<i>n</i> + 5)<Sup>0.4</Sup>
                  </>
                }
              />
              (<V>S</V>
              <Op>−</Op>
              <V>E</V>
              <Sub>A</Sub>)
            </Eq>
          </Formula>
          <p>
            <strong>Each surface has its own rating</strong>, from matches on it alone (carpet counts as hard). The chance uses a mix of the two; the slider sets it. {books.from} is a warm-up, because
            everyone starts level however good, so seasons from <strong>{e.from}</strong> are shown. A season&apos;s rating is where it stood after the player&apos;s last match of it. Players need 30
            matches, and a season 5.
          </p>
          {bo5 && <p>Best of five turns the best-of-three chance into a chance per set and plays to three sets won. Ratings learn from both lengths, so this is an estimate.</p>}
          <CalibrationChart calibration={e.calibration} n="2.3" />
          <p>Ratings don&apos;t fade with time off, and they aren&apos;t the official rankings.</p>
        </Behind>
      </div>

      <TopTen books={books} />
    </div>
  );
}

/** The top 10 by rating at any month: a timeline of the range they spanned, and the list itself */
function TopTen({ books }: { books: InteractBooks }) {
  const e = books.elo;
  const [month, setMonth] = useState(e.months.length - 1);
  const [topCourt, setTopCourt] = useState<CourtOrAll>("all");
  const tops = e.top[topCourt];
  const top = tops[month] ?? [];
  const yearStarts = e.months.map((m, i) => [m, i] as const).filter(([m]) => m.endsWith("-01"));
  const every = e.months.length > 200 ? 5 : 2;
  const firsts = tops.map((t) => t[0]?.[1] ?? 0);
  const tenths = tops.map((t) => t[t.length - 1]?.[1] ?? 0);
  const filled = tops.map((t, i) => [t, i] as const).filter(([t]) => t.length);
  const yTicks = niceTicks(Math.max(...firsts) + 20, 4, Math.min(...tenths.filter(Boolean)) - 20);
  const lo = Math.floor((Math.min(...top.map(([, r]) => r)) - 10) / 50) * 50;
  const hi = Math.ceil((Math.max(...top.map(([, r]) => r)) + 10) / 50) * 50;
  const scale = niceTicks(hi, 3, lo).filter((t) => t >= lo && t <= hi);
  const leaderAt = (i: number) => {
    const t = tops[i]?.[0];
    return t ? books.names[books.people[t[0]]] : "";
  };
  const row = "grid grid-cols-[1.75rem_1.75rem_5.5rem_minmax(0,1fr)_3rem] items-center gap-3 sm:grid-cols-[1.75rem_1.75rem_9rem_minmax(0,1fr)_3rem]";
  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold tracking-tight">The top 10 at any moment</h3>
          <p className="text-sm text-muted">By rating at the end of the month, for anyone with a match in the year before and 20 matches in all (10 on the surface).</p>
        </div>
        <Chips label="Rating" options={(["all", "hard", "clay", "grass"] as CourtOrAll[]).map((c) => ({ id: c, label: c === "all" ? "Overall" : courtWords[c] }))} value={topCourt} onChange={setTopCourt} />
      </div>
      <div className="mt-5">
        <Figure
          n="2.2"
          title="The top of the game, month by month"
          sub="Drag across the timeline to travel."
          legend={<Legend items={[{ label: "No. 1", color: INK }, { label: "No. 1 to No. 10", color: BLUE, kind: "band" }]} />}
        >
          <Plot
            height={220}
            label="Top 10 ratings over time"
            x={{
              min: 0,
              max: e.months.length - 1,
              ticks: yearStarts.filter(([m]) => Number(m.slice(0, 4)) % every === 0).map(([, i]) => i),
              minor: yearStarts.map(([, i]) => i),
              format: (i) => e.months[i]?.slice(0, 4) ?? "",
              title: "Month",
            }}
            y={{ min: yTicks[0], max: yTicks[yTicks.length - 1], ticks: yTicks, format: (v) => num(v), title: "Elo rating" }}
            onPick={(at) => setMonth(clamp(Math.round(at), 0, e.months.length - 1))}
            tip={(at) => {
              const i = clamp(Math.round(at), 0, e.months.length - 1);
              return {
                at: i,
                marks: firsts[i] ? [{ y: firsts[i], color: INK }] : [],
                body: (
                  <>
                    <span className="n">{monthLabel(e.months[i])}</span>
                    <br />
                    No. 1 <strong>{leaderAt(i)}</strong> <span className="n">{num(firsts[i])}</span>
                    <br />
                    <span className="text-muted">
                      No. 10 <span className="n">{num(tenths[i])}</span>
                    </span>
                  </>
                ),
              };
            }}
          >
            {(s) => {
              const upper = filled.map(([, i]): [number, number] => [s.x(i), s.y(firsts[i])]);
              const lower = filled.map(([, i]): [number, number] => [s.x(i), s.y(tenths[i])]);
              return (
                <>
                  <path d={bandPath(upper, lower)} fill={BLUE} fillOpacity={0.16} />
                  <path d={linePath(upper)} fill="none" stroke={INK} strokeWidth={1.75} strokeLinejoin="round" />
                  {firsts[month] > 0 && (
                    <>
                      <line x1={s.x(month)} x2={s.x(month)} y1={s.top} y2={s.bottom} stroke={INK} strokeOpacity={0.5} />
                      <circle cx={s.x(month)} cy={s.y(firsts[month])} r={5.5} fill={INK} stroke="var(--surface)" strokeWidth={2} />
                      <Callout x={s.x(month)} y={s.y(firsts[month])} text={`${monthLabel(e.months[month])}: ${leaderAt(month)}`} s={s} />
                    </>
                  )}
                </>
              );
            }}
          </Plot>
        </Figure>
      </div>
      <div className="mt-4">
        <Slider label="Month" value={month} shown={monthLabel(e.months[month])} min={0} max={e.months.length - 1} onChange={setMonth} />
      </div>
      <div className={`${row} mt-4 border-b-2 border-foreground/20 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted`}>
        <span className="col-span-3">Player</span>
        <span className="relative h-4 font-mono font-normal normal-case tracking-normal">
          {scale.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${((t - lo) / (hi - lo)) * 100}%` }}>
              {num(t)}
            </span>
          ))}
        </span>
        <span className="text-right">Rating</span>
      </div>
      <ol className="divide-y divide-line">
        {top.map(([p, r], i) => {
          const k = books.people[p];
          return (
            <li key={k} className={`${row} py-2`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm font-semibold tabular-nums ${i === 0 ? "bg-ball text-[#0b0d12] ring-1 ring-black/10" : "text-muted"}`}>{i + 1}</span>
              <Avatar name={books.names[k]} size="h-7 w-7 text-[10px]" />
              <span className="truncate text-sm font-semibold" title={books.full[k]}>
                {books.names[k]}
              </span>
              {/* Where the rating sits on the list's own scale */}
              <span className="relative h-5">
                {scale.map((t) => (
                  <span key={t} className="absolute inset-y-0 w-px bg-line" style={{ left: `${((t - lo) / (hi - lo)) * 100}%` }} />
                ))}
                <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
                <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface" style={{ left: `${((r - lo) / (hi - lo)) * 100}%`, background: i === 0 ? INK : BLUE }} />
              </span>
              <span className="text-right font-mono text-sm font-semibold tabular-nums">{num(r)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
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
  const levers = serveStats.map((s) => ({ s, gain: serveChance(fit.coef, { ...line, [s]: line[s] + 1 }) - chance })).sort((x, y) => y.gain - x.gain);
  const topGain = Math.max(0.0001, ...levers.map((l) => l.gain));
  const row = player ? playerRow(player, court) : null;
  const rated = row ? serveChance(fit.coef, { in1: row[2], won1: row[3], won2: row[4] }) : 0;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <Chips
          label="Surface"
          options={(["all", "hard", "clay", "grass"] as CourtOrAll[]).map((c) => ({ id: c, label: courtWords[c] }))}
          value={court}
          onChange={(c) => {
            setCourt(c);
            load(player, c);
          }}
        />
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
          <Answer value={pct1(chance)} label="chance of winning" sub={<>for a player who serves like this{onCourt(court)}, whatever the opponent does on serve.</>} />
          <Meter value={chance} label="Chance of winning" />
          {player && (
            <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm text-muted">
              {row ? (
                <>
                  <strong className="text-foreground">{books.full[player]}</strong>, {num(row[0])} matches with serve stats{onCourt(court)}: won <strong className="text-foreground">{num(row[1])}</strong> (
                  {pct1(row[1] / row[0])}). The sliders hold those averages, which the model rates at {pct1(rated)}.
                  {Math.abs(rated - row[1] / row[0]) > 0.08 && <> The gap is the rest of the game, mostly returning, which this model can&apos;t see.</>}
                </>
              ) : (
                <>{books.full[player]} has fewer than 20 matches with serve stats{onCourt(court)}, so the sliders hold every surface.</>
              )}
            </p>
          )}
        </div>
        <div className="mt-8 space-y-8">
          {serveStats.map((s, i) => (
            <ServeFigure key={s} n={`3.${i + 1}`} stat={s} line={line} coef={fit.coef} onChange={(v) => setLine({ ...line, [s]: v })} bins={m.bins[court][s]} mean={fit.mean[s]} />
          ))}
        </div>
        <div className="mt-8">
          <Figure n="3.4" title="Worth most from here" sub="What one more point in 100 on each would add to the winning chance, from the sliders as they are">
            <ul className="space-y-2">
              {levers.map((l) => (
                <li key={l.s} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,13rem)_1fr_auto]">
                  <span className="truncate font-semibold" title={serveLabels[l.s]}>
                    {serveLabels[l.s]}
                  </span>
                  <span className="h-3 rounded-r-sm bg-line/50">
                    <span className="block h-3 rounded-r-sm transition-[width] duration-300" style={{ width: `${(Math.max(0, l.gain) / topGain) * 100}%`, background: BLUE }} />
                  </span>
                  <span className="w-20 text-right font-mono tabular-nums">{signed(l.gain * 100, 2)} pts</span>
                </li>
              ))}
            </ul>
          </Figure>
        </div>
      </Card>
      <Behind>
        <Stats
          items={[
            { label: "Serving lines", value: num(m.fits.all.n) },
            { label: "Picks the winner", value: pct1(fit.accuracy), hint: "From one side's serve alone" },
            { label: "Seasons", value: `${m.years[0]}–${m.years[1]}` },
            { label: `Lines, ${courtWords[court].toLowerCase()}`, value: num(fit.n) },
          ]}
        />
        <p>
          Built from <strong>{num(m.fits.all.n)} serving lines</strong>, each side of every completed match with serve stats, {m.years[0]} to {m.years[1]}
          {m.years[0] > books.from ? <> (the data has no serve stats for this tour before {m.years[0]})</> : null}. Lines with fewer than 30 points served are left out.
        </p>
        <Formula
          where={
            <>
              <i>x</i>
              <sub>1</sub>, <i>x</i>
              <sub>2</sub>, <i>x</i>
              <sub>3</sub>: first serves in, first-serve and second-serve points won, in %. Fitted per surface by maximum likelihood. Aces and double faults are already inside the points won.
            </>
          }
        >
          <Eq>
            logit <V>p</V>
            <Op>=</Op>
            <V>β</V>
            <Sub>0</Sub>
            <Op>+</Op>
            <V>β</V>
            <Sub>1</Sub>
            <V>x</V>
            <Sub>1</Sub>
            <Op>+</Op>
            <V>β</V>
            <Sub>2</Sub>
            <V>x</V>
            <Sub>2</Sub>
            <Op>+</Op>
            <V>β</V>
            <Sub>3</Sub>
            <V>x</V>
            <Sub>3</Sub>
          </Eq>
        </Formula>
        <Coefficients
          n="3.5"
          title={`The fitted coefficients, ${courtWords[court].toLowerCase()}`}
          unit="log-odds per percentage point"
          rows={[
            { label: "β₁ first in", value: fit.coef.in1, se: fit.se.in1 },
            { label: "β₂ first won", value: fit.coef.won1, se: fit.se.won1 },
            { label: "β₃ second won", value: fit.coef.won2, se: fit.se.won2 },
          ]}
        />
        <p>
          It sees only one side&apos;s serve: how the opponent served is in the opponent&apos;s own line. The columns in each figure are <strong>the real record</strong>: of players who served in that range,
          how many won. The averages{onCourt(court)}: {fit.mean.in1}% first serves in, {fit.mean.won1}% won on first serve, {fit.mean.won2}% won on second.
        </p>
      </Behind>
    </div>
  );
}

/** One serving stat: its slider, the real record in columns, and the model's line through them */
function ServeFigure({
  n,
  stat,
  line,
  coef,
  onChange,
  bins,
  mean,
}: {
  n: string;
  stat: ServeStat;
  line: Record<ServeStat, number>;
  coef: InteractBooks["serve"]["fits"]["all"]["coef"];
  onChange: (v: number) => void;
  bins: { n: number; won: number }[];
  mean: number;
}) {
  const [lo, hi] = serveRange[stat];
  const value = line[stat];
  const at = (v: number) => serveChance(coef, { ...line, [stat]: v }) * 100;
  const steps = Array.from({ length: 81 }, (_, i) => lo + ((hi - lo) * i) / 80);
  return (
    <div>
      <Slider label={serveLabels[stat]} value={value} shown={`${value.toFixed(1)}%`} min={lo} max={hi - 0.5} step={0.5} onChange={onChange} hint={`Average ${mean}%. Or drag across the chart.`} />
      <div className="mt-3">
        <Figure n={n} title={`Win rate by ${serveShort[stat]}`} legend={<Legend items={[{ label: "Real record, per 2 points", color: BLUE, kind: "bar" }, { label: "Model, the other two held as set", color: ORANGE }]} />}>
          <Plot
            height={190}
            label={`Real win rate by ${serveShort[stat]}`}
            x={{
              min: lo,
              max: hi,
              ticks: Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10),
              minor: Array.from({ length: (hi - lo) / 2 + 1 }, (_, i) => lo + i * 2),
              format: (v) => `${v}%`,
              title: serveShort[stat],
            }}
            y={{ min: 0, max: 100, ticks: [0, 25, 50, 75, 100], format: (v) => `${v}%`, title: "Won the match" }}
            onPick={(v) => onChange(clamp(Math.round(v * 2) / 2, lo, hi - 0.5))}
            tip={(x) => {
              const b = clamp(Math.floor((x - lo) / 2), 0, bins.length - 1);
              const bin = bins[b];
              const mid = lo + b * 2 + 1;
              return {
                at: mid,
                marks: [{ y: at(mid), color: ORANGE }],
                body: (
                  <>
                    <span className="n">
                      {lo + b * 2}–{lo + b * 2 + 2}%
                    </span>
                    <br />
                    {bin.n ? (
                      <>
                        Won <strong className="n">{pct1(bin.won / bin.n)}</strong> of <span className="n">{num(bin.n)}</span>
                      </>
                    ) : (
                      "No matches"
                    )}
                    <br />
                    Model <span className="n">{pct1(at(mid) / 100)}</span>
                  </>
                ),
              };
            }}
          >
            {(s) => (
              <>
                {bins.map((bin, b) => {
                  if (bin.n < 30) return null;
                  const x0 = s.x(lo + b * 2) + 1;
                  const x1 = s.x(lo + b * 2 + 2) - 1;
                  const w = Math.min(24, x1 - x0);
                  const y = s.y((bin.won / bin.n) * 100);
                  const here = value >= lo + b * 2 && value < lo + b * 2 + 2;
                  return <rect key={b} x={px((x0 + x1 - w) / 2)} y={y} width={px(w)} height={px(Math.max(0, s.bottom - y))} rx={Math.min(3, w / 2)} fill={BLUE} fillOpacity={here ? 0.8 : 0.3} />;
                })}
                <line x1={s.left} x2={s.right} y1={s.y(50)} y2={s.y(50)} stroke={INK} strokeOpacity={0.35} strokeDasharray="5 4" />
                <path d={linePath(steps.map((v) => [s.x(v), s.y(at(v))]))} fill="none" stroke={ORANGE} strokeWidth={2} strokeLinecap="round" />
                <Guides x={s.x(value)} y={s.y(at(value))} s={s} />
                <circle cx={s.x(value)} cy={s.y(at(value))} r={5.5} fill={ORANGE} stroke="var(--surface)" strokeWidth={2} />
                <Callout x={s.x(value)} y={s.y(at(value))} text={`${value.toFixed(1)}% → ${pct1(at(value) / 100)}`} s={s} above={at(value) < 70} />
              </>
            )}
          </Plot>
        </Figure>
      </div>
    </div>
  );
}

/* ---------- Under pressure ---------- */

const pressureWords: Record<PressureMeasure, { label: string; chances: string; won: string; base: string }> = {
  saved: { label: "Break points saved", chances: "break points faced", won: "saved", base: "serve points won" },
  converted: { label: "Break points won", chances: "break points earned", won: "won", base: "return points won" },
  tiebreaks: { label: "Tiebreaks", chances: "tiebreaks", won: "won", base: "points won" },
  deciders: { label: "Deciding sets", chances: "deciding sets", won: "won", base: "points won" },
};
/** How much an edge in one half of a career says about the other, in words */
const lasting = (r: number) => (r < 0.15 ? "almost nothing" : r < 0.35 ? "a little" : r < 0.6 ? "a fair amount" : "a lot");

function PressurePanel({ books }: { books: InteractBooks }) {
  const [measure, setMeasure] = useState<PressureMeasure>("saved");
  const fit = books.pressure[measure];
  const words = pressureWords[measure];
  // Each listed player: their edge in points (won minus expected, per 100 chances) and its 95% interval
  const rows = useMemo(
    () =>
      Object.entries(fit.players).map(([i, r]) => {
        const share = r[P.won] / r[P.n];
        const expected = r[P.exp] / r[P.n];
        return { k: books.people[Number(i)], r, share, expected, edge: (share - expected) * 100, half: 196 * Math.sqrt((expected * (1 - expected)) / r[P.n]) };
      }),
    [fit, books.people],
  );
  const byKey = useMemo(() => new Map(rows.map((x) => [x.k, x])), [rows]);
  const keys = useMemo(() => [...new Set(pressureMeasures.flatMap((m) => Object.keys(books.pressure[m].players).map((i) => books.people[Number(i)])))], [books]);
  const [picked, setPicked] = useState<string[]>(() => {
    const want = books.tour === "atp" ? ["Rafael Nadal", "Roger Federer", "Novak Djokovic"] : ["Iga Swiatek", "Serena Williams", "Aryna Sabalenka"];
    return want.map((n) => keys.find((k) => books.full[k] === n)).filter(Boolean) as string[];
  });
  const styles = chartStyles(picked.map((k) => books.names[k]));
  const colorOf = (k: string) => styles.get(books.names[k])?.color ?? "var(--muted)";
  const [hover, setHover] = useState<string | null>(null);
  const lead = picked.find((k) => byKey.has(k));
  const leader = lead ? byKey.get(lead)! : null;

  // The scatter's frame: every player fits
  // Both axes share one frame, so the diagonal (won exactly as expected) runs corner to corner
  const sortedX = rows.flatMap((x) => [x.expected * 100, x.share * 100]).sort((a, b) => a - b);
  const q = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(p * (xs.length - 1))))] ?? 50;
  const span = (xs: number[]) => {
    const lo = xs[0] ?? 40;
    const hi = xs[xs.length - 1] ?? 60;
    const step = hi - lo > 30 ? 10 : 5;
    return [Math.floor((lo - 1) / step) * step, Math.ceil((hi + 1) / step) * step, step] as const;
  };
  const [x0, x1, xs] = span(sortedX);
  const [y0, y1, ys] = [x0, x1, xs];
  const ticks = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);

  // Even seasons against odd: does an edge last?
  const halves = rows
    .filter((x) => x.r[P.nEven] >= fit.min / 3 && x.r[P.nOdd] >= fit.min / 3)
    .map((x) => ({ k: x.k, even: ((x.r[P.wonEven] - x.r[P.expEven]) / x.r[P.nEven]) * 100, odd: ((x.r[P.wonOdd] - x.r[P.expOdd]) / x.r[P.nOdd]) * 100 }));
  const hMax = Math.max(10, Math.ceil(q(halves.map((h) => Math.max(Math.abs(h.even), Math.abs(h.odd))).sort((a, b) => a - b), 0.98) / 5) * 5);
  const mean = (v: number[]) => v.reduce((t, x) => t + x, 0) / (v.length || 1);
  const me = mean(halves.map((h) => h.even));
  const mo = mean(halves.map((h) => h.odd));
  const sd = (v: number[], m: number) => Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
  const slope = fit.halves.r * (sd(halves.map((h) => h.odd), mo) / (sd(halves.map((h) => h.even), me) || 1));

  // The ranked list: above or below expectation, searchable
  const [side, setSide] = useState<"above" | "below">("above");
  const [find, setFind] = useState("");
  const [all, setAll] = useState(false);
  const typed = fold(find.trim());
  const ranked = [...rows].sort((a, b) => (side === "above" ? b.edge - a.edge : a.edge - b.edge));
  const listed = typed ? ranked.filter((x) => fold(`${books.full[x.k]} ${books.names[x.k]}`).includes(typed)) : all ? ranked : ranked.slice(0, 10);
  const scale = Math.max(5, Math.ceil(Math.max(...listed.map((x) => Math.abs(x.edge) + x.half), 0) / 5) * 5);
  const at = (v: number) => `${((clamp(v, -scale, scale) + scale) / (2 * scale)) * 100}%`;

  const shown = hover ? byKey.get(hover) : null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <Chips
          label="Big points"
          options={pressureMeasures.map((m) => ({ id: m, label: pressureWords[m].label }))}
          value={measure}
          onChange={(m) => {
            setMeasure(m);
            setHover(null);
          }}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <PlayerPicker
              key={`${slot}-${picked[slot] ?? ""}`}
              label={slot === 0 ? "Compare a player" : "And another"}
              keys={keys}
              books={books}
              value={picked[slot] ?? null}
              color={picked[slot] ? colorOf(picked[slot]) : undefined}
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
          {leader && lead ? (
            <>
              <Answer
                value={signed(leader.edge, 1)}
                label={`points ${leader.edge >= 0 ? "above" : "below"} expectation`}
                sub={
                  <>
                    {books.full[lead]} {words.won} {num(leader.r[P.won])} of {num(leader.r[P.n])} {words.chances} ({pct1(leader.share)}). A player with the same {words.base} in those matches would
                    have {words.won} {pct1(leader.expected)}. 95% interval: {signed(leader.edge - leader.half, 1)} to {signed(leader.edge + leader.half, 1)}.
                  </>
                }
              />
              {picked.filter((k) => k !== lead).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-muted">
                  {picked
                    .filter((k) => k !== lead)
                    .map((k) => {
                      const x = byKey.get(k);
                      return (
                        <li key={k} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(k) }} />
                          <span>
                            <strong className="text-foreground">{books.full[k]}</strong>:{" "}
                            {x ? (
                              <>
                                <span className="font-mono tabular-nums">{signed(x.edge, 1)}</span> ({num(x.r[P.won])} of {num(x.r[P.n])}, expected {pct1(x.expected)})
                              </>
                            ) : (
                              <>fewer than {fit.min} {words.chances}</>
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-muted">
              Pick a player with {fit.min}+ {words.chances} to see how they did on them.
            </p>
          )}
        </div>

        <div className="mt-8">
          <Figure
            n="4.1"
            title={`${words.label}: won against expected`}
            sub={`Everyone with ${fit.min}+ ${words.chances}, ${fit.years[0]}–${fit.years[1]}. Hover a dot to see who; click to compare.`}
            legend={
              <Legend
                items={[
                  { label: "A player", color: "var(--muted)", kind: "dot" },
                  { label: "Won exactly as expected", color: "var(--muted)", kind: "dash" },
                  ...picked.filter((k) => byKey.has(k)).map((k) => ({ label: books.names[k], color: colorOf(k), kind: "dot" as const })),
                ]}
              />
            }
            note={
              shown && hover ? (
                <>
                  <strong className="text-foreground">{books.full[hover]}</strong>: {words.won} {num(shown.r[P.won])} of {num(shown.r[P.n])} ({pct1(shown.share)}), expected {pct1(shown.expected)},{" "}
                  <span className="font-mono">{signed(shown.edge, 1)}</span> points
                </>
              ) : (
                <>Above the diagonal: winning more of the {words.chances} than the rest of their play predicts. Below: fewer. The dotted line on a picked player is the edge.</>
              )
            }
          >
            <Plot
              height={320}
              label={`${words.label}: won against expected`}
              x={{ min: x0, max: x1, ticks: ticks(x0, x1, xs), minor: ticks(x0, x1, xs / 5), format: (v) => `${v}%`, title: `Expected, from ${words.base} in those matches` }}
              y={{ min: y0, max: y1, ticks: ticks(y0, y1, ys), format: (v) => `${v}%`, title: `${words.label}` }}
            >
              {(s) => (
                <g onPointerLeave={() => setHover(null)}>
                  <line x1={s.x(x0)} y1={s.y(y0)} x2={s.x(x1)} y2={s.y(y1)} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 4" />
                  {rows.map((x) => {
                    if (picked.includes(x.k)) return null;
                    const cx = s.x(clamp(x.expected * 100, x0, x1));
                    const cy = s.y(clamp(x.share * 100, y0, y1));
                    return (
                      <g key={x.k} onPointerEnter={() => setHover(x.k)} onClick={() => setPicked([x.k, ...picked.filter((k) => k !== x.k)].slice(0, 3))} className="cursor-pointer">
                        <circle cx={cx} cy={cy} r={8} fill="transparent" />
                        <circle cx={cx} cy={cy} r={hover === x.k ? 5 : 3} fill={hover === x.k ? INK : "var(--muted)"} fillOpacity={hover === x.k ? 1 : 0.4} />
                      </g>
                    );
                  })}
                  {picked.map((k) => {
                    const x = byKey.get(k);
                    if (!x) return null;
                    const cx = s.x(clamp(x.expected * 100, x0, x1));
                    const cy = s.y(clamp(x.share * 100, y0, y1));
                    const ey = s.y(clamp(x.expected * 100, y0, y1));
                    return (
                      <g key={k} onPointerEnter={() => setHover(k)}>
                        <line x1={cx} x2={cx} y1={ey} y2={cy} stroke={colorOf(k)} strokeWidth={1.5} strokeDasharray="2 2" />
                        <circle cx={cx} cy={cy} r={6} fill={colorOf(k)} stroke="var(--surface)" strokeWidth={2} />
                      </g>
                    );
                  })}
                  {shown && hover && (
                    <Callout x={s.x(clamp(shown.expected * 100, x0, x1))} y={s.y(clamp(shown.share * 100, y0, y1))} text={`${books.names[hover]} ${signed(shown.edge, 1)}`} s={s} above={shown.edge >= 0} />
                  )}
                </g>
              )}
            </Plot>
          </Figure>
        </div>

        <div className="mt-8">
          <Figure
            n="4.2"
            title={`Furthest ${side} expectation`}
            sub={`In points per 100 ${words.chances}, with the 95% interval`}
            legend={<Legend items={[{ label: "Edge", color: BLUE, kind: "dot" }, { label: "95% interval", color: BLUE }]} />}
            note="The ends of any list like this are crowded with players who had few chances: their intervals are the widest. An interval that crosses zero could be luck."
          >
            <div className="flex flex-wrap items-center gap-3">
              <Chips
                label="Show"
                options={[
                  { id: "above", label: "Above" },
                  { id: "below", label: "Below" },
                ]}
                value={side}
                onChange={(v) => setSide(v as "above" | "below")}
              />
              <div className="relative min-w-0 flex-1 basis-56 self-end">
                <SearchIcon />
                <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a player" autoComplete="off" spellCheck={false} className={searchInput} aria-label="Find a player in the list" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_4.5rem] items-end gap-3 border-b-2 border-foreground/20 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted sm:grid-cols-[minmax(0,10rem)_4rem_minmax(0,1fr)_4.5rem]">
              <span>Player</span>
              <span className="hidden text-right sm:block">Chances</span>
              <span className="relative h-4 font-mono font-normal normal-case tracking-normal">
                {[-scale, 0, scale].map((t) => (
                  <span key={t} className={`absolute ${t === -scale ? "" : t === scale ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: at(t) }}>
                    {t ? signed(t) : "0"}
                  </span>
                ))}
              </span>
              <span className="text-right">Edge</span>
            </div>
            <ol className="divide-y divide-line">
              {listed.map((x) => (
                <li key={x.k} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_4.5rem] items-center gap-3 py-1.5 text-sm sm:grid-cols-[minmax(0,10rem)_4rem_minmax(0,1fr)_4.5rem]">
                  <button
                    type="button"
                    onClick={() => setPicked([x.k, ...picked.filter((k) => k !== x.k)].slice(0, 3))}
                    className="cursor-pointer truncate text-left font-semibold text-foreground transition hover:text-court"
                    title={`${books.full[x.k]}: ${num(x.r[P.won])} of ${num(x.r[P.n])}, expected ${pct1(x.expected)}`}
                  >
                    {books.names[x.k]}
                  </button>
                  <span className="hidden text-right font-mono text-xs tabular-nums text-muted sm:block">{num(x.r[P.n])}</span>
                  <span className="relative h-5">
                    <span className="absolute inset-y-0 w-px bg-foreground/50" style={{ left: at(0) }} />
                    <span className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full" style={{ left: at(x.edge - x.half), width: `calc(${at(x.edge + x.half)} - ${at(x.edge - x.half)})`, background: BLUE, opacity: 0.55 }} />
                    <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface" style={{ left: at(x.edge), background: picked.includes(x.k) ? colorOf(x.k) : BLUE }} />
                  </span>
                  <span className="text-right font-mono text-sm font-semibold tabular-nums">{signed(x.edge, 1)}</span>
                </li>
              ))}
            </ol>
            {!typed && ranked.length > 10 && (
              <button type="button" onClick={() => setAll(!all)} className="mt-2 cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline">
                {all ? "Show the top 10" : `Show all ${ranked.length}`}
              </button>
            )}
            {typed && !listed.length && <p className="mt-2 text-sm text-muted">No one called &ldquo;{find.trim()}&rdquo; has {fit.min}+ {words.chances}.</p>}
          </Figure>
        </div>

        <div className="mt-8">
          <Figure
            n="4.3"
            title="Does the edge last?"
            sub={`Each player's edge in even seasons against odd seasons, for the ${num(halves.length)} with enough of both`}
            legend={<Legend items={[{ label: "A player", color: BLUE, kind: "dot" }, { label: "Best straight line", color: ORANGE }]} />}
            note={
              <>
                <span className="font-mono">r = {fixed(fit.halves.r, 2)}</span> (95% interval {fixed(fit.halves.lo, 2)} to {fixed(fit.halves.hi, 2)}): one half of a career says {lasting(fit.halves.r)} about the
                other. For comparison, {words.base} itself gives <span className="font-mono">r = {fit.halves.baseR.toFixed(2)}</span>. A real skill makes a tilted cloud; luck makes a round one.
              </>
            }
          >
            <Plot
              height={300}
              label="Edge in even seasons against odd seasons"
              x={{ min: -hMax, max: hMax, ticks: ticks(-hMax, hMax, hMax / 2), minor: ticks(-hMax, hMax, hMax / 10), format: (v) => (v ? signed(v) : "0"), title: "Edge in even seasons" }}
              y={{ min: -hMax, max: hMax, ticks: ticks(-hMax, hMax, hMax / 2), format: (v) => (v ? signed(v) : "0"), title: "Edge in odd seasons" }}
              xGrid
            >
              {(s) => (
                <g onPointerLeave={() => setHover(null)}>
                  <line x1={s.x(0)} x2={s.x(0)} y1={s.top} y2={s.bottom} stroke={INK} strokeOpacity={0.4} />
                  <line x1={s.left} x2={s.right} y1={s.y(0)} y2={s.y(0)} stroke={INK} strokeOpacity={0.4} />
                  {[...halves.filter((h) => !picked.includes(h.k)), ...halves.filter((h) => picked.includes(h.k))].map((h) => {
                    const on = picked.includes(h.k) || hover === h.k;
                    return (
                      <g key={h.k} onPointerEnter={() => setHover(h.k)} onClick={() => setPicked([h.k, ...picked.filter((k) => k !== h.k)].slice(0, 3))} className="cursor-pointer">
                        <circle cx={s.x(clamp(h.even, -hMax, hMax))} cy={s.y(clamp(h.odd, -hMax, hMax))} r={8} fill="transparent" />
                        <circle
                          cx={s.x(clamp(h.even, -hMax, hMax))}
                          cy={s.y(clamp(h.odd, -hMax, hMax))}
                          r={on ? 5.5 : 3}
                          fill={picked.includes(h.k) ? colorOf(h.k) : hover === h.k ? INK : BLUE}
                          fillOpacity={on ? 1 : 0.35}
                          stroke={on ? "var(--surface)" : "none"}
                          strokeWidth={2}
                        />
                      </g>
                    );
                  })}
                  <line x1={s.x(-hMax)} x2={s.x(hMax)} y1={s.y(clamp(mo + slope * (-hMax - me), -hMax, hMax))} y2={s.y(clamp(mo + slope * (hMax - me), -hMax, hMax))} stroke={ORANGE} strokeWidth={2} />
                  {hover &&
                    (() => {
                      const h = halves.find((x) => x.k === hover);
                      return h ? <Callout x={s.x(clamp(h.even, -hMax, hMax))} y={s.y(clamp(h.odd, -hMax, hMax))} text={`${books.names[h.k]} ${signed(h.even, 1)} / ${signed(h.odd, 1)}`} s={s} /> : null;
                    })()}
                </g>
              )}
            </Plot>
          </Figure>
        </div>
      </Card>
      <Behind>
        <Stats
          items={[
            { label: words.chances, value: num(fit.n) },
            { label: "Players listed", value: num(rows.length), hint: `With ${fit.min}+ ${words.chances}` },
            { label: measure === "converted" ? "Returner won" : measure === "saved" ? "Server saved" : "Seasons", value: measure === "saved" || measure === "converted" ? pct1(fit.rate) : `${fit.years[0]}–${fit.years[1]}` },
            { label: "Even v odd, r", value: fixed(fit.halves.r, 2), hint: "How well a player's edge in even seasons matches the edge in odd seasons: 0 is none, 1 is perfect" },
          ]}
        />
        <p>
          Built from <strong>{num(fit.n)} {words.chances}</strong> in completed matches with full stats for both players, {fit.years[0]} to {fit.years[1]}
          {fit.years[0] > books.from ? <> (the data has no stats for this tour before {fit.years[0]})</> : null}.{" "}
          {measure === "saved" || measure === "converted" ? (
            <>Break points come from each match&apos;s stats line.</>
          ) : measure === "tiebreaks" ? (
            <>Tiebreaks come from the score: any set won 7–6, or by a game at 12–12 or later.</>
          ) : (
            <>A deciding set is the third of a best of three or the fifth of a best of five.</>
          )}
        </p>
        <p>
          <strong>Expected</strong> isn&apos;t a forecast made before the match. It asks: given how a player actually played in that match ({words.base}), how many of its {words.chances} would the
          typical player have won? A logistic regression across the whole tour answers that, one curve for everyone.
        </p>
        <Formula
          where={
            <>
              <i>q</i> is the expected share of {words.chances} won; <i>s</i> is the player&apos;s {words.base} in that match. A player&apos;s edge is what they won minus the sum of <i>q</i> over every
              chance, per 100. Fitted by maximum likelihood{measure === "tiebreaks" || measure === "deciders" ? ", one side of each" : ""}.
            </>
          }
        >
          <Eq>
            logit <V>q</V>
            <Op>=</Op>
            <V>α</V>
            <Op>+</Op>
            <V>β</V>
            <Op>·</Op>logit <V>s</V>
          </Eq>
          <Eq>
            edge<Op>=</Op>
            100
            <Frac n={<>won − Σ<V>q</V></>} d="chances" />
          </Eq>
        </Formula>
        <Coefficients
          n="4.4"
          title="The fitted curve"
          unit="on the log-odds scale"
          rows={[
            { label: "α intercept", value: fit.coef.a, se: fit.se.a },
            { label: "β slope", value: fit.coef.b, se: fit.se.b },
          ]}
        />
        <p>
          <strong>Does it last?</strong> If winning big points were a skill of its own, a player&apos;s edge in even-numbered seasons would predict the edge in odd ones. Across {num(fit.halves.players)}{" "}
          players, the correlation is <strong>{fixed(fit.halves.r, 2)}</strong>, against {fit.halves.baseR.toFixed(2)} for {words.base} itself. Players need {Math.ceil(fit.min / 3)}+ {words.chances} in each
          half.
        </p>
        <p>
          The baseline counts the big points themselves ({measure === "saved" || measure === "converted" ? "a break point is also a serve point" : "a tiebreak's or a decider's points are among the match's points"}), which
          pulls the expectation a little towards what happened, the same for everyone. Edges are shown raw, not shrunk, so small samples swing widest.
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
    return { k, career, ages, best };
  });
  const allDiffs = [...typical.ages.flatMap((a) => [a.diff - 1.96 * a.se, a.diff + 1.96 * a.se]), ...careers.flatMap((c) => c.ages.map((a) => a.diff))];
  const yMin = Math.max(-40, Math.floor(Math.min(-10, ...allDiffs) / 10) * 10);
  const yMax = Math.min(40, Math.ceil(Math.max(10, ...allDiffs) / 10) * 10);
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += 10) yTicks.push(v);
  const fitAt = (age: number) => typical.fit[0] + typical.fit[1] * age + typical.fit[2] * age * age;
  const fitAges = typical.ages.length ? [typical.ages[0].age, typical.ages[typical.ages.length - 1].age] : [16, 40];
  const cy = (v: number) => clamp(v, yMin, yMax);
  const peakShown = Number.isFinite(typical.peak) && typical.peak >= 16 && typical.peak <= 40;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <Card>
        <Chips label="Seasons" options={ageEras.map((x) => ({ id: x.id, label: x.label }))} value={era} onChange={setEra} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((slot) => (
            <PlayerPicker
              key={`${slot}-${picked[slot] ?? ""}`}
              label={slot === 0 ? "Compare a player" : "And another"}
              keys={keys}
              books={books}
              value={picked[slot] ?? null}
              color={picked[slot] ? colorOf(picked[slot]) : undefined}
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
          <Answer value={Number.isFinite(typical.peak) ? `${typical.peak}` : "–"} label="years old: the typical peak" sub={<>where the fitted curve tops out, from {num(typical.players)} players.</>} />
          {careers.some((c) => c.best) && (
            <ul className="mt-3 space-y-1 text-sm text-muted">
              {careers.map(
                (c) =>
                  c.best && (
                    <li key={c.k} className="flex items-center gap-2">
                      <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: colorOf(c.k) }} />
                      <span>
                        <strong className="text-foreground">{books.full[c.k]}</strong>: best at {c.best.age} ({c.best.w}–{c.best.l}, {pct(c.best.w / (c.best.w + c.best.l))}), against {pct(c.career)} over a whole
                        career
                      </span>
                    </li>
                  ),
              )}
            </ul>
          )}
        </div>
        <div className="mt-8">
          <Figure
            n="5.1"
            title="Win rate at each age, against the player's own career win rate"
            sub="Above the line: winning more than usual for that player."
            legend={
              <Legend
                items={[
                  { label: "Typical player", color: INK },
                  { label: "Its 95% interval", color: INK, kind: "band" },
                  { label: "Fitted curve", color: "var(--muted)", kind: "dash" },
                  ...picked.map((k) => ({ label: books.names[k], color: colorOf(k) })),
                ]}
              />
            }
            note="A player's ages with fewer than 10 matches are left off."
          >
            <Plot
              height={310}
              label="Win rate by age against career average"
              x={{ min: 16, max: 40, ticks: [16, 20, 24, 28, 32, 36, 40], minor: Array.from({ length: 25 }, (_, i) => 16 + i), format: String, title: "Age" }}
              y={{ min: yMin, max: yMax, ticks: yTicks, format: (v) => (v ? signed(v) : "0"), title: "Points above career win rate" }}
              tip={(at) => {
                const age = Math.round(at);
                const t = typical.ages.find((a) => a.age === age);
                const marks: Tip["marks"] = t ? [{ y: cy(t.diff), color: INK }] : [];
                const lines = careers.map((c) => {
                  const a = c.ages.find((x) => x.age === age);
                  if (!a) return null;
                  marks.push({ y: cy(a.diff), color: colorOf(c.k) });
                  return (
                    <span key={c.k} className="block">
                      {books.names[c.k]}{" "}
                      <span className="n">
                        {a.w}–{a.l}
                      </span>
                      , <span className="n">{signed(a.diff)}</span>
                    </span>
                  );
                });
                return {
                  at: age,
                  marks,
                  body: (
                    <>
                      <strong>Age {age}</strong>
                      {t && (
                        <span className="block">
                          Typical <span className="n">{signed(t.diff, 1)}</span> <span className="text-muted">± <span className="n">{(1.96 * t.se).toFixed(1)}</span>, {num(t.players)} players</span>
                        </span>
                      )}
                      {lines}
                    </>
                  ),
                };
              }}
            >
              {(s) => {
                const upper = typical.ages.map((a): [number, number] => [s.x(a.age), s.y(cy(a.diff + 1.96 * a.se))]);
                const lower = typical.ages.map((a): [number, number] => [s.x(a.age), s.y(cy(a.diff - 1.96 * a.se))]);
                return (
                  <>
                    <path d={bandPath(upper, lower)} fill={INK} fillOpacity={0.08} />
                    <line x1={s.left} x2={s.right} y1={s.y(0)} y2={s.y(0)} stroke={INK} strokeOpacity={0.55} strokeWidth={1} />
                    <text x={s.right - 4} y={s.y(0) - 5} textAnchor="end" className="fill-muted text-[10px] italic">
                      career average
                    </text>
                    {typical.fit[2] < 0 && (
                      <path
                        d={linePath(Array.from({ length: 41 }, (_, i) => fitAges[0] + ((fitAges[1] - fitAges[0]) * i) / 40).map((age) => [s.x(age), s.y(cy(fitAt(age)))]))}
                        fill="none"
                        stroke="var(--muted)"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                      />
                    )}
                    <path d={linePath(typical.ages.map((a) => [s.x(a.age), s.y(cy(a.diff))]))} fill="none" stroke={INK} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
                    {careers.map((c) => (
                      <g key={c.k}>
                        <path d={linePath(c.ages.map((a) => [s.x(a.age), s.y(cy(a.diff))]))} fill="none" stroke={colorOf(c.k)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                        {c.ages.map((a) => (
                          <circle key={a.age} cx={s.x(a.age)} cy={s.y(cy(a.diff))} r={3.5} fill={colorOf(c.k)} stroke="var(--surface)" strokeWidth={1.5} />
                        ))}
                      </g>
                    ))}
                    {peakShown && (
                      <>
                        <line x1={s.x(typical.peak)} x2={s.x(typical.peak)} y1={s.y(cy(fitAt(typical.peak)))} y2={s.bottom} stroke={INK} strokeOpacity={0.35} strokeDasharray="1 3" strokeLinecap="round" />
                        <circle cx={s.x(typical.peak)} cy={s.y(cy(fitAt(typical.peak)))} r={5} fill="var(--surface)" stroke={INK} strokeWidth={2} />
                        <Callout x={s.x(typical.peak)} y={s.y(cy(fitAt(typical.peak)))} text={`Peak ${typical.peak}`} s={s} />
                      </>
                    )}
                  </>
                );
              }}
            </Plot>
          </Figure>
        </div>
      </Card>
      <Behind>
        <Stats
          items={[
            { label: "Players", value: num(typical.players) },
            { label: "Typical peak", value: Number.isFinite(typical.peak) ? `${typical.peak} yrs` : "–" },
            { label: "Matches each", value: `${m.minMatches}+` },
            { label: "Ages shown", value: typical.ages.length ? `${typical.ages[0].age}–${typical.ages[typical.ages.length - 1].age}` : "–", hint: "Each reached by at least 10 players" },
          ]}
        />
        <p>
          Built from <strong>{num(typical.players)} players with {m.minMatches}+ completed matches</strong> in those seasons. Age is at the time of each match, in whole years. The data starts in{" "}
          {books.from}, so a career that began earlier counts from then.
        </p>
        <p>
          <strong>Each player is compared with themselves</strong>: their win rate at each age, minus their win rate over all those seasons, averaged across players and weighted by matches. Comparing raw win
          rates would flatter old age, because only the best are still playing at 35. The band is the 95% interval for that average.
        </p>
        <Formula
          where={
            <>
              <i>d</i> is the typical points above career win rate at age <i>a</i>, fitted by weighted least squares through the ages shown. Where the curve tops out, <i>a</i>*, is the typical peak.
            </>
          }
        >
          <Eq>
            <V>d</V>(<V>a</V>)<Op>=</Op>
            {fixed(typical.fit[0], 1)}
            <Op>{typical.fit[1] >= 0 ? "+" : "−"}</Op>
            {Math.abs(typical.fit[1]).toFixed(2)}
            <V>a</V>
            <Op>{typical.fit[2] >= 0 ? "+" : "−"}</Op>
            {Math.abs(typical.fit[2]).toFixed(3)}
            <V>a</V>
            <Sup>2</Sup>
          </Eq>
          <Eq>
            <V>a</V>*<Op>=</Op>
            <Frac
              n={
                <>
                  −<V>β</V>
                  <Sub>1</Sub>
                </>
              }
              d={
                <>
                  2<V>β</V>
                  <Sub>2</Sub>
                </>
              }
            />
            <Op>=</Op>
            {Number.isFinite(typical.peak) ? typical.peak : "–"}
          </Eq>
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
  const longest = fit.longest.slice(0, 6);
  const longMax = Math.ceil(Math.max(60, ...longest.map((l) => l.minutes)) / 60) * 60;
  const longRow = "grid grid-cols-[42%_minmax(0,1fr)] items-center sm:grid-cols-[36%_minmax(0,1fr)]";

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
                8 in 10 such matches take {hm(Math.max(0, lo))} to {hm(hi)}.
                {sets === null && (
                  <>
                    {" "}
                    Best of {bo}
                    {onCourt(court)}, matches went {fit.sets.map((n, i) => `${n} sets ${pct(share[i] / shareTotal)}`).join(", ")} of the time.
                  </>
                )}
              </>
            }
          />
        </div>
        <div className="mt-8">
          <Figure
            n="6.1"
            title={`Real lengths, best of ${bo}${sets === null ? "" : `, ${sets} sets`}${onCourt(court)}`}
            sub={`${num(total)} matches in 10-minute bins, every season`}
            legend={
              <Legend
                items={[
                  { label: "Inside the 80% range", color: BLUE, kind: "bar" },
                  { label: "Outside it", color: "rgb(42 120 214 / 0.3)", kind: "bar" },
                  { label: "The model's answer", color: ORANGE },
                ]}
              />
            }
          >
            <Plot
              height={260}
              label="Real match lengths"
              x={{
                min: 0,
                max: xMax,
                ticks: Array.from({ length: xMax / 60 + 1 }, (_, i) => i * 60),
                minor: Array.from({ length: xMax / 30 + 1 }, (_, i) => i * 30),
                format: (v) => (v ? `${v / 60} h` : "0"),
                title: "Match length",
              }}
              y={{ min: 0, max: binTicks[binTicks.length - 1], ticks: binTicks, format: (v) => (v >= 1000 ? `${v / 1000}k` : num(v)), title: "Matches" }}
              tip={(at) => {
                const b = clamp(Math.floor(at / 10), 0, hist.length - 1);
                return {
                  at: b * 10 + 5,
                  body: (
                    <>
                      <span className="n">
                        {hm(b * 10)} to {hm(b * 10 + 10)}
                      </span>
                      <br />
                      <strong className="n">{num(hist[b] ?? 0)}</strong> matches (<span className="n">{pct1((hist[b] ?? 0) / Math.max(1, total))}</span>)
                    </>
                  ),
                };
              }}
            >
              {(s) => (
                <>
                  {hist.map((v, b) => {
                    if (!v) return null;
                    const x0 = s.x(b * 10) + 0.5;
                    const x1 = s.x(b * 10 + 10) - 0.5;
                    const y = s.y(v);
                    const inside = b * 10 + 5 >= lo && b * 10 + 5 <= hi;
                    return <rect key={b} x={px(x0)} y={y} width={px(Math.max(1, x1 - x0))} height={px(s.bottom - y)} rx={Math.min(2.5, (x1 - x0) / 2)} fill={BLUE} fillOpacity={inside ? 0.75 : 0.25} />;
                  })}
                  {/* The 80% range as a bracket over the bars */}
                  <path d={`M${s.x(Math.max(0, lo))} ${s.top + 12}V${s.top + 6}H${s.x(hi)}V${s.top + 12}`} fill="none" stroke={INK} strokeOpacity={0.55} />
                  <text x={(s.x(Math.max(0, lo)) + s.x(hi)) / 2} y={s.top + 1} textAnchor="middle" className="fill-muted font-mono text-[10.5px]">
                    80%: {hm(Math.max(0, lo))} to {hm(hi)}
                  </text>
                  <line x1={s.x(minutes)} x2={s.x(minutes)} y1={s.top + 18} y2={s.bottom} stroke={ORANGE} strokeWidth={2.5} />
                  <Callout x={s.x(minutes)} y={s.top + 18} text={hm(minutes)} s={s} above={false} />
                </>
              )}
            </Plot>
          </Figure>
        </div>
        <div className="mt-8">
          <Figure
            n="6.2"
            title={`Furthest past the model, best of ${bo}`}
            sub="Each line runs from what the model expected, the sets known, to how long it really took. Open any in Explore."
            legend={<Legend items={[{ label: "Model", color: "var(--muted)", kind: "dot" }, { label: "Real length", color: ORANGE, kind: "dot" }]} />}
          >
            <div className={`${longRow} border-b-2 border-foreground/20 pb-1`}>
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted">Match</span>
              <span className="relative h-4 font-mono text-[10.5px] text-muted">
                {Array.from({ length: longMax / 60 + 1 }, (_, i) => (
                  <span key={i} className={`absolute whitespace-nowrap ${i === 0 ? "" : i === longMax / 60 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${((i * 60) / longMax) * 100}%` }}>
                    {i ? `${i} h` : "0"}
                  </span>
                ))}
              </span>
            </div>
            <ol className="divide-y divide-line">
              {longest.map((l) => (
                <li key={l.id}>
                  <Link href={exploreHref(l.id)} prefetch={false} className={`${longRow} py-2 transition hover:bg-court/5`}>
                    <span className="min-w-0 pr-3 text-sm leading-tight">
                      <strong className="block truncate">
                        {books.names[books.people[l.w]]} beat {books.names[books.people[l.l]]}
                      </strong>
                      <span className="block truncate text-xs text-muted">
                        {l.at} · <span className="font-mono">{hm(l.minutes)}</span> <span className="font-mono">({signed(l.minutes - l.predicted)} min)</span>
                      </span>
                    </span>
                    <span className="relative h-6">
                      {Array.from({ length: longMax / 60 + 1 }, (_, i) => (
                        <span key={i} className="absolute inset-y-0 w-px bg-line" style={{ left: `${((i * 60) / longMax) * 100}%` }} />
                      ))}
                      <span className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full" style={{ left: `${(l.predicted / longMax) * 100}%`, width: `${((l.minutes - l.predicted) / longMax) * 100}%`, background: ORANGE, opacity: 0.55 }} />
                      <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted bg-surface" style={{ left: `${(l.predicted / longMax) * 100}%` }} />
                      <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface" style={{ left: `${(l.minutes / longMax) * 100}%`, background: ORANGE }} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Figure>
        </div>
      </Card>
      <Behind>
        <Stats
          items={[
            { label: "Matches", value: num(fit.n) },
            { label: "80% of misses", value: `${signed(fit.spread[0])} to ${signed(fit.spread[1])}`, hint: "Minutes, real length minus the model's, the sets known" },
            { label: "R², before", value: fit.r2Before.toFixed(3), hint: "How much of the spread in lengths the model explains before a ball is struck" },
            { label: "R², sets known", value: fit.r2.toFixed(3), hint: "The same, once the number of sets is known" },
          ]}
        />
        <p>
          Built from <strong>{num(fit.n)} completed best-of-{bo} matches</strong> with a time and both players ranked, {fit.years[0]} to {fit.years[1]}
          {fit.years[0] > books.from ? <> (the data has few match times for this tour before {fit.years[0]})</> : null}. Times under two or over eight minutes a game are left out as typos.
        </p>
        <Formula
          where={
            <>
              <i>m</i> is minutes; <i>g</i> = |ln(<i>r</i>
              <sub>1</sub>/<i>r</i>
              <sub>2</sub>)|, the ranking gap; <i>t</i> = season − 2015; a bracket is 1 when true. Fitted by least squares.
            </>
          }
        >
          <Eq>
            <V>m</V>
            <Op>=</Op>
            <V>β</V>
            <Sub>0</Sub>
            <Op>+</Op>
            <V>β</V>
            <Sub>1</Sub>[clay]
            <Op>+</Op>
            <V>β</V>
            <Sub>2</Sub>[grass]
          </Eq>
          <Eq>
            <Op>+</Op>
            <V>β</V>
            <Sub>3</Sub>
            <V>g</V>
            <Op>+</Op>
            <V>β</V>
            <Sub>4</Sub>
            <V>t</V>
            <Op>+</Op>
            <Sigma />
            <Sub>
              <i>k</i>
            </Sub>
            <V>γ</V>
            <Sub>
              <i>k</i>
            </Sub>
            [<V>k</V> sets]
          </Eq>
        </Formula>
        <Coefficients
          n="6.3"
          title="What adds minutes"
          unit="in minutes"
          digits={1}
          rows={[
            ...fit.sets.slice(1).map((n, i) => ({ label: `γ ${n} sets`, value: fit.coef.perSet[i + 1], se: fit.se.perSet[i + 1] })),
            { label: "β₁ clay", value: fit.coef.clay, se: fit.se.clay },
            { label: "β₂ grass", value: fit.coef.grass, se: fit.se.grass },
            { label: "β₃ ranking gap", value: fit.coef.gap, se: fit.se.gap },
            { label: "β₄ a decade", value: decade, se: fit.se.year * 10 },
          ]}
        />
        <p>
          Each set past {fit.sets[0]} adds about <strong>{Math.round(fit.coef.perSet[1])} minutes</strong>. Against hard courts, clay {minutesWord(fit.coef.clay)} and grass {minutesWord(fit.coef.grass)}.
          Matches have grown {Math.abs(decade).toFixed(0)} minutes {decade >= 0 ? "longer" : "shorter"} a decade. The ranking gap hardly matters (doubling it changes a match by{" "}
          {Math.abs(fit.coef.gap * Math.LN2).toFixed(1)} minutes), so the answer is for two players ranked alike.
        </p>
        <p>
          <strong>How good it is:</strong> before a ball is struck, these facts explain only <strong>{pct(fit.r2Before)}</strong> of why one match is longer than another. Once the sets are known, they explain{" "}
          {pct(fit.r2)}. &ldquo;Not known yet&rdquo; averages over how often matches go each number of sets.
        </p>
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
              <span className="relative px-2.5 pb-2 sm:px-3 sm:pb-2.5">
                <span className="block font-mono text-[10px] font-semibold text-white/75">{i + 1}</span>
                <span className="block font-display text-sm font-bold leading-tight sm:text-base">{p.title}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <section aria-labelledby="panel-title" key={`${books.tour}-${panel}`} className="fade-in">
        <h2 id="panel-title" className="font-display text-2xl font-bold tracking-tight">
          <span className="mr-2 font-mono text-base font-semibold text-muted">{panels.indexOf(current) + 1}</span>
          {current.title}
        </h2>
        <p className="mb-4 text-muted">{current.blurb}</p>
        {panel === "upsets" && <UpsetsPanel books={books} />}
        {panel === "ratings" && <RatingsPanel books={books} />}
        {panel === "serve" && <ServePanel books={books} />}
        {panel === "pressure" && <PressurePanel books={books} />}
        {panel === "ages" && <AgesPanel books={books} />}
        {panel === "length" && <LengthPanel books={books} />}
      </section>

      <p className="text-sm text-muted">
        Every model is fitted to {here.label.toLowerCase()}&apos;s tour-level singles from {books.from} to{" "}
        {new Date(`${books.last}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}, team cups and the Olympics included, and rebuilt as new matches come in. Intervals are 95%.
        Models describe the past; none of this is a betting tip.
      </p>
    </div>
  );
}
