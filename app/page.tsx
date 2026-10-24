import { Suspense } from "react";
import { DataCredit } from "./credits";
import { Hero } from "./hero";
import { ExploreTaste, MoreLink, SagaTaste, StatisticsTaste } from "./landing";
import { SmoothAnchors } from "./smooth-anchors";
import { rivalryRecords } from "./demos/rivalry-records";
import { sampleEntries, sampleMatches, sampleOrder } from "./demos/sample";
import { LogProvider } from "./diary/store";
import { SignupBar } from "./signup-nudge";
import { StepHeading } from "./step-heading";

// The site's three parts, as on the nav: a quick taste of each, and a way into the real thing
const parts = [
  {
    id: "explore",
    verb: "Explore",
    title: "Explore any match",
    body: "The story around any match since 2003: the head-to-head, the draw, the season, and what came next.",
    taste: (
      <Suspense>
        <ExploreTaste />
      </Suspense>
    ),
    more: { href: "/explore", label: "Explore a match" },
  },
  {
    id: "statistics",
    verb: "Look up",
    title: "Look up the records",
    body: "Streaks, rivalries, title runs and seasons from every match since 2003, men's and women's.",
    taste: (
      <Suspense>
        <StatisticsTaste />
      </Suspense>
    ),
    more: { href: "/statistics", label: "See all the statistics" },
  },
  {
    id: "saga",
    verb: "Read back",
    title: "Read your saga",
    body: "Star the matches you care about, watched or not, and they become a saga of your own: your rivalries, your five-setters, your finals.",
    taste: <SagaTaste />,
    more: { href: "/signup", label: "Start your saga" },
    room: true, // the saga's own reading room, not a court
  },
];

// Every photo on the page and where it's from, in the order they appear
const photoCredits = [
  ["Rybakina, US Open 2026", "Just Women's Sports"],
  ["Alcaraz, Australian Open 2026", "ATP Tour"],
  ["Sinner at Wimbledon, 2025", "ATP Tour"],
  ["Nadal, Australian Open 2022", "Axios"],
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
            className={`border-t border-line py-12 sm:py-16 ${"room" in p ? "saga-room" : i % 2 ? "bg-surface/60" : ""}`}
          >
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
              <StepHeading n={i + 1} verb={p.verb} title={p.title} body={p.body} id={`${p.id}-title`} compact />
              <div className="mt-8">{p.taste}</div>
              <div className="mt-8">
                <MoreLink href={p.more.href}>{p.more.label}</MoreLink>
              </div>
            </div>
          </section>
        ))}
      </main>

      {/* Credits for the photos and the match data, quietly at the very end */}
      {/* Room under the credits for the sign-up bar floating over the page's foot */}
      <footer className="border-t border-line pb-16">
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
