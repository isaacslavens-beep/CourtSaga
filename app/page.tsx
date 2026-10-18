import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
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
    title: "Watch your story grow",
    body: "CourtSaga picks up on patterns, like who you cheer for and the matches you love, and turns them into your own tennis story.",
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
  watchedNote: string;
  highlight: { label: string; title: string; value: string; note: string };
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
    watchedNote: "You watched sets 1–2",
    highlight: { label: "Rivalry", title: "Djokovic vs Alcaraz", value: "5–5", note: "Tied up" },
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
    watchedNote: "You watched the whole thing",
    highlight: { label: "Your pick", title: "Rybakina in three", value: "Called it", note: "Correct" },
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
  watchedNote,
  highlight,
}: LoggedMatchProps) {
  const [winner, loser] = score;
  const scoreline = winner.sets.map((g, i) => `${g}–${loser.sets[i]}`).join(", ");

  return (
    <article className={`overflow-hidden rounded-3xl border border-line bg-surface shadow-xl ${tilt}`}>
      <Image
        src={photo}
        alt={alt}
        placeholder="blur"
        loading="eager"
        sizes="(min-width: 640px) 440px, 100vw"
        className={`aspect-[2/1] w-full object-cover ${photoPosition}`}
      />

      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold">{event}</span>
          <span className="shrink-0 text-lg text-clay" aria-label={`Rated ${rating} out of 5`}>
            {"★".repeat(rating)}
            <span className="text-line">{"★".repeat(5 - rating)}</span>
          </span>
        </div>

        <table className="mt-3 w-full text-left">
          <caption className="sr-only">
            {winner.name} defeated {loser.name} {scoreline}. {watchedNote}.
          </caption>
          <tbody>
            {score.map((p, row) => {
              const opponent = score[1 - row];
              return (
                <tr key={p.name}>
                  <th scope="row" className="py-1 font-display text-lg font-semibold">
                    {p.name}
                  </th>
                  {p.sets.map((g, i) => {
                    const wonSet = g > opponent.sets[i];
                    return (
                      <td
                        key={i}
                        className={`w-8 py-1 text-center font-mono text-xl tabular-nums ${
                          wonSet ? "font-bold" : "font-normal text-muted"
                        }`}
                      >
                        {g}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 font-medium text-muted">{watchedNote}</p>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-background px-4 py-3">
          <div>
            <p className="text-sm font-medium text-muted">{highlight.label}</p>
            <p className="font-semibold">{highlight.title}</p>
          </div>
          <p className="text-right">
            <span className="font-display text-2xl font-bold">{highlight.value}</span>
            <span className="block text-sm font-semibold text-grass">{highlight.note}</span>
          </p>
        </div>

      </div>
    </article>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
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
              <span className="text-clay">every match you watch.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Keep track of what you watch, rate the ones that stuck with you,
              and watch your own fan story take shape along the way.
            </p>
            <p className="mt-8 inline-block rounded-full bg-ball/40 px-4 py-1.5 font-medium">
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
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-clay text-sm font-bold text-clay-ink">
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
