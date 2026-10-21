import Image, { type StaticImageData } from "next/image";
import { Fragment, type CSSProperties } from "react";
import australianOpen from "@/public/slams/australian-open.png";
import olympics from "@/public/slams/olympics.png";
import rolandGarros from "@/public/slams/roland-garros.png";
import usOpen from "@/public/slams/us-open.png";
import wimbledon from "@/public/slams/wimbledon.png";

/* The season around the court: the Olympics top and centre with the Slams either side of it, and the
   other big events' cities down the two sides, every row in calendar order. The Slams bob, each on its own beat; the cities keep still.
   (The Masters' logos are in public/masters, for later.) */

type Badge = { name: string; logo: StaticImageData };

const topRow: Badge[] = [
  { name: "Australian Open", logo: australianOpen },
  { name: "Roland Garros", logo: rolandGarros },
  { name: "Olympics", logo: olympics },
  { name: "Wimbledon", logo: wimbledon },
  { name: "US Open", logo: usOpen },
];
// The big events beyond the Slams, by city: the first half of the season down the left, the second half
// down the right. Canada's alternates between Toronto and Montreal, so it gets both.
const leftSide = [
  ["🇶🇦", "Doha"],
  ["🇦🇪", "Dubai"],
  ["🇺🇸", "Indian Wells"],
  ["🇺🇸", "Miami"],
  ["🇲🇨", "Monte-Carlo"],
  ["🇪🇸", "Madrid"],
  ["🇮🇹", "Rome"],
];
const rightSide = [
  ["🇨🇦", "Toronto"],
  ["🇨🇦", "Montreal"],
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

/** A city, standing still and quiet: the Slams are the ones that float */
function City({ flag, name }: { flag: string; name: string }) {
  return (
    <span className="whitespace-nowrap text-sm font-medium text-white 2xl:text-[0.95rem]">
      <span aria-hidden className="mr-1.5">{flag}</span>
      {name}
    </span>
  );
}

/** A column of cities with a short rule between each, except Toronto and Montreal: they're one event */
function Cities({ list }: { list: string[][] }) {
  return list.map(([flag, name], i) => (
    <Fragment key={name}>
      {i > 0 && name !== "Montreal" && <span aria-hidden className="h-px w-6 bg-white/35" />}
      <City flag={flag} name={name} />
    </Fragment>
  ));
}

export function HeroBadges() {
  // The green margin either side of the court: half the room left over by the court's width, plus its padding.
  // Below 1360px it's too narrow for the longer names.
  const margin = "absolute bottom-10 top-[5.5rem] hidden w-[calc((100%-72rem)/2+2.5rem)] flex-col items-center justify-center gap-2.5 min-[1360px]:flex";
  return (
    <div aria-hidden className="fade-in pointer-events-none absolute inset-0 z-10">
      {/* Top and centre, in the header's row */}
      <div className="absolute left-1/2 top-3.5 hidden -translate-x-1/2 items-center gap-2 md:flex lg:top-3 lg:gap-4">
        {topRow.map((b, i) => (
          <Tile key={b.name} badge={b} i={i} size={b.name === "Olympics" ? "h-10 w-[3.75rem] lg:h-12 lg:w-[4.5rem]" : "h-10 w-10 lg:h-12 lg:w-12"} />
        ))}
      </div>
      <div className={`${margin} left-0`}>
        <Cities list={leftSide} />
      </div>
      <div className={`${margin} right-0`}>
        <Cities list={rightSide} />
      </div>
    </div>
  );
}
