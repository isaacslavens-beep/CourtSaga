"use client";

import Image, { type StaticImageData } from "next/image";
import alcarazAo2026Final from "@/public/photos/alcaraz-ao-2026-final.jpg";
import rybakinaUso2026 from "@/public/photos/rybakina-uso-2026.jpg";
import { Avatar, BallScore } from "./diary/fun";
import { diaryPages, monthLabel, parseSets, roundName } from "./diary/library";
import { useLog } from "./diary/store";
import { glideTo } from "./glide";
import { SlamLogo } from "./match-ui";

/* The hero's picture of the product: two matches from the sample fan's log, side by side, each a photo
   with its log entry beneath, the second set a little lower. Each goes to its part further down the
   page: Explore, or the saga. */

type Example = {
  id: string; // the match in the sample log
  photo: StaticImageData;
  alt: string;
  position: string;
  // The 4:5 frame crops each photo to the frame's height, so the photo is drawn wider than the frame (1.9×
  // for a 3:2 photo, 2.2× for 16:9). Ask for that, or the browser fetches a copy too small and stretches it.
  sizes: string;
  opensIn: "story" | "explore";
};

const examples: Example[] = [
  {
    id: "uso26w", // Rybakina beat Sabalenka, US Open 2026 women's final
    photo: rybakinaUso2026,
    alt: "Elena Rybakina on court at the 2026 US Open, racket in hand",
    position: "object-[44%_50%]",
    sizes: "(min-width: 1280px) 28rem, (min-width: 1024px) 24rem, (min-width: 640px) 28rem, 75vw",
    opensIn: "story",
  },
  {
    id: "ao26", // Alcaraz beat Djokovic, Australian Open 2026 final
    photo: alcarazAo2026Final,
    alt: "Carlos Alcaraz lying on the court, laughing, after winning the 2026 Australian Open final",
    position: "object-[18%_50%]",
    sizes: "(min-width: 1280px) 34rem, (min-width: 1024px) 28rem, (min-width: 640px) 34rem, 90vw",
    opensIn: "explore",
  },
];

/** One example: the photo, and the match as it sits in the fan's log. The whole card opens it. */
function ExampleCard({ ex, onOpen, className = "" }: { ex: Example; onOpen: () => void; className?: string }) {
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
      className={`group relative block min-w-0 flex-1 cursor-pointer overflow-hidden rounded-md border border-line bg-surface text-left text-foreground shadow-[0_18px_36px_-22px_rgb(12_23_38/0.45)] transition-colors hover:border-foreground/45 ${className}`}
    >
      <span className="relative block aspect-[4/5] overflow-hidden bg-header">
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
        <span className="flex items-baseline justify-between gap-2 text-xs text-muted">
          <span className="rounded-[3px] bg-ball/60 px-1.5 py-px font-semibold tabular-nums text-foreground">p. {page}</span>
          {monthLabel(fan.watchedDate)}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <SlamLogo event={m.event} size="h-8 w-8" />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold">{m.event}</span>
            <span className="block truncate text-xs text-muted">{roundName(m)}</span>
          </span>
        </span>
        {/* The score, from a little wider than a phone */}
        <span className="mt-2.5 hidden overflow-hidden rounded bg-header text-sm text-white sm:block">
          {[m.winner, m.loser].map((name, row) => (
            <span key={name} className={`flex items-center gap-1.5 py-1 pl-2 pr-1 ${row ? "border-t border-white/10" : ""}`}>
              {/* On the narrowest wide screens the names need the room more than the faces */}
              <Avatar name={name} size="h-7 w-7 text-[10px] lg:max-xl:hidden" />
              <span className={`min-w-0 flex-1 truncate font-display font-bold ${row ? "text-white/65" : ""}`}>{name}</span>
              {sets.map((set, i) => {
                const took = row ? set.l > set.w : set.w > set.l;
                return (
                  <span key={i} className={`stat w-5 rounded-[2px] text-center text-base ${took ? "bg-court text-white" : "font-medium text-white/55"}`}>
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
            <span className={`rounded-[3px] px-1.5 py-px text-xs font-semibold max-sm:hidden ${call.ok ? "bg-grass/15 text-grass" : "bg-fault/15 text-fault"}`}>
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
        <span className="mt-2.5 block text-sm font-semibold text-court group-hover:underline group-hover:underline-offset-4">
          {ex.opensIn === "story" ? "See a saga ↓" : "Explore a match ↓"}
        </span>
        <span className="sr-only">{ex.opensIn === "story" ? "See what a saga looks like, below" : "Explore a match, below"}</span>
      </span>
    </button>
  );
}

export function HeroShowcase() {
  const open = (ex: Example) => () => glideTo(document.getElementById(ex.opensIn === "explore" ? "explore" : "saga"), "start", 0);

  const [rybakina, alcaraz] = examples;
  return (
    <div className="mx-auto flex w-full max-w-[30rem] items-start gap-3 sm:gap-4">
      <ExampleCard ex={rybakina} onOpen={open(rybakina)} />
      <ExampleCard ex={alcaraz} onOpen={open(alcaraz)} className="mt-10" />
    </div>
  );
}
