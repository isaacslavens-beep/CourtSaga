import { Suspense } from "react";
import { DataCredit } from "./credits";
import { Hero } from "./hero";
import { AdvancedTaste, ExploreTaste, SagaTaste, SignUpLink, StatisticsTaste } from "./landing";
import { SmoothAnchors } from "./smooth-anchors";
import { rivalryRecords } from "./demos/rivalry-records";
import { sampleEntries, sampleMatches, sampleOrder } from "./demos/sample";
import { LogProvider } from "./diary/store";
import { SignupBar } from "./signup-nudge";

// The site's four parts, as on the nav: a quick taste of each, and a way into the real thing
const parts = [
  {
    id: "explore",
    verb: "Explore",
    title: "Explore any match",
    body: "The story around any match since 2003: the head-to-head, the draw, the season, and what came next. Pick one of these three.",
    taste: (
      <Suspense>
        <ExploreTaste />
      </Suspense>
    ),
    more: "Sign up to explore any match",
  },
  {
    id: "statistics",
    verb: "Look up",
    title: "Look up the records",
    body: "Over 70 lists from every match since 2003, men's and women's, many found nowhere else: rivalries turned around, sets won in a row, the lowest-ranked players to beat the No. 1.",
    taste: (
      <Suspense>
        <StatisticsTaste />
      </Suspense>
    ),
    more: "Sign up for every list",
  },
  {
    id: "advanced",
    verb: "Analyse",
    title: "Play with the numbers",
    body: "Models fitted to every match since 2003, each with its formula and its sample. Here's one: who wins more of the big points than the rest of their play says they should. Pick any player.",
    taste: (
      <Suspense>
        <AdvancedTaste />
      </Suspense>
    ),
    more: "Sign up for every model",
  },
  {
    id: "saga",
    verb: "Read back",
    title: "Read your saga",
    body: "The matches you star become a saga of your own. Open one of these books and turn the pages.",
    taste: <SagaTaste />,
    more: "Sign up to start your saga",
    room: true, // the saga's own reading room, not a court
  },
];

// Every photo on the page and where it's from, in the order they appear
const photoCredits = [
  ["Rybakina, US Open 2026", "Just Women's Sports"],
  ["Alcaraz, Australian Open 2026", "ATP Tour"],
  ["Sinner at Wimbledon, 2025", "ATP Tour"],
  ["Alcaraz and Djokovic, Australian Open 2026", "Olympics.com"],
  ["Nadal and Federer, Australian Open 2009", "Tennis365"],
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SmoothAnchors />
      {/* The hero's two cards come from a sample fan's log */}
      <LogProvider mode="demo" matches={sampleMatches} entries={sampleEntries} order={sampleOrder} records={rivalryRecords} focusId="wim25">
        <Hero />
      </LogProvider>

      <main className="flex-1">
        {parts.map((p, i) => (
          <section
            key={p.id}
            id={p.id}
            aria-labelledby={`${p.id}-title`}
            className={`py-12 sm:py-16 ${"room" in p ? "saga-room border-t border-line" : ""}`}
          >
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
              {/* The part's number and verb on a tab hanging from a rule, as the site's sections are headed */}
              <div className="section-rule">
                <p className="section-tab">
                  <span className="step h-5 w-5 text-xs">{i + 1}</span>
                  {p.verb}
                </p>
                <h2 id={`${p.id}-title`} className="mt-5 font-display text-[2rem] font-bold leading-tight sm:text-[2.5rem]">
                  {p.title}
                </h2>
                <p className="mt-2 max-w-3xl text-lg leading-relaxed text-muted">{p.body}</p>
              </div>
              <div className="mt-8">{p.taste}</div>
              <div className="mt-8">
                <SignUpLink>{p.more}</SignUpLink>
              </div>
            </div>
          </section>
        ))}
      </main>

      {/* Credits for the photos and the match data, quietly at the very end */}
      {/* Room under the credits for the sign-up bar floating over the page's foot */}
      <footer className="border-t border-line bg-surface pb-16">
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
      <SignupBar />
    </div>
  );
}
