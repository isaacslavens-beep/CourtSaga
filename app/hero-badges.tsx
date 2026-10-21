import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import australianOpen from "@/public/slams/australian-open.png";
import olympics from "@/public/slams/olympics.png";
import rolandGarros from "@/public/slams/roland-garros.png";
import usOpen from "@/public/slams/us-open.png";
import wimbledon from "@/public/slams/wimbledon.png";

/* The season around the court: the Olympics top and centre with the Slams either side of it, bobbing
   each on its own beat, and the other big events' cities running along the top of the court like a
   ticker, in calendar order. (The Masters' logos are in public/masters, for later.) */

type Badge = { name: string; logo: StaticImageData };

const topRow: Badge[] = [
  { name: "Australian Open", logo: australianOpen },
  { name: "Roland Garros", logo: rolandGarros },
  { name: "Olympics", logo: olympics },
  { name: "Wimbledon", logo: wimbledon },
  { name: "US Open", logo: usOpen },
];
// The big events beyond the Slams, by city, through the season. Canada's alternates between Toronto
// and Montreal, so it gets both.
const cities = [
  ["🇶🇦", "Doha"],
  ["🇦🇪", "Dubai"],
  ["🇺🇸", "Indian Wells"],
  ["🇺🇸", "Miami"],
  ["🇲🇨", "Monte-Carlo"],
  ["🇪🇸", "Madrid"],
  ["🇮🇹", "Rome"],
  ["🇨🇦", "Toronto / Montreal"],
  ["🇺🇸", "Cincinnati"],
  ["🇨🇳", "Shanghai"],
  ["🇨🇳", "Wuhan"],
  ["🇫🇷", "Paris"],
  ["🇮🇹", "Turin"],
];

// Each its own tilt, pace and starting point, so they never bob in step
const beat = (i: number) =>
  ({
    "--tilt": `${i % 2 ? 3 : -3}deg`,
    "--dur": `${5.5 + (i % 4) * 0.6}s`,
    "--d": `${-i * 1.3}s`,
  }) as CSSProperties;

function Tile({ badge, i, size }: { badge: Badge; i: number; size: string }) {
  return (
    <span
      title={badge.name}
      style={beat(i)}
      className={`bob pointer-events-auto flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-lg shadow-black/30 ring-1 ring-black/10 transition-[scale] duration-300 hover:scale-110 ${size}`}
    >
      <Image src={badge.logo} alt="" sizes="96px" className="h-full w-full object-contain" />
    </span>
  );
}

/**
 * The cities, running right to left along the top of the court for a glance while you read. The list is
 * drawn twice so the loop is seamless; it stops under the pointer, and stands still for anyone who
 * prefers less motion. On wide screens it fills the alley; on a phone it runs just inside the baseline.
 */
export function CityTicker() {
  const run = (copy: number) =>
    cities.map(([flag, name]) => (
      <span key={`${copy}-${name}`} className="flex items-center whitespace-nowrap pr-7 text-sm font-medium text-white lg:text-[0.95rem]">
        <span aria-hidden className="mr-1.5">{flag}</span>
        {name}
        <span aria-hidden className="ml-7 h-1 w-1 rounded-full bg-ball/80" />
      </span>
    ));
  return (
    <div
      aria-hidden
      className="ticker-track fade-in absolute z-[2] flex items-center overflow-hidden max-lg:inset-x-[calc(var(--hc-alley)+3px)] max-lg:top-4 max-lg:h-7 lg:inset-x-0 lg:top-0 lg:h-[var(--hc-alley)] lg:pr-3"
    >
      <div className="ticker flex w-max">
        {run(0)}
        {run(1)}
      </div>
    </div>
  );
}

const tileSize = (b: Badge, phone = false) =>
  b.name === "Olympics"
    ? phone
      ? "h-9 w-[3.4rem]"
      : "h-10 w-[3.75rem] lg:h-12 lg:w-[4.5rem]"
    : phone
      ? "h-9 w-9"
      : "h-10 w-10 lg:h-12 lg:w-12";

/** On a phone the header has no room for the Slams, so they get a row of their own between it and the court */
export function PhoneSlams() {
  return (
    <div aria-hidden className="fade-in relative flex justify-center gap-3 pb-5 pt-1 md:hidden">
      {topRow.map((b, i) => (
        <Tile key={b.name} badge={b} i={i} size={tileSize(b, true)} />
      ))}
    </div>
  );
}

export function HeroBadges() {
  return (
    <div aria-hidden className="fade-in pointer-events-none absolute inset-0 z-10">
      {/* Top and centre, in the header's row */}
      <div className="absolute left-1/2 top-3.5 hidden -translate-x-1/2 items-center gap-2 md:flex lg:top-3 lg:gap-4">
        {topRow.map((b, i) => (
          <Tile key={b.name} badge={b} i={i} size={tileSize(b)} />
        ))}
      </div>
    </div>
  );
}
