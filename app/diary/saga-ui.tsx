"use client";

// Pieces of the saga in step 3: each book's look, its at-a-glance chart, and its page progress.

import { type StaticImageData } from "next/image";
import { useRef, useState, type CSSProperties } from "react";
import alcarazAo2026Final from "@/public/photos/alcaraz-ao-2026-final.jpg";
import alcarazDjokovicAo2026 from "@/public/photos/alcaraz-djokovic-ao-2026-trophies.jpg";
import rybakinaUso2026 from "@/public/photos/rybakina-uso-2026.jpg";
import djokovicUso2015 from "@/public/photos/djokovic-uso-2015.jpg";
import alcarazRg2025Trophy from "@/public/photos/alcaraz-rg-2025-trophy.jpg";
import nadalAo2022Final from "@/public/photos/nadal-ao-2022-final.jpg";
import nadalFedererAo2009Final from "@/public/photos/nadal-federer-ao-2009-final.jpg";
import sinnerWimbledon2025 from "@/public/photos/sinner-wimbledon-2025.jpg";
import type { BookData, StripItem } from "./books";
import { Avatar, chartStyles } from "./fun";
import { SlamLogo } from "../match-ui";

export const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/* ---------- Each book's look: two glow colours, and a photo for some ---------- */

export const coverPhotos: Record<string, { src: StaticImageData; alt: string; position: string }> = {
  "Alcaraz-Sinner": {
    src: sinnerWimbledon2025,
    alt: "Jannik Sinner stretching for a forehand on Centre Court in the 2025 Wimbledon final",
    position: "object-[60%_30%]",
  },
  "Alcaraz-Djokovic": {
    src: alcarazDjokovicAo2026,
    alt: "Carlos Alcaraz and Novak Djokovic with their trophies after the 2026 Australian Open final",
    position: "object-[50%_30%]",
  },
  "Rybakina-Sabalenka": {
    src: rybakinaUso2026,
    alt: "Elena Rybakina on court at the 2026 US Open",
    position: "object-[45%_20%]",
  },
  five: {
    src: nadalAo2022Final,
    alt: "Rafael Nadal roaring with both fists raised after winning the five-set 2022 Australian Open final",
    position: "object-[50%_30%]",
  },
  finals: {
    src: nadalFedererAo2009Final,
    alt: "Rafael Nadal with an arm around Roger Federer beside the trophy after the 2009 Australian Open final",
    position: "object-[50%_30%]",
  },
  calls: {
    src: djokovicUso2015,
    alt: "Novak Djokovic tapping his temple at the 2015 US Open final",
    position: "object-[45%_30%]",
  },
  comebacks: {
    src: alcarazRg2025Trophy,
    alt: "Carlos Alcaraz kissing the Roland Garros trophy after coming back from two sets down in the 2025 final",
    position: "object-[60%_30%]",
  },

  seasons: {
    src: alcarazAo2026Final,
    alt: "Carlos Alcaraz lying on the court smiling after winning the 2026 Australian Open final",
    position: "object-[0%_35%]",
  },
};

const collectionTints: Record<string, [string, string]> = {
  seasons: ["var(--hard)", "var(--ball)"],
  five: ["var(--p-sinner)", "var(--fault)"],
  comebacks: ["var(--grass)", "var(--ball)"],
  calls: ["var(--p-rybakina)", "var(--grass)"],
  finals: ["var(--clay)", "var(--p-rybakina)"],
};

/** A rivalry glows in its two players' colours; a collection in its own pair. */
export function tintsOf(id: string, players: string[]): [string, string] {
  if (!players.length) return collectionTints[id] ?? collectionTints.seasons;
  const styles = chartStyles(players);
  return [styles.get(players[0])!.color, styles.get(players[1] ?? players[0])!.color];
}

export const tintVars = ([a, b]: [string, string]) => ({ "--tint-a": a, "--tint-b": b }) as CSSProperties;

/* ---------- Marks ---------- */

type Tones = ReturnType<typeof chartStyles>;

const special = ["", "other", "right", "wrong"];

/** The fill of one mark: a player's colour, green/red for calls, and two greys for someone else and no side. */
function markColor(color: string, players: Tones) {
  if (color === "right") return "var(--grass)";
  if (color === "wrong") return "var(--fault)";
  if (color === "other") return "color-mix(in srgb, var(--muted) 70%, var(--surface))";
  if (color === "") return "color-mix(in srgb, var(--foreground) 22%, var(--surface))";
  return players.get(color)?.color ?? "var(--muted)";
}

/** A meeting you didn't watch is a ring in the winner's colour; one you did is a filled dot. */
function dotStyle(color: string, hollow: boolean, spot: boolean): CSSProperties {
  const ring = spot ? "0 0 0 3px var(--foreground)" : "0 0 0 2px var(--surface)";
  return {
    background: hollow ? "var(--surface)" : color,
    boxShadow: hollow ? `inset 0 0 0 2px ${color}, ${ring}` : ring,
  };
}

type Tip = { item: StripItem; x: number; y: number } | null;
// Hovering or focusing a mark shows its tooltip; `pick` (when given) opens the chapter it belongs to
type Hover = { show: (x: StripItem) => (e: { currentTarget: HTMLElement }) => void; hide: () => void; pick?: (x: StripItem) => void };

/** Everything a mark needs to answer the pointer, the keyboard and a click. */
const markProps = (x: StripItem, hover: Hover) => ({
  onMouseEnter: hover.show(x),
  onMouseLeave: hover.hide,
  onFocus: hover.show(x),
  onBlur: hover.hide,
  ...(hover.pick ? { onClick: () => hover.pick!(x), "aria-label": `${x.title}. Read its chapter.` } : { tabIndex: -1, "aria-hidden": true }),
});

/** The match under the pointer: where and when first, then what happened. */
function ChartTip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  const cut = tip.item.title.indexOf(": ");
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 w-max max-w-[15rem] -translate-x-1/2 -translate-y-full rounded-xl bg-background px-3 py-2 text-sm shadow-xl ring-1 ring-foreground/15"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <span className="block font-semibold">{cut < 0 ? tip.item.title : tip.item.title.slice(0, cut)}</span>
      {cut >= 0 && <span className="block text-muted">{tip.item.title.slice(cut + 2)}</span>}
    </div>
  );
}

const slamNames = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"];

/**
 * A rivalry at a glance: the head-to-head after every meeting, as one line that climbs when the first
 * player wins and drops when the second does. Each player's half is tinted and marked with their face;
 * each meeting is a dot in its winner's colour, hollow if it isn't in your log. Years run underneath,
 * and each year's band opens its chapter.
 */
function LeadChart({ book, players, spotId, onGroup, hover }: { book: BookData; players: Tones; spotId: string | null; onGroup?: (group: string) => void; hover: Hover }) {
  const [A, B] = book.faces;
  const n = book.strip.length;
  // The head-to-head after each meeting: +1 for every win by the first player, -1 for the second
  const leads = book.strip.reduce<number[]>((acc, x) => [...acc, (acc.at(-1) ?? 0) + x.side], []);
  const pts = book.strip.map((x, k) => ({ x, u: ((k + 0.5) / n) * 100, lead: leads[k] }));
  const top = Math.max(2, ...pts.map((p) => Math.abs(p.lead)));
  const y = (v: number) => 50 - (v / top) * 40; // % of the plot's height, with room for the dots at the edges
  const groups = [...new Set(book.strip.map((x) => x.group))].map((g) => {
    const ks = book.strip.flatMap((x, k) => (x.group === g ? [k] : []));
    const won = (p: string) => ks.filter((k) => book.strip[k].color === p).length;
    return { g, from: (ks[0] / n) * 100, to: ((ks[ks.length - 1] + 1) / n) * 100, a: won(A), b: won(B) };
  });
  const wins = (p: string) => book.strip.filter((x) => x.color === p).length;
  const tint = (p: string) => `color-mix(in srgb, ${players.get(p)?.color ?? "var(--muted)"} 10%, transparent)`;
  const last = pts[pts.length - 1];

  return (
    <div className="flex gap-3">
      <div aria-hidden className="relative w-9 shrink-0">
        <span className="absolute top-[12%]">
          <Avatar name={A} size="h-9 w-9 text-sm" tone={players.get(A)} />
        </span>
        <span className="absolute bottom-[calc(1.75rem+12%)]">
          <Avatar name={B} size="h-9 w-9 text-sm" tone={players.get(B)} />
        </span>
      </div>
      <div className="min-w-0 flex-1 pr-12">
        <div className="relative h-44 sm:h-52">
          <div aria-hidden className="absolute inset-x-0 top-0 rounded-t-xl" style={{ height: `${y(0)}%`, background: tint(A) }} />
          <div aria-hidden className="absolute inset-x-0 bottom-0 rounded-b-xl" style={{ top: `${y(0)}%`, background: tint(B) }} />
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {groups.slice(1).map((g) => (
              <line key={g.g} x1={g.from} x2={g.from} y1={0} y2={100} stroke="currentColor" strokeOpacity={0.12} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={100} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.4} vectorEffect="non-scaling-stroke" />
            <polyline
              points={[`0,${y(0)}`, ...pts.map((p) => `${p.u},${y(p.lead)}`)].join(" ")}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.75}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {onGroup &&
            groups.map((g) => (
              <button
                key={g.g}
                type="button"
                onClick={() => onGroup(g.g)}
                aria-label={`${g.g}: ${A} won ${g.a}, ${B} won ${g.b}. Open the chapter.`}
                className="absolute inset-y-0 cursor-pointer rounded-lg transition-colors hover:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:outline-court"
                style={{ left: `${g.from}%`, width: `${g.to - g.from}%` }}
              />
            ))}
          {pts.map((p, i) => (
            <button
              key={p.x.key}
              type="button"
              {...markProps(p.x, hover)}
              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition-[scale] hover:scale-125 focus-visible:outline-2 focus-visible:outline-court"
              style={{ left: `${p.u}%`, top: `${y(p.lead)}%` }}
            >
              <span
                className={`tile-in block h-3.5 w-3.5 rounded-full ${spotId && spotId === p.x.logId ? "spot-tile" : ""}`}
                style={{ animationDelay: `${i * 35}ms`, ...dotStyle(markColor(p.x.color, players), !p.x.watched, !!spotId && spotId === p.x.logId) }}
              />
            </button>
          ))}
          {/* Where it stands now, at the end of the line */}
          <span
            className="absolute left-full ml-2.5 -translate-y-1/2 whitespace-nowrap font-display text-lg font-bold"
            style={{ top: `${y(last.lead)}%` }}
          >
            {wins(A)}–{wins(B)}
          </span>
        </div>
        <div aria-hidden className="relative h-7">
          {groups.map((g) => (
            <span
              key={g.g}
              // A year with a single meeting is too narrow to label on a phone; its band still opens the chapter
              className={`absolute top-1.5 -translate-x-1/2 text-xs font-medium tabular-nums text-muted ${g.to - g.from < 9 ? "max-sm:hidden" : ""}`}
              style={{ left: `${(g.from + g.to) / 2}%` }}
            >
              <span className="sm:hidden">&rsquo;{g.g.slice(2)}</span>
              <span className="max-sm:hidden">{g.g}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A collection at a glance: one bar per row, one segment per match, the count at the tip. */
function RowsChart({ book, players, spotId, hover }: { book: BookData; players: Tones; spotId: string | null; hover: Hover }) {
  const groups = [...new Set(book.strip.map((x) => x.group))];
  const most = Math.max(...groups.map((g) => book.strip.filter((x) => x.group === g).length));
  let n = 0;
  return (
    <dl className="space-y-4 sm:space-y-3">
      {groups.map((g) => {
        const items = book.strip.filter((x) => x.group === g);
        return (
          <div key={g} className="grid gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:gap-4">
            <dt className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              {slamNames.includes(g) && <SlamLogo event={g} size="h-8 w-8" />}
              <span className="truncate">{g}</span>
            </dt>
            <dd className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-5 min-w-0 gap-[2px]" style={{ width: `${(items.length / most) * 88}%` }}>
                {items.map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    {...markProps(x, hover)}
                    className={`grow-x h-full min-w-[3px] flex-1 cursor-pointer transition-[filter] last:rounded-r-[4px] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-court ${spotId && spotId === x.logId ? "spot-tile rounded-[4px]" : ""}`}
                    style={{ "--i": n++, background: markColor(x.color, players) } as CSSProperties}
                  />
                ))}
              </span>
              <span className="text-sm font-semibold tabular-nums">{items.length}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/** The at-a-glance chart for any book, with its legend, caption and a tooltip for the match under the pointer. */
export function ShapeChart({
  book,
  caption,
  spotId = null,
  onGroup,
  onMark,
}: {
  book: BookData;
  caption: string;
  spotId?: string | null;
  onGroup?: (group: string) => void; // open the chapter a year's meetings belong to
  onMark?: (item: StripItem) => void; // open the chapter one match belongs to
}) {
  const [tip, setTip] = useState<Tip>(null);
  const fig = useRef<HTMLElement>(null);
  const players = chartStyles([...new Set(book.strip.map((x) => x.color))].filter((c) => !special.includes(c)));
  const hover: Hover = {
    show: (item) => (e) => {
      if (!fig.current) return;
      const f = fig.current.getBoundingClientRect();
      const r = e.currentTarget.getBoundingClientRect();
      // Keep the tooltip inside the chart near its edges
      const x = Math.min(Math.max(r.left + r.width / 2 - f.left, 120), f.width - 120);
      setTip({ item, x, y: r.top - f.top });
    },
    hide: () => setTip(null),
    pick: onMark,
  };
  const label = book.strip.map((x) => x.title).join("; ");

  return (
    <figure ref={fig} className="relative">
      {book.stripLegend.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {book.stripLegend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={dotStyle(markColor(l.color, players), !!l.faded && l.color === "", false)} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      <div role={onGroup || onMark ? "group" : "img"} aria-label={label}>
        {book.stripMode === "rivalry" ? (
          <LeadChart book={book} players={players} spotId={spotId} onGroup={onGroup} hover={hover} />
        ) : (
          <RowsChart book={book} players={players} spotId={spotId} hover={hover} />
        )}
      </div>
      <figcaption className="mt-3 max-w-xl text-sm text-muted">{caption}</figcaption>
      <ChartTip tip={tip} />
    </figure>
  );
}

/* ---------- Story progress ---------- */

/** One segment per page, filled up to and including the current one. */
export function Segments({ labels, current, onPick }: { labels: string[]; current: number; onPick: (i: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {labels.map((label, i) => (
        <button
          key={i}
          type="button"
          title={label}
          aria-label={`Go to ${label}`}
          aria-current={i === current ? "step" : undefined}
          onClick={() => onPick(i)}
          className="group relative h-5 min-w-0 flex-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-court"
        >
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/20 transition-colors group-hover:bg-foreground/35">
            {i <= current && <span className="absolute inset-0 bg-foreground" />}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Style for a `.rise` piece of a slide: it rises in `i` beats after the slide appears. */
export const beat = (i: number) => ({ "--i": i }) as CSSProperties;
