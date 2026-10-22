// Small visual pieces shared by the step demos.

import Image, { type StaticImageData } from "next/image";
import type { Surface as CourtSurface } from "./diary/library";
import aoLogo from "@/public/slams/australian-open.png";
import rgLogo from "@/public/slams/roland-garros.png";
import usoLogo from "@/public/slams/us-open.png";
import wimLogo from "@/public/slams/wimbledon.png";
import olympicsLogo from "@/public/slams/olympics.png";

const slamLogos: [string, StaticImageData][] = [
  ["Australian Open", aoLogo],
  ["Roland Garros", rgLogo],
  ["Wimbledon", wimLogo],
  ["US Open", usoLogo],
  ["Olympics", olympicsLogo],
];

// Masters 1000s (and Beijing, and the WTA's other 1000s) show their host country's flag instead of a logo
const mastersFlags: [string, string][] = [
  ["Doha", "🇶🇦"],
  ["Dubai", "🇦🇪"],
  ["Indian Wells", "🇺🇸"],
  ["Miami", "🇺🇸"],
  ["Monte Carlo", "🇲🇨"],
  ["Monte-Carlo", "🇲🇨"],
  ["Madrid", "🇪🇸"],
  ["Rome", "🇮🇹"],
  ["Canada", "🇨🇦"],
  ["Toronto", "🇨🇦"],
  ["Montreal", "🇨🇦"],
  ["Cincinnati", "🇺🇸"],
  ["Shanghai", "🇨🇳"],
  ["Wuhan", "🇨🇳"],
  ["Paris Masters", "🇫🇷"],
  // Not a Masters, but flagged the same way
  ["Beijing", "🇨🇳"],
];
export const mastersFlag = (event: string) => mastersFlags.find(([prefix]) => event.startsWith(prefix))?.[1] ?? null;

/** The Slam's logo on a small white tile, a Masters 1000's flag, or null for any other event. */
export function SlamLogo({ event, size = "h-7 w-7" }: { event: string; size?: string }) {
  const logo = slamLogos.find(([prefix]) => event.startsWith(prefix))?.[1];
  const flag = mastersFlag(event);
  if (flag)
    return (
      <span aria-hidden className={`inline-flex shrink-0 items-center justify-center text-[1.1em] leading-none ${size}`}>
        {flag}
      </span>
    );
  if (!logo) return null;
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-md bg-white p-0.5 shadow-sm ring-1 ring-black/10 ${size}`}>
      <Image src={logo} alt="" className="h-full w-full object-contain" sizes="112px" />
    </span>
  );
}

type Surface = CourtSurface | "olympics";

// Tournament name prefixes by surface: the Slams, the Masters 1000s, the ATP Finals and Beijing.
const surfaceByEvent: [string, Surface][] = [
  ["Olympics", "olympics"],
  ["Roland Garros", "clay"],
  ["Monte Carlo", "clay"],
  ["Madrid", "clay"],
  ["Rome", "clay"],
  ["Wimbledon", "grass"],
  ["Australian Open", "hard"],
  ["US Open", "hard"],
  ["Indian Wells", "hard"],
  ["Miami", "hard"],
  ["Canada", "hard"],
  ["Cincinnati", "hard"],
  ["Shanghai", "hard"],
  ["Paris Masters", "hard"],
  ["Beijing", "hard"],
  ["ATP Finals", "hard"],
];

// Class names are spelled out for Tailwind.
const surfaceStyles: Record<Surface, { text: string; dot: string }> = {
  clay: { text: "text-clay", dot: "bg-clay" },
  hard: { text: "text-hard", dot: "bg-hard" },
  grass: { text: "text-lawn", dot: "bg-lawn" },
  carpet: { text: "text-carpet", dot: "bg-carpet" },
  unknown: { text: "", dot: "bg-muted" },
  // The five ring colours, as a swirl rather than the rings themselves
  olympics: {
    text: "",
    dot: "bg-[conic-gradient(#0081c8,#fcb131,#000000,#00a651,#ee334e,#0081c8)]",
  },
};

/** An event name tagged with the colour of the surface it's played on. */
export function TournamentLabel({
  event,
  surface: played,
  onPhoto = false,
  wrap = false,
  className = "",
}: {
  event: string;
  surface?: CourtSurface; // the match's own surface, for events not in the list above
  onPhoto?: boolean;
  wrap?: boolean; // wrap long names instead of truncating
  className?: string;
}) {
  const surface = surfaceByEvent.find(([prefix]) => event.startsWith(prefix))?.[1] ?? played;
  const style = surface ? surfaceStyles[surface] : { text: "", dot: "bg-muted" };

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 font-semibold ${onPhoto ? "text-white" : style.text} ${className}`}>
      <SlamLogo event={event} size="h-8 w-8" /> {/* the Slams show their logo, other events a surface dot */}
      {!slamLogos.some(([prefix]) => event.startsWith(prefix)) && !mastersFlag(event) && <span aria-hidden className={`h-4 w-4 shrink-0 rounded-full ${style.dot}`} />}
      <span className={wrap ? "" : "truncate"}>{event}</span>
    </span>
  );
}

/**
 * A link to a match's highlights on YouTube. Without a checked `videoId` it opens a YouTube search
 * for them instead, so no link ever points at a video nobody has looked at.
 */
export function HighlightsLink({
  videoId,
  players,
  event,
  onPhoto = false,
  className = "",
}: {
  videoId?: string;
  players: [string, string];
  event: string; // e.g. "Wimbledon 2023 · Final"
  onPhoto?: boolean;
  className?: string;
}) {
  const search = `${players[0]} vs ${players[1]} ${event.replace(" · ", " ")} highlights`;
  return (
    <a
      href={
        videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : `https://www.youtube.com/results?search_query=${encodeURIComponent(search)}`
      }
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onPhoto
          ? "border-white/40 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 focus-visible:outline-white"
          : "border-line text-muted hover:border-court hover:text-court focus-visible:outline-court"
      } ${className}`}
    >
      <svg viewBox="0 0 12 12" aria-hidden className="h-2.5 w-2.5 fill-current">
        <path d="M3 1.5v9l7.5-4.5z" />
      </svg>
      Highlights
      <span className="sr-only">
        {" "}
        for {players[0]} vs {players[1]}, {event}, {videoId ? "on YouTube" : "searched on YouTube"} (opens in a new tab)
      </span>
    </a>
  );
}
