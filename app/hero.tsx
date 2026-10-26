import Link from "next/link";
import { SeasonStrip } from "./hero-badges";
import { HeroShowcase } from "./hero-showcase";
import { Logo } from "./ui";

/* The top of the landing page: the site's bar, then the line about it and two matches from a sample
   fan's log on a white band, and the season's events along its foot. */
export function Hero() {
  return (
    <div>
      <header className="bg-header text-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Logo />
          <p className="flex items-center gap-2 text-xs font-medium text-white/80 sm:text-sm">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px] bg-ball" />
            Free · Launching before 2027 Australian Open
          </p>
        </div>
      </header>

      <div className="border-b border-line bg-surface">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-x-12 gap-y-10 px-4 pb-10 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:pb-14">
          <div className="min-w-0">
            <h1 className="font-display text-[2.75rem] font-bold leading-[0.98] sm:text-[4rem] xl:text-[4.5rem]">Explore and track the story of tennis.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
              Explore the story behind any match, look up the records, play with the models, and star the matches you care about to build a saga of your own to share.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Sign up
              </Link>
              <a href="#explore" className="btn btn-secondary btn-lg">
                Take a look
                <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v10M4 9l4 4 4-4" />
                </svg>
              </a>
            </div>
            <p className="mt-4 text-muted">
              Already signed up?{" "}
              <Link href="/login" className="font-semibold text-court underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </div>
          <HeroShowcase />
        </section>
        <div className="border-t border-line bg-sunk">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
            <SeasonStrip />
          </div>
        </div>
      </div>
    </div>
  );
}
