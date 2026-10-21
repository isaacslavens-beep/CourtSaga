import Image from "next/image";
import { Hero } from "./hero";
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
    verb: "Write",
    title: "Log a match",
    body: "Every match you log is a page in your diary. Rate it, say who you were backing, and add a few words if you like.",
    hint: "Pick any match below and change the answers.",
  },
  {
    id: "rank",
    demo: <RankDemo />,
    verb: "Sort",
    title: "Rank your favourites",
    body: "Your best matches at each tournament, in your own order.",
    hint: "Pick a tournament, then drag the matches around.",
  },
  {
    id: "story",
    demo: <StoryDemo />,
    verb: "Read back",
    title: "Explore your saga",
    body: "Your diary, read back to you. It builds itself from the matches you log: your rivalries, your five-setters, the calls you got right, and the meetings you missed.",
    hint: "Pick a rivalry or a collection, then turn the pages.",
    stage: true,
  },
];

// Every photo on the page and where it's from, in the order they appear
const photoCredits = [
  ["Rybakina, US Open 2026", "Just Women's Sports"],
  ["Alcaraz, Australian Open 2026", "ATP Tour"],
  ["Sinner with the Wimbledon trophy, 2025", "Olympics.com"],
  ["Alcaraz and Djokovic, Australian Open 2026", "Olympics.com"],
  ["Rybakina with the US Open trophy, 2026", "The Guardian"],
  ["Sinner at Wimbledon, 2025", "ATP Tour"],
  ["Nadal and Federer, Australian Open 2009", "Tennis365"],
  ["Nadal, Australian Open 2022", "Axios"],
  ["Alcaraz with the Roland Garros trophy, 2025", "Britwatch Sports"],
  ["Djokovic, US Open 2015", "Sky Sports"],
  ["Djokovic on Centre Court", "Reuters"],
];

const DownArrow = ({ className }: { className: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden className={`fill-none stroke-current ${className}`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v10M4 9l4 4 4-4" />
  </svg>
);

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SmoothAnchors />
      {/* One sample log behind the hero's card and all three steps */}
      <LogProvider>
        <Hero />

        <main className="flex-1">
          {/* One section per step, all sharing one log */}
          {steps.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              className={"stage" in s ? "stage py-32" : `border-t border-line py-20 ${i % 2 ? "bg-surface/60" : ""}`}
            >
              <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
                <div className="max-w-2xl">
                  {/* The diary's three parts: write it, sort it, read it back */}
                  <p className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-court font-bold text-court-ink">{i + 1}</span>
                    <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{s.verb}</span>
                  </p>
                  <h2 id={`${s.id}-title`} className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                    {s.title}
                  </h2>
                  <p className="mt-4 text-xl font-medium leading-relaxed text-muted">{s.body}</p>
                  <p className="mt-4 inline-flex items-center gap-2 text-lg font-semibold text-court">
                    <DownArrow className="h-4 w-4 shrink-0 stroke-2 motion-safe:animate-bounce" />
                    {s.hint}
                  </p>
                </div>
                <div className="mt-10">{s.demo}</div>
              </div>
            </section>
          ))}

          {/* Closing banner */}
          <section className="pb-16 pt-8">
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
              CourtSaga is free, and arrives before the 2027 season begins.
            </p>
          </section>
        </main>

        {/* Photo credits, quietly at the very end */}
        <footer className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-8">
            <span className="font-semibold">Photos:</span>{" "}
            {photoCredits.map(([photo, source], i) => (
              <span key={photo}>
                {photo} ({source}){i < photoCredits.length - 1 && " · "}
              </span>
            ))}
          </p>
        </footer>
      </LogProvider>
    </div>
  );
}
