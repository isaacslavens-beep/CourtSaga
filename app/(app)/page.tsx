import Image from "next/image";
import Link from "next/link";
import heroPhoto from "@/public/photos/alcaraz-nadal-paris-2024.jpg";
import { Chevron } from "../ui";
import { HomeAccount } from "./home-account";

// The site's five parts, as on the nav: what each is, in a line
const parts = [
  { href: "/explore", label: "Explore", body: "The story behind any match since 2003." },
  { href: "/statistics", label: "Statistics", body: "Records from every match: rivalries, streaks, seasons." },
  { href: "/advanced", label: "Advanced", body: "Models of eras, serving, pressure and ages." },
  { href: "/saga", label: "Saga", body: "Star the matches you've watched and read them back as books." },
  { href: "/quiz", label: "Quiz", body: "Ten questions on the big finals. Share your score." },
];

/** Home: what the site is, beside Alcaraz and Nadal at the Paris Olympics, and the five parts to pick from */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-12">
          <div>
            <h1 className="max-w-3xl font-display text-[2.5rem] font-bold leading-[1.02] sm:text-[3.25rem]">Explore, track, and interact with the story of tennis</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">Make an account to track every tennis match you have watched, and build your own personal Saga as a tennis fan.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <HomeAccount />
              <Link href="/explore" className="btn btn-secondary btn-lg">
                Explore a match
              </Link>
            </div>
          </div>
          <figure className="overflow-hidden rounded-md border border-line">
            <Image
              src={heroPhoto}
              alt="Alcaraz and Nadal clenching their fists side by side at the Paris Olympics"
              priority
              quality={90}
              sizes="(min-width: 1024px) 30rem, 100vw"
              className="aspect-[3/2] w-full object-cover object-[55%_30%]"
            />
            <figcaption className="border-t border-line bg-surface px-3 py-2 text-xs text-muted">Alcaraz and Nadal, Paris 2024</figcaption>
          </figure>
        </div>
      </div>

      <section aria-label="Where to start" className="flex-1 pb-16 pt-8 sm:pt-10">
        <ol className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-5">
          {parts.map((p, i) => (
            <li key={p.href}>
              <Link href={p.href} className="panel group flex h-full flex-col p-4 transition-colors hover:border-x-foreground/45 hover:border-b-foreground/45 sm:p-5">
                <span className="flex items-center gap-2 font-display text-[1.375rem] font-bold leading-tight">
                  <span className="step h-6 w-6 text-xs">{i + 1}</span>
                  {p.label}
                  <Chevron className="ml-auto h-3.5 w-3.5 text-court transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-2 leading-snug text-muted">{p.body}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
