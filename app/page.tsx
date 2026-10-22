import Image from "next/image";
import { DataCredit } from "./credits";
import { Hero } from "./hero";
import { SmoothAnchors } from "./smooth-anchors";
import { rivalryRecords } from "./demos/rivalry-records";
import { sampleEntries, sampleMatches, sampleOrder } from "./demos/sample";
import { LogSection } from "./diary/log";
import { RankSection } from "./diary/rank";
import { SagaSection } from "./diary/saga";
import { LogProvider } from "./diary/store";
import { StepHeading } from "./step-heading";
import djokovicCentreCourt from "@/public/photos/djokovic-wimbledon-centre-court.jpg";

const steps = [
  {
    id: "log",
    demo: <LogSection />,
    verb: "Write",
    title: "Log a match",
    body: "Every match you log is a page in your diary. Rate it, say who you were backing, and add a few words if you like.",
    hint: "Pick any match below and change the answers.",
  },
  {
    id: "rank",
    demo: <RankSection />,
    verb: "Sort",
    title: "Rank your favourites",
    body: "Your best matches at each tournament, in your own order.",
    hint: "Pick a tournament, then drag the matches around.",
  },
  {
    id: "story",
    demo: <SagaSection />,
    verb: "Read back",
    title: "Explore your saga",
    body: "Your diary, read back to you. It builds itself from the matches you log: your rivalries, your five-setters, the calls you got right, and the meetings you missed.",
    hint: "Pick a rivalry or a collection, then turn the pages.",
    room: true, // the saga's own reading room, not a court
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

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SmoothAnchors />
      {/* One sample log behind the hero's card and all three steps */}
      <LogProvider mode="demo" matches={sampleMatches} entries={sampleEntries} order={sampleOrder} records={rivalryRecords} focusId="wim25">
        <Hero />

        <main className="flex-1">
          {/* One section per step, all sharing one log */}
          {steps.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-title`}
              className={"room" in s ? "saga-room border-t border-line py-24" : `border-t border-line py-20 ${i % 2 ? "bg-surface/60" : ""}`}
            >
              <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
                {/* The diary's three parts: write it, sort it, read it back */}
                <StepHeading n={i + 1} verb={s.verb} title={s.title} body={s.body} hint={s.hint} id={`${s.id}-title`} />
                <div className="mt-10">{s.demo}</div>
              </div>
            </section>
          ))}

          {/* Closing banner */}
          <section className="pb-16">
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
              CourtSaga is free, and launching before the 2027 Australian Open.
            </p>
          </section>
        </main>

        {/* Credits for the photos and the match data, quietly at the very end */}
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs leading-relaxed text-muted sm:px-8">
            <p>
              <span className="font-semibold">Photos:</span>{" "}
              {photoCredits.map(([photo, source], i) => (
                <span key={photo}>
                  {photo} ({source}){i < photoCredits.length - 1 && " · "}
                </span>
              ))}
            </p>
            <p>
              <DataCredit />
            </p>
          </div>
        </footer>
      </LogProvider>
    </div>
  );
}
