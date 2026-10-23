import Image from "next/image";
import { Suspense } from "react";
import { matchStory } from "@/lib/story";
import { DataCredit } from "./credits";
import { Hero } from "./hero";
import { SmoothAnchors } from "./smooth-anchors";
import { rivalryRecords } from "./demos/rivalry-records";
import { sampleEntries, sampleMatches, sampleOrder } from "./demos/sample";
import { ExploreDemo } from "./diary/explore";
import { LogSection } from "./diary/log";
import { dataToSample, sampleToData } from "./diary/media";
import { SagaSection } from "./diary/saga";
import { LogProvider } from "./diary/store";
import { SignupNudge } from "./signup-nudge";
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
    nudge: { title: "Sign up free to log any match since 2003", body: "Every page you write is saved to your own diary: ratings, who you backed, your calls and notes." },
  },
  {
    id: "explore",
    demo: (
      <Suspense>
        <ExploreStep />
      </Suspense>
    ),
    verb: "Explore",
    title: "Explore any match",
    body: "Pick a match and follow the story around it: the head-to-head, each player's season and history at the tournament, the draw, and what came next.",
    hint: "Pick a match, then follow any underlined one.",
    nudge: { title: "Sign up free to explore any tennis match", body: "Search every tour-level match since 2003, start from any Slam final, or let Surprise me pick one." },
  },
  {
    id: "story",
    demo: <SagaSection />,
    verb: "Read back",
    title: "Read your saga",
    body: "Your diary, read back to you. It builds itself from the matches you log: your rivalries, your five-setters, the calls you got right, and the meetings you missed.",
    hint: "Pick a rivalry or a collection, then turn the pages.",
    room: true, // the saga's own reading room, not a court
    nudge: { title: "Sign up free to build your own saga", body: "It writes itself from the matches you log, and you can share it with a link." },
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

// The demo's stories: real matches from the sample log
const exploreChoices = [
  { id: "wim08", label: "Wimbledon 2008 final" },
  { id: "ao12", label: "Australian Open 2012 final" },
  { id: "wim19", label: "Wimbledon 2019 final" },
  { id: "uso22", label: "Alcaraz v Sinner, US Open 2022" },
  { id: "uso26w", label: "US Open 2026 women's final" },
];

async function ExploreStep() {
  const choices = exploreChoices.map((c) => ({ ...c, id: sampleToData[c.id] }));
  // A build without the database still builds: the demo says the data isn't available
  const story = await matchStory(choices[0].id).catch(() => null);
  return <ExploreDemo initial={story} choices={choices} toData={sampleToData} toSample={dataToSample} />;
}

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
                {/* The diary's three parts: write it, explore around it, read it back */}
                <StepHeading n={i + 1} verb={s.verb} title={s.title} body={s.body} hint={s.hint} id={`${s.id}-title`} />
                <div className="mt-10">{s.demo}</div>
                <SignupNudge step={s.id} {...s.nudge} />
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
