import Image from "next/image";
import Link from "next/link";
import { TennisBall } from "./demos/fun";
import { HeroSaga } from "./hero-saga";
import { SmoothAnchors } from "./smooth-anchors";
import { LogDemo } from "./demos/log-demo";
import { LogProvider } from "./demos/log-store";
import { RankDemo } from "./demos/rank-demo";
import { StoryDemo } from "./demos/story-demo";
import djokovicCentreCourt from "@/public/photos/djokovic-wimbledon-centre-court.jpg";

const steps = [
  {
    id: "log",
    demo: <LogDemo />,
    title: "Log a match",
    body: "Rate it, back a player, add your words.",
  },
  {
    id: "rank",
    demo: <RankDemo />,
    title: "Rank your favourites",
    body: "Your best matches at every tournament.",
  },
  {
    id: "story",
    demo: <StoryDemo />,
    title: "Read your saga",
    body: "Your saga is automatically generated based on the matches you log. Explore the story behind the sport!",
    stage: true,
  },
];

const heroSteps = ["Log", "Rank", "Story"];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SmoothAnchors />
      {/* Court edge: green surround, blue court, white line */}
      <div aria-hidden className="flex h-1.5">
        <span className="w-[12%] bg-grass" />
        <span className="flex-1 border-x-2 border-white bg-court" />
        <span className="w-[12%] bg-grass" />
      </div>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="text-2xl leading-none">🎾</span>
          <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
        </Link>
        <p className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ball ring-1 ring-black/10" />
          <span className="sm:hidden">Coming in 2027</span>
          <span className="max-sm:hidden">Coming for the 2027 season</span>
        </p>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="hero mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-8 sm:pt-10 lg:pb-20 xl:min-h-[calc(100vh-5rem)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <h1 className="hero-title font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Your tennis story gets more interesting with{" "}
              <span className="text-court">every match you watch.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-muted sm:text-xl">
              Log any match played since <span className="font-semibold text-foreground">Wimbledon 2003</span>. The more you watch, the more your
              saga has to tell: new rivalries, new chapters, new records of your own.
            </p>
            {/* The rest of the page is a working demo: say so, loudly */}
            <div className="mt-6 rounded-3xl bg-ball/25 p-5 ring-2 ring-ball">
              <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold uppercase tracking-wide">
                <TennisBall filled className="h-5 w-5" />
                Live demo
                <span className="font-medium normal-case tracking-normal text-muted">· nothing you change is saved</span>
              </p>
              <p className="mt-2 text-lg font-semibold leading-snug">
                Everything below is a working demo, built on a sample fan&apos;s log.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                <a
                  href="#log"
                  className="nudge inline-flex items-center gap-3 rounded-full bg-court px-6 py-3 text-lg font-bold text-court-ink shadow-lg shadow-court/30 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Try it out
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden
                    className="h-5 w-5 fill-none stroke-current stroke-[2.5] motion-safe:animate-bounce"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3v10M4 9l4 4 4-4" />
                  </svg>
                </a>
                <ol className="flex items-center gap-1.5 text-sm font-semibold" aria-label="Demo steps">
                  {heroSteps.map((step, i) => (
                    <li key={step} className="flex items-center gap-1.5">
                      {i > 0 && (
                        <span aria-hidden className="text-muted">
                          →
                        </span>
                      )}
                      <a href={`#${steps[i].id}`} className="flex items-center gap-1.5 transition-colors hover:text-court">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-court text-xs font-bold text-court-ink">
                          {i + 1}
                        </span>
                        {step}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Two books from the sample saga, playing themselves, just overlapping */}
          <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center md:gap-0 xl:-mr-12 xl:w-auto xl:justify-end">
            <div className="float relative z-10 w-full max-w-[22rem] -rotate-1 transition-[rotate] duration-300 hover:z-30 hover:rotate-0 md:w-[20rem]">
              <HeroSaga bookId="Alcaraz-Sinner" />
            </div>
            <div className="float relative z-20 w-full max-w-[22rem] rotate-1 transition-[rotate] duration-300 [animation-delay:-3.5s] hover:z-30 hover:rotate-0 md:-ml-2.5 md:mt-14 md:w-[20rem]">
              <HeroSaga bookId="five" head={2800} />
            </div>
          </div>
        </section>

        {/* How it works: one full-screen section per step, all sharing one log */}
        <LogProvider>
          {steps.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              className={`flex min-h-screen items-center ${
                "stage" in s ? "stage py-44" : `border-t border-line py-20 ${i % 2 ? "bg-surface/60" : ""}`
              }`}
            >
              <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
                <div className="max-w-2xl">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-court font-bold text-court-ink">
                    {i + 1}
                  </span>
                  <h2
                    id={`${s.id}-title`}
                    className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl"
                  >
                    {s.title}
                  </h2>
                  <p className="mt-4 text-xl font-medium leading-relaxed text-muted">{s.body}</p>
                  <p className="mt-4 inline-flex items-center gap-2 text-lg font-semibold text-court">
                    Give it a try
                    <svg
                      viewBox="0 0 16 16"
                      aria-hidden
                      className="h-4 w-4 fill-none stroke-current stroke-2 motion-safe:animate-bounce"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 3v10M4 9l4 4 4-4" />
                    </svg>
                  </p>
                </div>
                <div className="mt-10">{s.demo}</div>
              </div>
            </section>
          ))}
        </LogProvider>

        {/* Closing banner */}
        <section className="pb-20 pt-8">
          <Image
            src={djokovicCentreCourt}
            alt="Novak Djokovic stretching for a forehand on Centre Court at Wimbledon, his shadow long across the grass"
            placeholder="blur"
            sizes="100vw"
            quality={90}
            // Djokovic sits left of centre; keep him, racket to feet, in frame as the banner narrows
            className="aspect-[2/1] w-full object-cover object-[36%_56%] sm:aspect-[3/1] lg:aspect-[7/2]"
          />
          <p className="mx-auto mt-12 max-w-6xl text-balance px-4 text-center font-display text-2xl font-bold tracking-tight sm:px-8 sm:text-3xl">
            <span aria-hidden className="mr-3 inline-block h-3 w-3 rounded-full bg-ball align-middle ring-1 ring-black/10" />
            CourtSaga will be released before the 2027 season begins.
          </p>
        </section>
      </main>
    </div>
  );
}
