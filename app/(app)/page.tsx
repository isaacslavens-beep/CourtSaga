import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import heroPhoto from "@/public/photos/alcaraz-nadal-paris-2024.jpg";
import tournamentsPhoto from "@/public/photos/alcaraz-rg-2025-trophy.jpg";
import matchesPhoto from "@/public/photos/nadal-ao-2022-final.jpg";
import statisticsPhoto from "@/public/photos/djokovic-uso-2015.jpg";
import sagaPhoto from "@/public/photos/rybakina-uso-2026.jpg";
import { Chevron } from "../ui";
import { HomeAccount } from "./home-account";

// The site's four parts, as on the nav: what each is, in a line, under a photo
const parts: { href: string; label: string; body: string; photo: StaticImageData; alt: string; position: string; account?: boolean }[] = [
  {
    href: "/tournaments",
    label: "Tournaments",
    body: "Every Slam, Masters, tour finals and Olympic final since 2003, each with the story around it.",
    photo: tournamentsPhoto,
    alt: "Carlos Alcaraz kissing the Roland Garros trophy after the 2025 final",
    position: "object-[60%_30%]",
  },
  {
    href: "/matches",
    label: "Matches",
    body: "Every match since 2003, sorted by any statistic and filtered by player, round, surface or oddity.",
    photo: matchesPhoto,
    alt: "Rafael Nadal roaring with both fists raised after winning the five-set 2022 Australian Open final",
    position: "object-[50%_30%]",
  },
  {
    href: "/statistics",
    label: "Statistics",
    body: "Records, the top 10 at any moment, and models of eras, serving, pressure and ages.",
    photo: statisticsPhoto,
    alt: "Novak Djokovic tapping his temple at the 2015 US Open final",
    position: "object-[45%_30%]",
  },
  {
    href: "/saga",
    label: "Saga",
    body: "Star the matches you've watched and read them back as books.",
    photo: sagaPhoto,
    alt: "Elena Rybakina on court at the 2026 US Open",
    position: "object-[45%_20%]",
    account: true,
  },
];

/** Home: what the site is, beside Alcaraz and Nadal at the Paris Olympics, and the four parts to pick from */
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
              <Link href="/matches" className="btn btn-secondary btn-lg">
                Search every match
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
        <ol className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {parts.map((p, i) => (
            <li key={p.href}>
              <Link href={p.href} className="group flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-foreground/45">
                <span className="relative block aspect-[16/9] w-full">
                  <Image src={p.photo} alt={p.alt} fill placeholder="blur" sizes="(min-width: 1024px) 17rem, (min-width: 640px) 50vw, 100vw" className={`object-cover ${p.position}`} />
                </span>
                <span className="flex flex-1 flex-col border-t border-line p-4 sm:p-5">
                  <span className="flex items-center gap-2 font-display text-[1.375rem] font-bold leading-tight">
                    <span className="step h-6 w-6 text-xs">{i + 1}</span>
                    {p.label}
                    <Chevron className="ml-auto h-3.5 w-3.5 text-court transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-2 leading-snug text-muted">{p.body}</span>
                  {p.account && (
                    <span className="mt-3 self-start rounded-[3px] bg-sunk px-1.5 py-px text-xs font-bold text-muted ring-1 ring-inset ring-line">With an account</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
