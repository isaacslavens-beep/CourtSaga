import Image, { type StaticImageData } from "next/image";
import australianOpen from "@/public/slams/australian-open.png";
import olympics from "@/public/slams/olympics.png";
import rolandGarros from "@/public/slams/roland-garros.png";
import usOpen from "@/public/slams/us-open.png";
import wimbledon from "@/public/slams/wimbledon.png";

/* The season along the foot of the hero: the Slams and the Olympics by their logos, then the other big
   events by city, in calendar order. (The Masters' logos are in public/masters, for later.) */

type Badge = { name: string; logo: StaticImageData };

const majors: Badge[] = [
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

/** One row, scrolling sideways on a phone: the logos, a rule, then the cities, wrapping on a wide screen */
export function SeasonStrip() {
  return (
    <div aria-label="The events in the data" className="flex items-center gap-5 overflow-x-auto py-3 [scrollbar-width:none] lg:overflow-visible">
      <span className="flex shrink-0 items-center gap-2">
        {majors.map((b) => (
          <span
            key={b.name}
            title={b.name}
            className={`flex h-9 shrink-0 items-center justify-center rounded-[3px] bg-white p-1 ring-1 ring-line ${b.name === "Olympics" ? "w-[3.4rem]" : "w-9"}`}
          >
            <Image src={b.logo} alt={b.name} sizes="96px" className="h-full w-full object-contain" />
          </span>
        ))}
      </span>
      <span aria-hidden className="h-6 w-px shrink-0 bg-line-strong" />
      <ul className="flex shrink-0 items-center gap-x-4 gap-y-1 text-sm font-medium text-muted lg:min-w-0 lg:flex-1 lg:shrink lg:flex-wrap">
        {cities.map(([flag, name]) => (
          <li key={name} className="whitespace-nowrap">
            <span aria-hidden className="mr-1">
              {flag}
            </span>
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
