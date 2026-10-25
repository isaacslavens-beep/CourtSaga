import Link from "next/link";
import { CityTicker, HeroBadges, PhoneSlams } from "./hero-badges";
import { HeroShowcase } from "./hero-showcase";

/* The hero is one half of a hard court seen from above: baseline on the left and net on the right (on a
   phone, baseline at the top and net at the bottom). The words sit in the backcourt, where a court has
   no lines, and the logged match sits over the service boxes. The service line and the centre line are
   edges of the layout, so they always fall around the content, never through it. The court keeps its
   colours in light and dark alike. */

// One court line; --hc-alley is the gap between the doubles and singles sidelines
const line = "pointer-events-none absolute bg-[var(--hc-line)]";

/** The net along the open edge, from above: mesh, white tape along the top, and a post at each end. */
function Net() {
  const post = "absolute h-3.5 w-3.5 rounded-full bg-[#0c1a2b] ring-2 ring-white/80";
  return (
    <div
      aria-hidden
      className="absolute z-[1] max-lg:inset-x-[-0.9rem] max-lg:bottom-[-6px] max-lg:h-3 lg:inset-y-[-0.9rem] lg:right-[-6px] lg:w-3"
    >
      <div className="net-mesh absolute inset-0 opacity-60" />
      <div className="absolute bg-white max-lg:inset-x-0 max-lg:top-1/2 max-lg:h-[3px] max-lg:-translate-y-1/2 lg:inset-y-0 lg:left-1/2 lg:w-[3px] lg:-translate-x-1/2" />
      <span className={`${post} max-lg:left-0 max-lg:top-1/2 max-lg:-translate-y-1/2 lg:left-1/2 lg:top-0 lg:-translate-x-1/2`} />
      <span className={`${post} max-lg:right-0 max-lg:top-1/2 max-lg:-translate-y-1/2 lg:bottom-0 lg:left-1/2 lg:-translate-x-1/2`} />
    </div>
  );
}

export function Hero() {
  return (
    <div className="hero-court relative isolate overflow-hidden bg-[var(--hc-surround)] text-white">
      <HeroBadges />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8 md:py-5">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="text-2xl leading-none">🎾</span>
          <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
        </Link>
        <p className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-1 text-xs leading-snug font-medium ring-1 ring-white/25 max-sm:ml-3 max-sm:max-w-48 sm:whitespace-nowrap sm:rounded-full sm:text-sm">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ball" />
          Free · Launching before 2027 Australian Open
        </p>
      </header>
      <PhoneSlams />

      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-10">
        {/* The doubles sidelines and the baseline are the court's border; the net takes the open side */}
        <section className="hero relative grid grid-cols-[minmax(0,1fr)] border-[3px] border-[var(--hc-line)] bg-[var(--hc-court)] max-lg:border-b-0 lg:grid-cols-[minmax(0,46fr)_minmax(0,54fr)] lg:border-r-0">
          {/* Singles sidelines, the length of the court */}
          <span aria-hidden className={`${line} max-lg:inset-y-0 max-lg:left-[var(--hc-alley)] max-lg:w-[3px] lg:inset-x-0 lg:top-[var(--hc-alley)] lg:h-[3px]`} />
          <span aria-hidden className={`${line} max-lg:inset-y-0 max-lg:right-[var(--hc-alley)] max-lg:w-[3px] lg:inset-x-0 lg:bottom-[var(--hc-alley)] lg:h-[3px]`} />
          <Net />
          <CityTicker />

          {/* The backcourt: nothing crosses it but the short centre mark on the baseline */}
          <div className="relative flex flex-col justify-center px-11 pb-14 pt-20 sm:px-16 lg:py-20 lg:pl-16 lg:pr-12">
            <span aria-hidden className={`${line} max-lg:left-1/2 max-lg:top-0 max-lg:h-3 max-lg:w-[3px] lg:left-0 lg:top-1/2 lg:h-[3px] lg:w-3`} />
            <h1 className="hero-title font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[3.25rem] xl:text-6xl">
              Explore and track the story of tennis.
            </h1>
            <p className="mt-6 max-w-lg text-lg font-medium leading-relaxed text-white/90 sm:text-xl">
              Explore the story behind any match, look up the records, play with the models, and star the
              matches you care about to build a saga of your own to share.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a
                href="#explore"
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-lg font-bold text-[#0b0d12] shadow-lg shadow-black/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Take a look
                <svg viewBox="0 0 16 16" aria-hidden className="h-5 w-5 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v10M4 9l4 4 4-4" />
                </svg>
              </a>
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/signup"
                className="inline-flex items-center rounded-full bg-ball px-5 py-2.5 font-bold text-[#0b0d12] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Sign up
              </Link>
              <span className="text-white/85">
                Already signed up?{" "}
                <Link href="/login" className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
                  Log in
                </Link>
              </span>
            </p>
          </div>

          {/* The service boxes: the service line along one edge, the centre service line through the middle */}
          <div className="relative flex items-center justify-center px-6 pb-16 pt-14 sm:px-16 lg:py-14 lg:pl-14 lg:pr-12">
            <span aria-hidden className={`${line} max-lg:inset-x-[var(--hc-alley)] max-lg:top-0 max-lg:h-[3px] lg:inset-y-[var(--hc-alley)] lg:left-0 lg:w-[3px]`} />
            <span
              aria-hidden
              className={`${line} max-lg:inset-y-0 max-lg:left-1/2 max-lg:w-[3px] max-lg:-translate-x-1/2 lg:inset-x-0 lg:top-1/2 lg:h-[3px] lg:-translate-y-1/2`}
            />
            <HeroShowcase />
          </div>
        </section>
      </div>
    </div>
  );
}
