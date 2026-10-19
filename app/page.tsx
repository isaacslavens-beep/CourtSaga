import Image from "next/image";
import Link from "next/link";
import { TennisBall } from "./demos/fun";
import { LogDemo } from "./demos/log-demo";
import { LogProvider } from "./demos/log-store";
import { RankDemo } from "./demos/rank-demo";
import { StoryDemo } from "./demos/story-demo";
import alcarazAo2026Final from "@/public/photos/alcaraz-ao-2026-final.jpg";
import djokovicCentreCourt from "@/public/photos/djokovic-wimbledon-centre-court.jpg";
import rybakinaUso2026 from "@/public/photos/rybakina-uso-2026.jpg";

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
    title: "Your tennis Saga",
    body: "Your saga is automatically generated based on the matches you log. Explore the story behind the sport!",
    book: true,
  },
];

const heroSteps = ["Log", "Rank", "Story"];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
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
        <section className="hero mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-8 sm:pt-10 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pb-20">
          <div>
            <h1 className="hero-title font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Your tennis story gets more interesting with{" "}
              <span className="text-court">every match you watch.</span>
            </h1>
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
                  Start the demo
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

          <div className="relative mx-auto aspect-[5/4] w-full max-w-xl">
            <Image
              src={alcarazAo2026Final}
              alt="Carlos Alcaraz lying on the court smiling after winning the 2026 Australian Open final"
              placeholder="blur"
              loading="eager"
              // 16:9 photo filling a 4:3 frame: it needs about 1.35x the frame width
              sizes="(min-width: 1024px) 480px, 90vw"
              quality={90}
              className="absolute left-0 top-0 aspect-[4/3] w-[64%] -rotate-2 rounded-3xl object-cover object-[25%_30%] shadow-xl shadow-court/10"
            />
            <Image
              src={rybakinaUso2026}
              alt="Elena Rybakina on court at the 2026 US Open"
              placeholder="blur"
              loading="eager"
              // 3:2 photo filling a 3:4 portrait frame: it needs about 2x the frame width
              sizes="(min-width: 1024px) 560px, 95vw"
              quality={90}
              className="absolute bottom-0 right-0 aspect-[3/4] w-[45%] rotate-2 rounded-3xl object-cover object-[50%_10%] shadow-xl shadow-court/10 ring-[6px] ring-background"
            />
          </div>
        </section>

        {/* How it works: one full-screen section per step, all sharing one log */}
        <LogProvider>
          {steps.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              className={`flex min-h-screen items-center py-20 ${
                "book" in s ? "library border-t border-line" : `border-t border-line ${i % 2 ? "bg-surface/60" : ""}`
              }`}
            >
              <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
                <div className="max-w-2xl">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                      "bg-court text-court-ink"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <h2
                    id={`${s.id}-title`}
                    className={`mt-5 text-4xl font-bold tracking-tight sm:text-5xl ${"book" in s ? "font-serif font-semibold" : "font-display"}`}
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
