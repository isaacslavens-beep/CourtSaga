import type { CSSProperties, ReactNode } from "react";
import { TennisBall } from "./diary/fun";

/* A page's heading, and beside it (below it on a phone) a court seen from above, drawn to scale in its
   surround. Colours and surface come from the court class on an ancestor, e.g. .court-wimbledon. */

// A doubles court, in centimetres: 23.77 m long, 10.97 m wide, with 1.37 m alleys and the service lines
// 6.40 m from the net. The net posts stand 0.914 m outside the doubles sidelines.
const LENGTH = 2377;
const WIDTH = 1097;
const ALLEY = 137;
const NET = LENGTH / 2;
const SERVICE = 640;
const POST = 91.4;

/** The court from above: lines, net and posts in white over the surface, a ball waiting by the T. */
function Court() {
  const lines = [
    `M0 0H${LENGTH}V${WIDTH}H0Z`, // doubles sidelines and baselines
    `M0 ${ALLEY}H${LENGTH}M0 ${WIDTH - ALLEY}H${LENGTH}`, // singles sidelines
    `M${NET - SERVICE} ${ALLEY}V${WIDTH - ALLEY}M${NET + SERVICE} ${ALLEY}V${WIDTH - ALLEY}`, // service lines
    `M${NET - SERVICE} ${WIDTH / 2}H${NET + SERVICE}`, // centre service line
    `M0 ${WIDTH / 2}H30M${LENGTH - 30} ${WIDTH / 2}H${LENGTH}`, // centre marks
  ];
  return (
    <div aria-hidden className="relative py-[5%]">
      <div className="court-surface relative aspect-[2377/1097] bg-[var(--hc-court)] shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">
        <svg viewBox={`0 0 ${LENGTH} ${WIDTH}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <path d={lines.join("")} fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          {/* The net: its mesh, the white tape, and a post at each end */}
          <line x1={NET} x2={NET} y1={-POST} y2={WIDTH + POST} stroke="rgb(0 0 0 / 0.3)" strokeWidth="7" vectorEffect="non-scaling-stroke" />
          <line x1={NET} x2={NET} y1={-POST} y2={WIDTH + POST} stroke="white" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {[0, 1].map((end) => (
          <span
            key={end}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c1a2b] ring-2 ring-white/80"
            style={{ left: "50%", top: `${((end ? WIDTH + POST : -POST) / WIDTH) * 100}%` }}
          />
        ))}
        {/* A ball by the T, in the deuce court */}
        <span className="bob absolute left-[34%] top-[30%]" style={{ "--tilt": "0deg", "--dur": "3.2s" } as CSSProperties}>
          <span className="absolute -bottom-1 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full bg-black/30 blur-[2px]" />
          <TennisBall filled className="relative h-5 w-5 drop-shadow sm:h-6 sm:w-6" />
        </span>
      </div>
    </div>
  );
}

export function CourtBand({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className="court-surround bg-[var(--hc-surround)] text-white">
      <div
        className={`mx-auto grid max-w-6xl items-center gap-x-14 gap-y-6 px-4 sm:px-8 ${
          compact ? "py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]" : "pb-10 pt-8 sm:pb-12 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]"
        }`}
      >
        <div>{children}</div>
        {/* A compact band keeps its court small, and leaves it out on a phone */}
        <div className={compact ? "w-full max-lg:hidden" : "w-full max-w-sm max-lg:mx-auto lg:max-w-none"}>
          <Court />
        </div>
      </div>
    </div>
  );
}
