"use client";

import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import alcarazAo2026Final from "@/public/photos/alcaraz-ao-2026-final.jpg";
import rybakinaUso2026 from "@/public/photos/rybakina-uso-2026.jpg";
import { Avatar, BallScore, TennisBall } from "./diary/fun";
import { diaryPages, monthLabel, parseSets, roundName } from "./diary/library";
import { useLog } from "./diary/store";
import { glideTo } from "./glide";
import { SlamLogo } from "./match-ui";

/* The hero's picture of the product: two matches from the sample fan's log, side by side, each a photo
   with its log entry beneath. The cards lean towards each other so only their top corners overlap, over
   the backdrop rather than either player. Each opens its match further down the page: one in the log in
   step 1, the other in its rivalry's story in step 3. */

type Example = {
  id: string; // the match in the sample log
  photo: StaticImageData;
  alt: string;
  position: string;
  // The 4:5 frame crops each photo to the frame's height, so the photo is drawn wider than the frame (1.9×
  // for a 3:2 photo, 2.2× for 16:9). Ask for that, or the browser fetches a copy too small and stretches it.
  sizes: string;
  opensIn: "log" | "story";
};

const examples: Example[] = [
  {
    id: "uso26w", // Rybakina beat Sabalenka, US Open 2026 women's final
    photo: rybakinaUso2026,
    alt: "Elena Rybakina on court at the 2026 US Open, racket in hand",
    position: "object-[44%_50%]",
    sizes: "(min-width: 1280px) 28rem, (min-width: 1024px) 24rem, (min-width: 640px) 28rem, 75vw",
    opensIn: "log",
  },
  {
    id: "ao26", // Alcaraz beat Djokovic, Australian Open 2026 final
    photo: alcarazAo2026Final,
    alt: "Carlos Alcaraz lying on the court, laughing, after winning the 2026 Australian Open final",
    position: "object-[18%_50%]",
    sizes: "(min-width: 1280px) 34rem, (min-width: 1024px) 28rem, (min-width: 640px) 34rem, 90vw",
    opensIn: "story",
  },
];

/**
 * The opening rally: a ball comes over the net from the far side and lands on the nearer card. It starts
 * from an offset of the card itself, so it lands true at any screen size. Seen from above, its height
 * shows as size and as distance from its shadow. Hidden for anyone who prefers less motion.
 */
function Rally() {
  return (
    <span aria-hidden className="rally pointer-events-none absolute left-1/2 top-1/2 z-20">
      <span className="rally-shadow absolute -left-2.5 -top-1 h-3 w-5 rounded-full bg-black/45 blur-[2px]" />
      <span className="rally-ball absolute -left-3 -top-3 block">
        <TennisBall filled className="h-6 w-6 drop-shadow" />
      </span>
    </span>
  );
}

/** One example: the photo, and the match as it sits in the fan's log. The whole card opens it. */
function ExampleCard({ ex, onOpen, className = "", children }: { ex: Example; onOpen: () => void; className?: string; children?: ReactNode }) {
  const { matches, entries } = useLog();
  const m = matches[ex.id];
  const fan = entries[ex.id];
  const page = diaryPages(entries, matches).get(ex.id);
  const sets = parseSets(m.score);
  const pick = fan.pick;
  const call = !pick
    ? null
    : pick.winner !== m.winner
      ? { ok: false, text: `✗ Called ${pick.winner}` }
      : { ok: true, text: `✓ Called ${pick.winner}` };

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative block w-1/2 shrink-0 cursor-pointer rounded-2xl bg-surface text-left text-foreground shadow-2xl shadow-black/35 ring-1 ring-black/10 transition-[rotate,translate,box-shadow] duration-300 hover:z-30 hover:-translate-y-1.5 hover:rotate-0 hover:shadow-black/50 focus-visible:z-30 focus-visible:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ball ${className}`}
    >
      {children}
      <span className="relative block aspect-[4/5] overflow-hidden rounded-t-2xl bg-[#1d4f91]">
        <Image
          src={ex.photo}
          alt={ex.alt}
          placeholder="blur"
          loading="eager"
          fetchPriority="high"
          quality={90}
          fill
          sizes={ex.sizes}
          className={`object-cover ${ex.position}`}
        />
      </span>
      <span className="block p-3 sm:p-3.5">
        <span className="block text-xs text-muted">
          <span className="font-semibold text-foreground">Page {page}</span> · {monthLabel(fan.watchedDate)}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <SlamLogo event={m.event} size="h-9 w-9" />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold">{m.event}</span>
            <span className="block truncate text-xs text-muted">{roundName(m)}</span>
          </span>
        </span>
        {/* The score, from a little wider than a phone */}
        <span className="mt-2.5 hidden overflow-hidden rounded-lg bg-[#0a1220] text-sm text-white ring-1 ring-white/10 sm:block">
          {[m.winner, m.loser].map((name, row) => (
            <span key={name} className={`flex items-center gap-1.5 px-2 py-1 ${row ? "border-t border-white/10" : ""}`}>
              {/* On the narrowest wide screens the names need the room more than the faces */}
              <Avatar name={name} size="h-7 w-7 text-[10px] lg:max-xl:hidden" />
              <span className={`min-w-0 flex-1 truncate font-display font-bold ${row ? "text-white/65" : ""}`}>{name}</span>
              {sets.map((set, i) => {
                const took = row ? set.l > set.w : set.w > set.l;
                return (
                  <span key={i} className={`w-4 text-center font-mono tabular-nums ${took ? "font-bold" : "text-white/55"}`}>
                    {row ? set.l : set.w}
                  </span>
                );
              })}
            </span>
          ))}
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <BallScore value={fan.rating} size="xs" />
          {call && (
            <span className={`rounded-full px-2 py-px text-xs font-semibold max-sm:hidden ${call.ok ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
              {call.text}
            </span>
          )}
        </span>
        {/* The fan's words, on the page's lines */}
        {fan.note && (
          <span className="paper -mx-3 mt-2.5 hidden border-t border-line pr-3 text-sm font-medium leading-[var(--rule)] [--margin:1.25rem] [--rule:1.5rem] sm:-mx-3.5 sm:block">
            {fan.note}
          </span>
        )}
        <span className="mt-2.5 block text-sm font-semibold text-court transition group-hover:translate-y-0.5">
          {ex.opensIn === "log" ? "Open in the log ↓" : "Open in the saga ↓"}
        </span>
        <span className="sr-only">{ex.opensIn === "log" ? "Open this match in the log below" : "Open this match in its rivalry's story below"}</span>
      </span>
    </button>
  );
}

export function HeroShowcase() {
  const { setFocusId, goTo } = useLog();

  // The log opens on the match; the saga opens its rivalry at the match's chapter and glides there itself
  const open = (ex: Example) => () => {
    if (ex.opensIn === "story") return goTo("story", ex.id);
    setFocusId(ex.id);
    glideTo(document.getElementById("log"), "start", 0);
  };

  const [rybakina, alcaraz] = examples;
  return (
    // Leaning towards each other, the cards' top corners cross; the second sits a little lower and on top
    <div className="relative flex w-full max-w-[30rem] items-start">
      <ExampleCard ex={rybakina} onOpen={open(rybakina)} className="z-10 rotate-3" />
      <ExampleCard ex={alcaraz} onOpen={open(alcaraz)} className="catch z-20 mt-10 -rotate-3">
        <Rally />
      </ExampleCard>
    </div>
  );
}
