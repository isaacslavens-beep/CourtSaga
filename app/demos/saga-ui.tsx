"use client";

// Pieces shared by the saga in step 3 and the story that plays in the hero.

import { type StaticImageData } from "next/image";
import { useState, type CSSProperties } from "react";
import alcarazAo2026Final from "@/public/photos/alcaraz-ao-2026-final.jpg";
import alcarazDjokovicAo2026 from "@/public/photos/alcaraz-djokovic-ao-2026-trophies.jpg";
import rybakinaUso2026 from "@/public/photos/rybakina-uso-2026.jpg";
import djokovicUso2015 from "@/public/photos/djokovic-uso-2015.jpg";
import federerRolandGarros from "@/public/photos/federer-roland-garros.jpg";
import nadalAo2022Final from "@/public/photos/nadal-ao-2022-final.jpg";
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
  calls: {
    src: djokovicUso2015,
    alt: "Novak Djokovic tapping his temple at the 2015 US Open final",
    position: "object-[45%_30%]",
  },
  comebacks: {
    src: federerRolandGarros,
    alt: "Roger Federer raising a finger as he celebrates on the clay at Roland Garros",
    position: "object-[50%_18%]",
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
};

/** A rivalry glows in its two players' colours; a collection in its own pair. */
export function tintsOf(id: string, players: string[]): [string, string] {
  if (!players.length) return collectionTints[id] ?? collectionTints.seasons;
  const styles = chartStyles(players);
  return [styles.get(players[0])!.color, styles.get(players[1] ?? players[0])!.color];
}

export const tintVars = ([a, b]: [string, string]) => ({ "--tint-a": a, "--tint-b": b }) as CSSProperties;

/* ---------- Marks ---------- */

const special = ["", "other", "right", "exact", "wrong"];

/** The colour of one mark: a player's, green/red for calls, grey for everyone else. "" has no side. */
function markColor(color: string, players: ReturnType<typeof chartStyles>) {
  if (color === "exact") return "var(--grass)";
  if (color === "right") return "color-mix(in srgb, var(--grass) 55%, transparent)";
  if (color === "wrong") return "var(--fault)";
  if (color === "other") return "color-mix(in srgb, var(--muted) 55%, transparent)";
  if (color === "") return "transparent";
  return players.get(color)?.color ?? "var(--muted)";
}

// A match you didn't watch is drawn hollow, in the same colour
const markStyle = (x: { color: string; watched?: boolean }, players: ReturnType<typeof chartStyles>, i: number): CSSProperties => {
  const color = markColor(x.color, players);
  const hollow = x.color === "" || x.watched === false;
  return {
    "--i": i,
    background: hollow ? "transparent" : color,
    boxShadow: hollow ? `inset 0 0 0 1.5px ${x.color === "" ? "var(--muted)" : color}` : undefined,
  } as CSSProperties;
};

const slamNames = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"];

/**
 * "The shape of it": every meeting in order, above the line for one player and below for the
 * other, bars you didn't watch faded. Collections get one row per category instead.
 * Hovering a mark swaps the caption for that match.
 */
export function ShapeChart({
  book,
  caption,
  spotId = null,
  onGroup,
  compact = false,
}: {
  book: BookData;
  caption: string;
  spotId?: string | null;
  onGroup?: (group: string) => void; // open the chapter a year's bars belong to
  compact?: boolean;
}) {
  const [hover, setHover] = useState<StripItem | null>(null);
  const groups = [...new Set(book.strip.map((x) => x.group))];
  const players = chartStyles([...new Set(book.strip.map((x) => x.color))].filter((c) => !special.includes(c)));
  const spot = (x: StripItem) => (spotId && spotId === x.logId ? "spot-tile rounded-[4px]" : "");
  const hoverProps = (x: StripItem) => ({ onMouseEnter: () => setHover(x), onMouseLeave: () => setHover(null) });
  let n = 0;

  const chart =
    book.stripMode === "rivalry" ? (
      <div className="flex items-stretch gap-3">
        <div className="flex shrink-0 flex-col justify-between pb-7" aria-hidden>
          {book.faces.slice(0, 2).map((p) => (
            <Avatar key={p} name={p} size={compact ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"} tone={players.get(p)} />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 gap-1 sm:gap-1.5">
          {groups.map((g) => {
            const items = book.strip.filter((x) => x.group === g);
            const [a, b] = book.faces;
            const wins = (p: string) => items.filter((x) => x.color === p).length;
            const bars = (
              <>
                <span className="flex w-full justify-center gap-[3px]">
                  {items.map((x) => {
                    const i = n++;
                    return (
                      <span key={x.key} className={`flex min-w-1 flex-1 flex-col ${compact ? "max-w-3" : "max-w-5"} ${spot(x)}`} {...hoverProps(x)}>
                        <span className={`flex items-end ${compact ? "h-10" : "h-20"}`}>
                          {x.side === 1 && <span className="grow block h-full w-full origin-bottom rounded-t-[4px]" style={markStyle(x, players, i)} />}
                        </span>
                        <span className={`flex items-start ${compact ? "h-10" : "h-20"}`}>
                          {x.side === -1 && <span className="grow block h-full w-full origin-top rounded-b-[4px]" style={markStyle(x, players, i)} />}
                        </span>
                      </span>
                    );
                  })}
                </span>
                <span aria-hidden className={`pointer-events-none absolute inset-x-1 h-px bg-foreground/35 ${compact ? "top-[calc(0.25rem+2.5rem)]" : "top-[calc(0.25rem+5rem)]"}`} />
                <span className="mt-1.5 text-xs font-medium tabular-nums text-muted">{g}</span>
              </>
            );
            const shared = { className: `relative flex flex-col items-center rounded-lg px-1 pt-1 pb-1 ${compact ? "min-w-8" : "min-w-10"}`, style: { flex: `${items.length} 1 0` } };
            return onGroup ? (
              <button
                key={g}
                type="button"
                onClick={() => onGroup(g)}
                aria-label={`${g}: ${a} won ${wins(a)}, ${b} won ${wins(b)}. Open the chapter.`}
                {...shared}
                className={`${shared.className} cursor-pointer transition-colors hover:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:outline-court`}
              >
                {bars}
              </button>
            ) : (
              <span key={g} {...shared}>
                {bars}
              </span>
            );
          })}
        </div>
      </div>
    ) : (
      <dl className={compact ? "space-y-2" : "space-y-3"}>
        {groups.map((g) => {
          const items = book.strip.filter((x) => x.group === g);
          const most = Math.max(...groups.map((k) => book.strip.filter((x) => x.group === k).length));
          return (
            <div key={g} className={compact ? "flex items-center gap-3" : ""}>
              <dt className={`flex items-center gap-2 text-sm font-semibold ${compact ? "w-32 shrink-0 truncate" : ""}`}>
                {slamNames.includes(g) && <SlamLogo event={g} size={compact ? "h-4 w-4" : "h-5 w-5"} />}
                <span className="truncate">{g}</span>
              </dt>
              <dd className={`flex min-w-0 flex-1 items-center gap-3 ${compact ? "" : "mt-1.5"}`}>
                <span className={`flex min-w-0 gap-[2px] ${compact ? "h-4" : "h-6"}`} style={{ width: `${(items.length / most) * 85}%` }}>
                  {items.map((x) => (
                    <span
                      key={x.key}
                      {...hoverProps(x)}
                      className={`grow-x h-full flex-1 first:rounded-l-[4px] last:rounded-r-[4px] ${spot(x)}`}
                      style={markStyle(x, players, n++)}
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

  return (
    <figure>
      {onGroup ? (
        <div role="group" aria-label={book.strip.map((x) => x.title).join("; ")}>
          {chart}
        </div>
      ) : (
        <div role="img" aria-label={book.strip.map((x) => x.title).join("; ")}>
          {chart}
        </div>
      )}
      {book.stripLegend.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {book.stripLegend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={markStyle({ color: l.color, watched: !l.faded }, players, 0)} />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      <figcaption className="mt-2 min-h-[2.5rem] text-sm text-muted sm:min-h-[1.5rem]">
        {hover ? <span className="text-foreground">{hover.title}</span> : caption}
      </figcaption>
    </figure>
  );
}

/* ---------- Story progress ---------- */

/**
 * One segment per page, filled up to the current one. With `auto`, the current segment fills over
 * `dur` ms and then calls `onDone`, so pausing the fill (a `.paused` ancestor) pauses the story too.
 */
export function Segments({
  labels,
  current,
  onPick,
  auto,
}: {
  labels: string[];
  current: number;
  onPick: (i: number) => void;
  auto?: { dur: number; onDone: () => void };
}) {
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
            {i < current && <span className="absolute inset-0 bg-foreground" />}
            {i === current &&
              (auto ? (
                <span
                  key={current}
                  className="fill absolute inset-0 bg-foreground"
                  style={{ "--dur": `${auto.dur}ms` } as CSSProperties}
                  onAnimationEnd={auto.onDone}
                />
              ) : (
                <span className="absolute inset-0 bg-foreground" />
              ))}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Style for a `.rise` piece of a slide: it rises in `i` beats after the slide appears. */
export const beat = (i: number) => ({ "--i": i }) as CSSProperties;
