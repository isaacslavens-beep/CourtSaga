"use client";

import Image, { type StaticImageData } from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import alcarazHead from "@/public/players/alcaraz.png";
import djokovicHead from "@/public/players/djokovic.png";
import federerHead from "@/public/players/federer.png";
import nadalHead from "@/public/players/nadal.png";
import rybakinaHead from "@/public/players/rybakina.png";
import sabalenkaHead from "@/public/players/sabalenka.png";
import sheltonHead from "@/public/players/shelton.png";
import sinnerHead from "@/public/players/sinner.png";
import zverevHead from "@/public/players/zverev.png";
import type { Surface } from "./library";

/* ---------- Players ---------- */

type PlayerStyle = { bg: string; border: string; soft: string; ink: string; color: string };

// Fixed slots from the validated palette. Class names are spelled out for Tailwind.
const playerStyles: Record<string, PlayerStyle> = {
  Alcaraz: { bg: "bg-p-alcaraz", border: "border-p-alcaraz", soft: "bg-p-alcaraz/15", ink: "text-white", color: "var(--p-alcaraz)" },
  Sinner: { bg: "bg-p-sinner", border: "border-p-sinner", soft: "bg-p-sinner/15", ink: "text-black", color: "var(--p-sinner)" },
  Djokovic: { bg: "bg-p-djokovic", border: "border-p-djokovic", soft: "bg-p-djokovic/15", ink: "text-black", color: "var(--p-djokovic)" },
  Rybakina: { bg: "bg-p-rybakina", border: "border-p-rybakina", soft: "bg-p-rybakina/20", ink: "text-black", color: "var(--p-rybakina)" },
};
const neutralStyle: PlayerStyle = { bg: "bg-line", border: "border-line", soft: "bg-line/50", ink: "text-foreground", color: "var(--muted)" };

export const playerStyle = (name: string | null) => (name && playerStyles[name]) || neutralStyle;

/**
 * Distinct colours for up to four players in one chart: each keeps their own colour when they have
 * one, and anyone else takes the next colour no one in the chart is using.
 */
export function chartStyles(names: string[]) {
  const taken = new Set(names.filter((n) => playerStyles[n]));
  const free = Object.keys(playerStyles).filter((n) => !taken.has(n));
  return new Map(names.map((n) => [n, playerStyles[n] ?? (free.length ? playerStyles[free.shift()!] : neutralStyle)]));
}

const headshots: Record<string, StaticImageData> = {
  Alcaraz: alcarazHead,
  Sinner: sinnerHead,
  Djokovic: djokovicHead,
  Rybakina: rybakinaHead,
  Sabalenka: sabalenkaHead,
  Federer: federerHead,
  Nadal: nadalHead,
  Shelton: sheltonHead,
  Zverev: zverevHead,
};

export const hasHeadshot = (name: string) => name in headshots;

/** A player's headshot in a circle ringed with their colour. Players without a photo get their initial. */
export function Avatar({
  name,
  size = "h-8 w-8 text-sm",
  className = "",
  tone,
}: {
  name: string;
  size?: string;
  className?: string;
  tone?: PlayerStyle; // a chart's colour for this player, when it differs from their usual one
}) {
  const s = tone ?? playerStyle(name);
  const photo = headshots[name];
  if (photo) {
    return (
      <span
        aria-hidden
        title={name}
        className={`relative inline-block shrink-0 select-none overflow-hidden rounded-full border-2 bg-surface ${s.border} ${size} ${className}`}
      >
        <Image src={photo} alt="" fill sizes="48px" className={`object-cover ${s.soft}`} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold ${s.bg} ${s.ink} ${size} ${className}`}
    >
      {name[0].toUpperCase()}
    </span>
  );
}

/* ---------- Tennis balls ---------- */

export function TennisBall({ filled, className = "h-5 w-5" }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <circle cx="12" cy="12" r="10.5" className={filled ? "fill-ball" : "fill-line"} />
      <path
        d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8"
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
        className={filled ? "stroke-white/90" : "stroke-surface/80"}
      />
    </svg>
  );
}

const ballSizes = { xs: "h-3 w-3", sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" } as const;

/** Read-only rating as tennis balls. */
export function BallScore({ value, size = "sm" }: { value: number; size?: keyof typeof ballSizes }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TennisBall key={n} filled={n <= value} className={ballSizes[size]} />
      ))}
    </span>
  );
}

/** Rate 1 to 5 with tennis balls. Hover previews; a click makes the ball bounce. */
export function BallRating({
  value,
  onChange,
  size = "md",
  nudge = false,
  nudgeDelay = "0s",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: keyof typeof ballSizes;
  nudge?: boolean; // glow to invite a first try
  nudgeDelay?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [bounce, setBounce] = useState({ n: 0, key: 0 });
  const shown = hover ?? value;

  return (
    <span
      role="group"
      aria-label={`Your rating: ${value} out of 5`}
      onMouseLeave={() => setHover(null)}
      style={nudge ? { animationDelay: nudgeDelay } : undefined}
      className={`inline-flex items-center gap-0.5 rounded-full bg-surface px-1.5 py-1 shadow-sm ring-1 ring-line transition hover:ring-ball ${
        nudge ? "nudge" : ""
      }`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          title={`Rate ${n} of 5`}
          aria-label={`Rate ${n} ball${n > 1 ? "s" : ""}`}
          aria-pressed={n <= value}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(null)}
          onClick={() => {
            onChange(n);
            setBounce((b) => ({ n, key: b.key + 1 }));
          }}
          className="cursor-pointer rounded-full p-0.5 transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-court motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-110"
        >
          <span key={bounce.n === n ? bounce.key : 0} className={`block ${bounce.n === n && bounce.key ? "ball-pop" : ""}`}>
            <TennisBall filled={n <= shown} className={ballSizes[size]} />
          </span>
        </button>
      ))}
    </span>
  );
}

/** A small celebratory burst of tennis balls. Bump `trigger` to fire it again. */
export function Burst({ trigger }: { trigger: number }) {
  if (!trigger) return null;
  const spots = [
    [-46, -30],
    [46, -30],
    [-58, 6],
    [58, 6],
    [-30, 36],
    [30, 36],
    [0, -48],
    [0, 46],
  ];
  return (
    <span key={trigger} aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {spots.map(([dx, dy], i) => (
        <span
          key={i}
          className="burst-ball absolute left-0 top-0"
          style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${i * 18}ms` } as CSSProperties}
        >
          <TennisBall filled className="h-3.5 w-3.5" />
        </span>
      ))}
    </span>
  );
}

/* ---------- Courts, for matches without a photo ---------- */

const courtFill: Record<Surface, string> = { clay: "bg-clay", hard: "bg-hard", grass: "bg-lawn", carpet: "bg-carpet", unknown: "bg-muted" };

export function CourtArt({ surface, className = "" }: { surface: Surface; className?: string }) {
  return (
    <div aria-hidden className={`relative overflow-hidden ${courtFill[surface]} ${className}`}>
      {surface === "grass" && (
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_28px,rgb(255_255_255/0.08)_28px_56px)]" />
      )}
      {surface === "clay" && (
        <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] [background-size:6px_6px]" />
      )}
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g fill="none" stroke="white" strokeOpacity="0.75" strokeWidth="2.5">
          <rect x="40" y="30" width="320" height="140" />
          <line x1="40" y1="48" x2="360" y2="48" />
          <line x1="40" y1="152" x2="360" y2="152" />
          <line x1="110" y1="48" x2="110" y2="152" />
          <line x1="290" y1="48" x2="290" y2="152" />
          <line x1="110" y1="100" x2="290" y2="100" />
        </g>
        <line x1="200" y1="22" x2="200" y2="178" stroke="white" strokeWidth="4" strokeOpacity="0.95" />
      </svg>
    </div>
  );
}

/* ---------- Icons ---------- */

function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-none stroke-current stroke-2 ${className}`}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const IconLive = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M3 9a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 0 0-4V5H3z" />
    <path d="M14 5v12" strokeDasharray="2 2.5" />
  </Icon>
);
export const IconTV = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M8 21h8M9 2l3 3 3-3" />
  </Icon>
);
export const IconStream = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect x="6" y="2" width="12" height="20" rx="2.5" />
    <path d="M10.5 9.5v5l4-2.5z" />
  </Icon>
);
export const IconHeart = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </Icon>
);
export const IconArrowUp = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);

export const watchIcons = { Live: IconLive, TV: IconTV, Stream: IconStream } as const;

/* ---------- Moving on to the next section ---------- */

/**
 * A full-width bar at the foot of a demo, coloured so it's hard to miss: the section's court colour with a
 * nudging ball, then ball yellow once you've changed something.
 */
export function NextStep({
  active,
  idle,
  done,
  onClick,
}: {
  active: boolean;
  idle: ReactNode;
  done: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center justify-between gap-4 border-t px-5 py-4 text-left font-semibold transition sm:px-8 ${
        active ? "border-ball bg-ball text-[#0b0d12] hover:brightness-105" : "border-court bg-court text-court-ink hover:brightness-110"
      }`}
    >
      <span key={active ? "done" : "idle"} className={`min-w-0 ${active ? "sticker-in" : ""}`}>
        {active ? done : idle}
      </span>
      <span
        aria-hidden
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-md shadow-black/20 transition-transform group-hover:scale-110 ${
          active ? "bg-[#0b0d12] text-ball" : "bg-ball text-[#0b0d12]"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-5 w-5 fill-none stroke-current stroke-[2.5] ${active ? "motion-safe:animate-bounce" : "nudge"}`}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3v10M4 9l4 4 4-4" />
        </svg>
      </span>
    </button>
  );
}

/* ---------- Collection symbols ---------- */

const collectionPaths: Record<string, ReactNode> = {
  // a calendar
  seasons: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h2M11.5 14h2M15.5 14h1M7.5 17h2M11.5 17h2" />
    </>
  ),
  // a five-bar tally mark
  five: <path d="M6 5v14M10 5v14M14 5v14M18 5v14M3.5 15.5 20.5 8.5" />,
  // an arrow dipping, then turning back up
  comebacks: <path d="M3 7c3 0 4 9 8 9s5-7 9-11M20 5h-4.5M20 5v4.5" />,
  // a trophy
  finals: <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z" />,
  // a bullseye
  calls: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
};

export function CollectionIcon({ id, className = "h-6 w-6" }: { id: string; className?: string }) {
  const path = collectionPaths[id];
  if (!path) return null;
  return <Icon className={className}>{path}</Icon>;
}

/** A round arrow to turn a page or scroll a strip. The forward one is filled; a disabled one hides. */
export function PageArrow({
  dir,
  label,
  disabled = false,
  nudge = false,
  onClick,
  className = "",
}: {
  dir: 1 | -1;
  label: string;
  disabled?: boolean;
  nudge?: boolean; // glow until the visitor turns a page
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`z-10 flex shrink-0 cursor-pointer items-center justify-center rounded-full shadow-xl shadow-black/40 transition-[scale,opacity] hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-0 ${
        dir > 0 ? "bg-foreground text-background" : "bg-surface text-foreground ring-1 ring-foreground/20"
      } ${nudge ? "nudge" : ""} ${className}`}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="h-1/2 w-1/2 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir > 0 ? "M6 3l5 5-5 5" : "M10 3 5 8l5 5"} />
      </svg>
    </button>
  );
}
