import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { bigFinals, findMatch, findMatches, latestPage, loadDiary, seasonRange, type DiaryData } from "@/lib/diary";
import { matchStory, randomStoryId } from "@/lib/story";
import { classics } from "../../diary/classics";
import { bigEvents, diaryPages, roundName, slams, toFanEntry, toMatches } from "../../diary/library";
import { ExploreSection } from "../../diary/explore";
import { LogProvider } from "../../diary/store";
import { CourtBand } from "../../court-band";
import { StepHeading } from "../../step-heading";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";

/** A shared match's link reads as the match: "Wimbledon 2008 · Final: Nadal beat Federer" */
export async function generateMetadata({ searchParams }: PageProps<"/explore">): Promise<Metadata> {
  const { m } = await searchParams;
  const story = typeof m === "string" && m !== "random" ? await matchStory(m.slice(0, 120)).catch(() => null) : null;
  if (!story) return { title: "Explore a match · CourtSaga" };
  const title = `${story.event} ${story.season} · ${roundName(story)}: ${story.names[story.a.key]} beat ${story.names[story.b.key]}`;
  const lede = story.lede[0]?.parts.map((p) => (typeof p === "string" ? p : p.text)).join("");
  const description = lede ? `${lede}. The story around it, on CourtSaga.` : "The story around it, on CourtSaga.";
  return { title: `${title} · CourtSaga`, description, openGraph: { title, description } };
}

// Signed out, a shared match still opens: the story without the diary
const noDiary: DiaryData = { rows: [], entries: {}, order: [], version: "guest" };

export default function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <div className="court-uso flex flex-1 flex-col">
      <CourtBand compact>
        <StepHeading
          as="h1"
          onCourt
          compact
          n={1}
          verb="Explore"
          title="Explore a match"
          body="Find any match, star it, rate it, and follow its story one match to the next."
        />
      </CourtBand>
      <section className="court-page flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <Exploring searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Exploring({ searchParams }: Pick<PageProps<"/explore">, "searchParams">) {
  const session = await getSession();
  const user = session?.user ?? null;
  const { m, slam } = await searchParams;
  // A Slam or a big event picked on the start page, which Surprise me keeps to
  const known: string[] = [...slams, ...bigEvents.map((b) => b.key)];
  const atSlam = typeof slam === "string" && known.includes(slam) ? slam : undefined;
  if (m === "random") {
    const id = await randomStoryId(atSlam);
    // A surprise from one Slam keeps to it: the next "Surprise me" picks there too
    redirect(id ? `/explore?m=${encodeURIComponent(id)}${atSlam ? `&slam=${encodeURIComponent(atSlam)}` : ""}` : "/explore");
  }
  const wanted = typeof m === "string" ? m.slice(0, 120) : null;
  const [diary, story, finals, classicRows, seasons, row] = await Promise.all([
    user ? loadDiary(user.id) : noDiary,
    wanted ? matchStory(wanted) : null,
    wanted ? [] : bigFinals(),
    wanted ? [] : findMatches(classics.map((c) => c.id)),
    seasonRange(),
    // The match being explored, so it can be starred right here
    wanted ? findMatch(wanted) : null,
  ]);
  const rows = row && !diary.entries[row.id] ? [...diary.rows, row] : diary.rows;

  // With no match open: the Slams' finals, matches everyone remembers, and the diary's latest pages
  let recent: string[] = [];
  if (!wanted) {
    const named = toMatches(diary.rows);
    const pages = diaryPages(Object.fromEntries(Object.entries(diary.entries).map(([id, e]) => [id, toFanEntry(e, named[id])])), named);
    recent = [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  }
  const recentRows = recent.map((id) => diary.rows.find((r) => r.id === id)!).filter(Boolean);

  return (
    <LogProvider
      // Afresh for each match, so the one being explored is always in the store to star
      key={`${diary.version}:${wanted}`}
      mode={user ? "diary" : "shared"}
      rows={rows}
      entries={diary.entries}
      order={diary.order}
      focusId={latestPage(diary)}
      saver={user ? saver : undefined}
    >
      <div className="space-y-8">
        <ExploreSection
          story={story}
          missing={!!wanted && !story}
          slam={atSlam ?? null}
          guest={!user}
          seasons={seasons}
          start={{ finals, classics: classicRows.map((row) => ({ row, why: classics.find((c) => c.id === row.id)!.why })), diary: recentRows }}
        />
      </div>
    </LogProvider>
  );
}
