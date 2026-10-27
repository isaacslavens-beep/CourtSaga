import Link from "next/link";
import { Chevron } from "../ui";

// The site's five parts, as on the nav: what each is for, and the way in
const parts = [
  {
    href: "/explore",
    label: "Explore",
    ask: "The story around one match?",
    body: "Find any match since 2003 and read its head-to-head, its draw, its season and what came next.",
    go: "Explore a match",
  },
  {
    href: "/statistics",
    label: "Statistics",
    ask: "Looking for a record?",
    body: "Over 70 lists from every match since 2003, men's and women's: rivalries turned around, sets won in a row, upsets of the No. 1.",
    go: "Look up the records",
  },
  {
    href: "/advanced",
    label: "Advanced",
    ask: "Into the numbers?",
    body: "Models fitted to every match, each with its formula and its sample: Elo across eras, serve, pressure and ages.",
    go: "Play with the models",
  },
  {
    href: "/saga",
    label: "Saga",
    ask: "Matches to remember?",
    body: "Star matches in Explore, rate them and note them, and read them back as books in a saga to share.",
    go: "Open the saga",
  },
  {
    href: "/quiz",
    label: "Quiz",
    ask: "Think you know your tennis?",
    body: "A new quiz every time, easy to extreme: type the champions, the years and the records, then share the score.",
    go: "Take a quiz",
  },
];

/** Home: how the site works in a line, and the five parts to pick from */
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
          <h1 className="max-w-3xl font-display text-[2.5rem] font-bold leading-[1.02] sm:text-[3.25rem]">Every tour-level match since 2003, and the story around each one.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            Everything here is open to anyone. A free account adds one thing: starring matches, which keeps them, with a rating and a note, in a saga of your own.
          </p>
        </div>
      </div>

      <section aria-label="Where to start" className="flex-1 pb-16 pt-8 sm:pt-10">
        <ol className="mx-auto grid w-full max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-5">
          {parts.map((p, i) => (
            <li key={p.href}>
              <Link href={p.href} className="panel group flex h-full flex-col p-4 transition-colors hover:border-x-foreground/45 hover:border-b-foreground/45 sm:p-5">
                <span className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <span className="step h-5 w-5 text-xs">{i + 1}</span>
                  {p.label}
                </span>
                <span className="mt-3 font-display text-[1.375rem] font-bold leading-tight">{p.ask}</span>
                <span className="mt-2 flex-1 leading-snug text-muted">{p.body}</span>
                <span className="mt-4 font-semibold text-court">
                  {p.go} <Chevron className="inline h-3 w-3 align-[-0.05em] transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
