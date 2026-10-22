import type { CSSProperties, ReactNode } from "react";
import { TennisBall } from "./diary/fun";
import { Net, line } from "./hero";

/* A page's heading on its court, drawn as the hero draws its own: half a court seen from above, baseline on
   the left and the net on the right (on a phone, baseline at the top and net at the bottom). The words sit
   in the backcourt and a ball waits in the service box. Colours and surface come from the court class on
   an ancestor, e.g. .court-wimbledon. */
export function CourtBand({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[var(--hc-surround)] text-white">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-3 sm:px-10 sm:pt-4">
        <div className="court-surface relative grid grid-cols-[minmax(0,1fr)] border-[3px] border-[var(--hc-line)] bg-[var(--hc-court)] max-lg:border-b-0 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:border-r-0">
          {/* Singles sidelines, the length of the court */}
          <span aria-hidden className={`${line} max-lg:inset-y-0 max-lg:left-[var(--hc-alley)] max-lg:w-[3px] lg:inset-x-0 lg:top-[var(--hc-alley)] lg:h-[3px]`} />
          <span aria-hidden className={`${line} max-lg:inset-y-0 max-lg:right-[var(--hc-alley)] max-lg:w-[3px] lg:inset-x-0 lg:bottom-[var(--hc-alley)] lg:h-[3px]`} />
          <Net />

          {/* The backcourt, with the short centre mark on the baseline */}
          <div className="relative px-11 pb-10 pt-10 sm:px-16 lg:py-14 lg:pl-16 lg:pr-12">
            <span aria-hidden className={`${line} max-lg:left-1/2 max-lg:top-0 max-lg:h-3 max-lg:w-[3px] lg:left-0 lg:top-1/2 lg:h-[3px] lg:w-3`} />
            {children}
          </div>

          {/* The service boxes: the service line along one edge, the centre service line through the middle */}
          <div aria-hidden className="relative h-24 lg:h-auto">
            <span className={`${line} max-lg:inset-x-[var(--hc-alley)] max-lg:top-0 max-lg:h-[3px] lg:inset-y-[var(--hc-alley)] lg:left-0 lg:w-[3px]`} />
            <span
              className={`${line} max-lg:inset-y-0 max-lg:left-1/2 max-lg:w-[3px] max-lg:-translate-x-1/2 lg:inset-x-0 lg:top-1/2 lg:h-[3px] lg:-translate-y-1/2`}
            />
            <span className="bob absolute left-[28%] top-[38%] lg:left-[34%] lg:top-[26%]" style={{ "--tilt": "0deg", "--dur": "3.2s" } as CSSProperties}>
              <span className="absolute -bottom-1.5 left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-black/30 blur-[2px]" />
              <TennisBall filled className="relative h-7 w-7 drop-shadow lg:h-8 lg:w-8" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
