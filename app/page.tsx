import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { CallMark, EyeIcon, HeadToHead, LogFact, Stars, TournamentLabel } from "./match-ui";
import { LogDemo, RankDemo, StoryDemo } from "./step-demos";
import alcarazAo from "@/public/photos/alcaraz-ao.jpg";
import alcarazAo2026Final from "@/public/photos/alcaraz-ao-2026-final.jpg";
import nadalRg2005 from "@/public/photos/nadal-rg-2005.jpg";
import sinnerWimbledon2025 from "@/public/photos/sinner-wimbledon-2025.jpg";
import djokovicUso2015 from "@/public/photos/djokovic-uso-2015.jpg";
import rybakinaUso2026 from "@/public/photos/rybakina-uso-2026.jpg";

const steps = [
  {
    demo: <LogDemo />,
    title: "Log what you watch",
    body: "Live, on TV or on a stream, rate every match you see. You can also note who you backed and what you predicted.",
  },
  {
    demo: <RankDemo />,
    title: "Rate and rank",
    body: "Pick the best matches of each rivalry, your favourites from each tournament, and the all-time classics.",
  },
  {
    demo: <StoryDemo />,
    title: "See how tennis becomes a story",
    body: "No commentary and no guesswork. Head-to-heads, streaks and the matches you watched line up, and the story is right there in the data.",
  },
];

const photos: {
  src: StaticImageData;
  alt: string;
  position: string;
  tilt: string;
}[] = [
  {
    src: alcarazAo,
    alt: "Carlos Alcaraz stretching for a backhand on the blue court at the Australian Open",
    position: "object-[58%_center]",
    tilt: "-rotate-2",
  },
  {
    src: nadalRg2005,
    alt: "Rafael Nadal fist-pumping on clay at Roland Garros in 2005",
    position: "object-[45%_center]",
    tilt: "rotate-1",
  },
  {
    src: sinnerWimbledon2025,
    alt: "Jannik Sinner stretching for a forehand on the grass at Wimbledon",
    position: "object-[52%_center]",
    tilt: "-rotate-1",
  },
  {
    src: djokovicUso2015,
    alt: "Novak Djokovic tapping his temple during the 2015 US Open final",
    position: "object-[52%_center]",
    tilt: "rotate-2",
  },
];

type LoggedMatchProps = {
  photo: StaticImageData;
  alt: string;
  photoPosition: string;
  tilt: string;
  event: string;
  rating: number;
  score: { name: string; sets: number[] }[]; // match winner first
  watchedSets: number[]; // set indexes the user saw
  prediction: { pick: string; recent: boolean[]; streak: string }; // recent: oldest first, this match last
  rivalry: { name: string; wins: number }[]; // same order as score
  watchedMeetings: [number, number]; // watched, total meetings between the two
};

const loggedMatches: LoggedMatchProps[] = [
  {
    photo: alcarazAo2026Final,
    alt: "Carlos Alcaraz lying on the court smiling after winning the 2026 Australian Open final",
    photoPosition: "object-[25%_30%]",
    tilt: "-rotate-1",
    event: "Australian Open 2026 · Final",
    rating: 4,
    score: [
      { name: "C. Alcaraz", sets: [2, 6, 6, 7] },
      { name: "N. Djokovic", sets: [6, 2, 3, 5] },
    ],
    watchedSets: [0, 1],
    prediction: { pick: "Djokovic in 4", recent: [false, true, true, true, false], streak: "Streak ends at 3" },
    rivalry: [
      { name: "Alcaraz", wins: 5 },
      { name: "Djokovic", wins: 5 },
    ],
    watchedMeetings: [7, 10],
  },
  {
    photo: rybakinaUso2026,
    alt: "Elena Rybakina on court at the 2026 US Open",
    photoPosition: "object-[50%_10%]",
    tilt: "rotate-1",
    event: "US Open 2026 · Women's final",
    rating: 5,
    score: [
      { name: "E. Rybakina", sets: [6, 5, 6] },
      { name: "A. Sabalenka", sets: [4, 7, 2] },
    ],
    watchedSets: [0, 1, 2],
    prediction: { pick: "Rybakina in 3", recent: [false, true, true, true, true], streak: "4 in a row" },
    rivalry: [
      { name: "Rybakina", wins: 8 },
      { name: "Sabalenka", wins: 10 },
    ],
    watchedMeetings: [9, 18],
  },
];

function LoggedMatch({
  photo,
  alt,
  photoPosition,
  tilt,
  event,
  rating,
  score,
  watchedSets,
  prediction,
  rivalry,
  watchedMeetings,
}: LoggedMatchProps) {
  const [winner, loser] = score;
  const scoreline = winner.sets.map((g, i) => `${g}–${loser.sets[i]}`).join(", ");
  const watched = (i: number) => watchedSets.includes(i);
  const correct = prediction.recent[prediction.recent.length - 1];

  return (
    <article className={`overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-court/10 ${tilt}`}>
      <div className="relative">
        <Image
          src={photo}
          alt={alt}
          placeholder="blur"
          loading="eager"
          sizes="(min-width: 640px) 440px, 100vw"
          className={`aspect-[2/1] w-full object-cover ${photoPosition}`}
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-[#0a1220]/85 to-transparent px-5 pb-3 pt-10 text-white sm:px-6">
          <TournamentLabel event={event} onPhoto />
          <span className="shrink-0 text-lg">
            <Stars rating={rating} filled="text-ball" empty="text-white/30" />
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <table className="w-full text-left">
          <caption className="sr-only">
            {winner.name} defeated {loser.name} {scoreline}. You watched{" "}
            {watchedSets.length === winner.sets.length
              ? "every set"
              : `sets ${watchedSets.map((i) => i + 1).join(", ")}`}
            .
          </caption>
          <thead aria-hidden>
            <tr>
              <td />
              {winner.sets.map((_, i) => (
                <td key={i} className={`w-9 rounded-t-lg pt-1 text-court ${watched(i) ? "bg-court/10" : ""}`}>
                  {watched(i) && <EyeIcon className="mx-auto h-4 w-4" />}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {score.map((p, row) => {
              const opponent = score[1 - row];
              return (
                <tr key={p.name}>
                  <th
                    scope="row"
                    className={`py-1 font-display text-lg font-semibold ${row === 0 ? "" : "text-muted"}`}
                  >
                    {p.name}
                  </th>
                  {p.sets.map((g, i) => (
                    <td
                      key={i}
                      className={`w-9 py-1 text-center font-mono text-xl tabular-nums ${
                        g > opponent.sets[i] ? "font-bold" : "text-muted"
                      } ${watched(i) ? "bg-court/10" : ""} ${watched(i) && row === 1 ? "rounded-b-lg" : ""}`}
                    >
                      {g}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <section className="rounded-2xl bg-background p-4">
            <h3 className="text-sm font-medium text-muted">Your call</h3>
            <p className="mt-2 flex items-center gap-2">
              <CallMark correct={correct} />
              <span className="font-display text-lg font-bold leading-tight">{prediction.pick}</span>
              <span className="sr-only">{correct ? "Correct" : "Missed"}</span>
            </p>
            <p className="mt-3 flex gap-1" aria-hidden>
              {prediction.recent.map((hit, i) => (
                <span key={i} className={`h-2 flex-1 rounded-full ${hit ? "bg-grass" : "bg-fault"}`} />
              ))}
            </p>
            <p className={`mt-1.5 text-sm font-semibold ${correct ? "text-grass" : "text-fault"}`}>
              {prediction.streak}
            </p>
          </section>

          <section className="rounded-2xl bg-background p-4">
            <h3 className="mb-2 text-sm font-medium text-muted">Head-to-head</h3>
            <HeadToHead left={rivalry[0]} right={rivalry[1]} />
          </section>
        </div>

        <LogFact className="mt-4">
          You&apos;ve watched{" "}
          <span className="font-semibold text-foreground">
            {watchedMeetings[0]} of {watchedMeetings[1]}
          </span>{" "}
          of their meetings
        </LogFact>
      </div>
    </article>
  );
}

const heroSteps = ["Log your matches", "Rate and rank", "See the story"];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Court edge: green surround, blue court, white line */}
      <div aria-hidden className="flex h-1.5">
        <span className="w-[12%] bg-grass" />
        <span className="flex-1 border-x-2 border-white bg-court" />
        <span className="w-[12%] bg-grass" />
      </div>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="text-2xl leading-none">🎾</span>
          <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-8 sm:pt-14">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Your tennis story gets a little deeper with{" "}
              <span className="text-court">every match you watch.</span>
            </h1>
            <ol className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-lg font-semibold">
              {heroSteps.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-court text-sm font-bold text-court-ink">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 font-medium">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ball ring-1 ring-black/10" />
              Coming for the 2027 season
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-2 md:gap-10">
            {loggedMatches.map((m) => (
              <LoggedMatch key={m.event} {...m} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8">
          <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-court text-sm font-bold text-court-ink">
                  {i + 1}
                </span>
                <h2 className="mt-3 font-display text-xl font-bold">{s.title}</h2>
                <p className="mt-1.5 text-[17px] leading-relaxed text-muted">{s.body}</p>
                <div className="mt-auto pt-5">{s.demo}</div>
              </li>
            ))}
          </ol>
        </section>

        {/* Photos */}
        <section className="overflow-hidden px-4 pb-20 pt-8 sm:px-8">
          <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {photos.map((p) => (
              <li
                key={p.alt}
                className={`rounded-md bg-white p-2 shadow-lg transition hover:rotate-0 hover:scale-[1.02] sm:p-3 ${p.tilt}`}
              >
                <Image
                  src={p.src}
                  alt={p.alt}
                  placeholder="blur"
                  sizes="(min-width: 1024px) 240px, 45vw"
                  className={`aspect-[3/4] w-full rounded-sm object-cover ${p.position}`}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-6 text-muted sm:px-8">
          <span className="flex items-center gap-2 font-display font-bold text-foreground">
            <span aria-hidden className="text-lg leading-none">🎾</span>
            CourtSaga
          </span>
          <span>courtsaga.com</span>
        </div>
      </footer>
    </div>
  );
}
