import Link from "next/link";
import type { ReactNode } from "react";
import { STIX_Two_Text } from "next/font/google";
import { advancedModels } from "@/lib/models";
import { recordBooks } from "@/lib/records";
import { matchStory } from "@/lib/story";
import nadalPhoto from "@/public/photos/landing/nadal-backhand-clay.jpg";
import federerPhoto from "@/public/photos/landing/federer-australian-open-tears.jpg";
import sabalenkaPhoto from "@/public/photos/landing/sabalenka-ready-to-serve.jpg";
import { rivalryRecords } from "./demos/rivalry-records";
import { sampleEntries, sampleMatches, sampleOrder } from "./demos/sample";
import type { AdvancedBooks } from "./diary/models";
import { PressurePanel, type PressureBooks } from "./diary/models-ui";
import type { Board, RecordBooks } from "./diary/records";
import { BoardCard, type Cover } from "./diary/records-ui";
import { SagaSection } from "./diary/saga";
import { LogProvider } from "./diary/store";
import { LandingExplore } from "./landing-explore";

/* The landing page's four parts, each complete on the page: three famous matches to explore, three
   record lists, Advanced's Under pressure, and three books from a sample saga. Nothing here leads into
   the site; only the yellow buttons do, and they lead to signing up. */

/** The yellow button at the foot of a part: sign up for the rest */
export function SignUpLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-ball px-6 py-3 font-display text-lg font-bold text-[#0b0d12] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl">
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

/* ---------- Explore: three matches everyone knows ---------- */

const famous = [
  { id: "atp_2008-540_F_N409_F324", label: "Nadal v Federer, Wimbledon 2008" },
  { id: "atp_2012-580_F_D643_N409", label: "Djokovic v Nadal, Australian Open 2012" },
  { id: "atp_2025-520_F_A0E2_S0AG", label: "Alcaraz v Sinner, Roland Garros 2025" },
];

export async function ExploreTaste() {
  // A build without the database still builds: the part says the data isn't available
  const story = await matchStory(famous[0].id).catch(() => null);
  return <LandingExplore initial={story} choices={famous} />;
}

/* ---------- Statistics: three lists ---------- */

// Lists people won't find elsewhere, each with a photo of its own: head-to-heads turned around, sets won in a
// row, and the lowest-ranked players to beat the No. 1
const lists: { tour: "atp" | "wta"; board: string; cover: Cover }[] = [
  { tour: "atp", board: "turnarounds", cover: { src: nadalPhoto, alt: "Nadal winding up a backhand on clay, his shadow long across the court", position: "object-[62%_22%]" } },
  { tour: "atp", board: "set-streaks", cover: { src: federerPhoto, alt: "Federer in tears beside the Australian Open trophy", position: "object-[50%_30%]" } },
  { tour: "wta", board: "beat-no1", cover: { src: sabalenkaPhoto, alt: "Sabalenka holding a ball, ready to serve", position: "object-[38%_18%]" } },
];

/** One board and only the names it needs */
function alone(books: RecordBooks, board: Board): RecordBooks {
  const keys = new Set(board.views.flatMap((v) => v.rows.flatMap((r) => r.players)));
  const only = (names: Record<string, string>) => Object.fromEntries(Object.entries(names).filter(([k]) => keys.has(k)));
  return { ...books, boards: [board], names: only(books.names), full: only(books.full) };
}

export async function StatisticsTaste() {
  const [men, women] = await Promise.all([recordBooks("atp").catch(() => null), recordBooks("wta").catch(() => null)]);
  const shown = lists.flatMap(({ tour, board, cover }) => {
    const books = tour === "atp" ? men : women;
    const b = books?.boards.find((x) => x.id === board);
    return books && b ? [{ books: alone(books, b), cover }] : [];
  });
  if (!shown.length) return <p className="text-muted">The statistics aren&apos;t available right now.</p>;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      {shown.map(({ books, cover }) => (
        <BoardCard key={books.boards[0].id} board={books.boards[0]} books={books} top={3} still cover={cover} label={books.tour === "atp" ? "ATP" : "WTA"} />
      ))}
    </div>
  );
}

/* ---------- Advanced: Under pressure ---------- */

// The formula is set in the same maths face as on Advanced
const mathFace = STIX_Two_Text({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-math", preload: false });

/** Only what Under pressure needs, with the people in it numbered afresh */
function pressureOnly(b: AdvancedBooks): PressureBooks {
  const used = [...new Set([...Object.values(b.pressure).flatMap((fit) => Object.keys(fit.players).map(Number)), ...b.topTen])];
  const at = new Map(used.map((p, i) => [p, i]));
  const people = used.map((p) => b.people[p]);
  const keep = (names: Record<string, string>) => Object.fromEntries(people.map((k) => [k, names[k]]));
  const pressure = Object.fromEntries(
    Object.entries(b.pressure).map(([m, fit]) => [m, { ...fit, players: Object.fromEntries(Object.entries(fit.players).map(([p, r]) => [at.get(Number(p))!, r])) }]),
  ) as AdvancedBooks["pressure"];
  return { tour: b.tour, from: b.from, people, names: keep(b.names), full: keep(b.full), pressure, topTen: b.topTen.map((p) => at.get(p)!) };
}

export async function AdvancedTaste() {
  // The men's, which open on Shelton's break points
  const men = await advancedModels("atp").catch(() => null);
  if (!men) return <p className="text-muted">The models aren&apos;t available right now.</p>;
  return (
    <div className={mathFace.variable}>
      <PressurePanel books={pressureOnly(men)} brief />
    </div>
  );
}

/* ---------- Saga: three books from a sample fan's saga ---------- */

export function SagaTaste() {
  return (
    <LogProvider mode="shared" matches={sampleMatches} entries={sampleEntries} order={sampleOrder} records={rivalryRecords}>
      <SagaSection only={["Alcaraz-Sinner", "Alcaraz-Djokovic", "finals"]} />
    </LogProvider>
  );
}
