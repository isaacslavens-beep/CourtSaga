import Link from "next/link";
import type { ReactNode } from "react";
import { recordBooks } from "@/lib/records";
import { matchStory } from "@/lib/story";
import { rivalryRecords } from "./demos/rivalry-records";
import { sampleEntries, sampleMatches, sampleOrder } from "./demos/sample";
import type { Board, ChapterId, RecordBooks } from "./diary/records";
import { BoardCard } from "./diary/records-ui";
import { SagaSection } from "./diary/saga";
import { LogProvider } from "./diary/store";
import { LandingExplore } from "./landing-explore";

/* The landing page's three parts, each complete on the page: three famous matches to explore, three
   record lists, and three books from a sample saga. Nothing here leads into the site; only the yellow
   buttons do, and they lead to signing up. */

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

// Each with the Statistics page's photo that fits it: the Big Three's rivalries, Djokovic's streak, Serena's seasons
const lists: { tour: "atp" | "wta"; board: string; cover: ChapterId }[] = [
  { tour: "atp", board: "most-played", cover: "rivalries" },
  { tour: "atp", board: "win-streaks", cover: "streaks" },
  { tour: "wta", board: "season-pct", cover: "matches" },
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

/* ---------- Saga: three books from a sample fan's saga ---------- */

export function SagaTaste() {
  return (
    <LogProvider mode="shared" matches={sampleMatches} entries={sampleEntries} order={sampleOrder} records={rivalryRecords}>
      <SagaSection only={["Alcaraz-Sinner", "Alcaraz-Djokovic", "finals"]} />
    </LogProvider>
  );
}
