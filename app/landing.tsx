import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { recordBooks } from "@/lib/records";
import { matchStory } from "@/lib/story";
import nadalAo2022Final from "@/public/photos/nadal-ao-2022-final.jpg";
import nadalFedererAo2009Final from "@/public/photos/nadal-federer-ao-2009-final.jpg";
import sinnerWimbledon2025 from "@/public/photos/sinner-wimbledon-2025.jpg";
import { Avatar, CourtArt } from "./diary/fun";
import { roundName, scoreText } from "./diary/library";
import type { RecordBooks } from "./diary/records";
import { SlamLogo } from "./match-ui";

/* The landing page's three parts, each a quick taste rather than a demo: three famous matches from
   Explore with the first line of their story, a handful of records from Statistics, and a few saga
   covers. Phones get even less of each. Everything links into the real pages. */

/** A link to the rest, at the foot of a part */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-ball px-6 py-3 font-display text-lg font-bold text-[#0b0d12] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl">
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

/* ---------- Explore: three matches everyone knows ---------- */

const famous = ["atp_2008-540_F_N409_F324", "atp_2012-580_F_D643_N409", "atp_2025-520_F_A0E2_S0AG"];

export async function ExploreTaste() {
  // A build without the database still builds: the part just links to Explore
  const stories = (await Promise.all(famous.map((id) => matchStory(id).catch(() => null)))).filter((s) => s !== null);
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {stories.map((story, i) => {
        const lede = story.lede[0]?.parts.map((p) => (typeof p === "string" ? p : p.text)).join("");
        const [w, l] = [story.names[story.a.key], story.names[story.b.key]];
        return (
          <li key={story.id} className={i > 0 ? "max-sm:hidden" : ""}>
            <Link
              href={`/explore?m=${encodeURIComponent(story.id)}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface shadow-md ring-1 ring-line transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-court/40"
            >
              <span className="relative block h-20 overflow-hidden">
                <CourtArt surface={story.surface} className="absolute inset-0 h-full w-full scale-150" />
                <span className="absolute inset-0 bg-[#0a1220]/55" />
                <span className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2 font-semibold text-white">
                  <SlamLogo event={story.event} size="h-8 w-8" />
                  {story.event} {story.season} · {roundName(story)}
                </span>
                <span className="absolute right-3 top-3 flex -space-x-2">
                  <Avatar name={w} size="h-9 w-9 text-xs ring-2 ring-white/80" />
                  <Avatar name={l} size="h-9 w-9 text-xs ring-2 ring-white/80" />
                </span>
              </span>
              <span className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
                <span className="text-sm text-muted">
                  <span className="font-semibold text-foreground">{w}</span> beat {l} <span className="whitespace-nowrap font-mono text-xs">{scoreText(story.score)}</span>
                </span>
                {lede && <span className="font-display text-lg font-bold leading-snug">{lede}.</span>}
                <span className="mt-auto pt-2 text-sm font-semibold text-court">
                  The story around it <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Statistics: the records people know, and a few they don't ---------- */

type Tile = { tour: "atp" | "wta"; board: string; view?: string; players: string[]; caption: (names: Record<string, string>, note: string, players: string[]) => string; chapter: string; trim?: boolean };

const tiles: Tile[] = [
  { tour: "atp", board: "win-streaks", players: ["atp:D643"], caption: (n) => `${n["atp:D643"]}'s winning streak`, chapter: "streaks" },
  { tour: "atp", board: "event-titles", players: ["atp:N409"], caption: (n, note) => `${n["atp:N409"]}'s titles at ${note.split(" · ")[0]}`, chapter: "events", trim: true },
  { tour: "atp", board: "surface-streaks", view: "grass", players: ["atp:F324"], caption: (n) => `${n["atp:F324"]}'s wins in a row on grass`, chapter: "streaks" },
  { tour: "wta", board: "season-pct", players: ["wta:200033"], caption: (n, note) => `${n["wta:200033"]} in ${note.split(" · ")[0]}`, chapter: "seasons", trim: true },
  { tour: "atp", board: "never-beaten", players: ["atp:D643"], caption: (n, _, [a, b]) => `${n[a]} v ${n[b]}: never beaten`, chapter: "rivalries" },
  { tour: "atp", board: "final-pairs", players: ["atp:A0E2", "atp:S0AG"], caption: (n) => `Finals between ${n["atp:A0E2"]} and ${n["atp:S0AG"]}`, chapter: "rivalries" },
];

function tileOf(t: Tile, books: RecordBooks | null) {
  const board = books?.boards.find((b) => b.id === t.board);
  const view = board?.views.find((v) => (t.view ? v.id === t.view : true));
  const row = view?.rows.find((r) => t.players.every((k) => r.players.includes(k)));
  if (!books || !row) return null;
  const names = books.names;
  // A note that starts with what the caption already says drops it
  const note = t.trim ? row.note.split(" · ").slice(1).join(" · ") : row.note;
  return { ...t, row, caption: t.caption(names, row.note, row.players), note, names };
}

export async function StatisticsTaste() {
  const [men, women] = await Promise.all([recordBooks("atp").catch(() => null), recordBooks("wta").catch(() => null)]);
  const shown = tiles.map((t) => tileOf(t, t.tour === "atp" ? men : women)).filter((t) => t !== null);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {shown.map((t, i) => (
        <li key={`${t.board}-${t.players.join()}`} className={i >= 4 ? "max-sm:hidden" : ""}>
          <Link
            href={`${t.tour === "atp" ? "/statistics" : "/statistics/women"}#${t.chapter}`}
            className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-1 hover:border-court hover:shadow-md sm:p-5"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">{t.row.stat}</span>
              <span className="flex shrink-0 -space-x-2">
                {t.row.players.map((k) => (
                  <Avatar key={k} name={t.names[k]} size="h-9 w-9 text-xs ring-2 ring-surface sm:h-11 sm:w-11" />
                ))}
              </span>
            </span>
            <span className="mt-2 font-semibold leading-snug">{t.caption}</span>
            <span className="mt-0.5 text-sm text-muted max-sm:hidden">{t.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Saga: what a few books look like ---------- */

const covers: { kicker: string; title: string; line: string; photo: StaticImageData; alt: string; position: string; colour: string }[] = [
  {
    kicker: "A rivalry",
    title: "Sincaraz",
    line: "Every Alcaraz–Sinner match you starred, season by season",
    photo: sinnerWimbledon2025,
    alt: "Jannik Sinner stretching for a forehand on Centre Court in the 2025 Wimbledon final",
    position: "object-[60%_30%]",
    colour: "#1b3d6e",
  },
  {
    kicker: "A collection",
    title: "Five-setters",
    line: "The ones that went the distance",
    photo: nadalAo2022Final,
    alt: "Rafael Nadal roaring with both fists raised after winning the five-set 2022 Australian Open final",
    position: "object-[50%_30%]",
    colour: "#6b2238",
  },
  {
    kicker: "A collection",
    title: "Finals",
    line: "Every final you starred, in one place",
    photo: nadalFedererAo2009Final,
    alt: "Rafael Nadal with an arm around Roger Federer beside the trophy after the 2009 Australian Open final",
    position: "object-[50%_30%]",
    colour: "#7a5a12",
  },
];

export function SagaTaste() {
  return (
    <ul className="grid gap-5 sm:grid-cols-3">
      {covers.map((c, i) => (
        <li key={c.title} className={`${i > 0 ? "max-sm:hidden" : ""} ${["sm:-rotate-2", "sm:rotate-1 sm:mt-4", "sm:-rotate-1"][i]}`}>
          <div className="overflow-hidden rounded-2xl shadow-xl shadow-black/20 ring-1 ring-black/10">
            <div className="relative aspect-[4/3]">
              <Image src={c.photo} alt={c.alt} fill placeholder="blur" sizes="(min-width: 640px) 22rem, 90vw" className={`object-cover ${c.position}`} />
            </div>
            <div className="px-5 py-4 text-white" style={{ background: c.colour }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">{c.kicker}</p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight">{c.title}</p>
              <p className="mt-1 text-sm text-white/85">{c.line}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
