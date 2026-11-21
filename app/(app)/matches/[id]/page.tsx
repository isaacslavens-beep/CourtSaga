import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { sessionOrDown } from "@/lib/auth";
import { findMatch, latestPage, loadDiary, seasonRange, type DiaryData } from "@/lib/diary";
import { matchExtremes } from "@/lib/match-index";
import { matchStory, randomStoryId } from "@/lib/story";
import { bigEvents, matchHref, roundName, slams } from "../../../diary/library";
import { ExploreSection } from "../../../diary/explore";
import { ExtremesPanel } from "../../../diary/extremes-ui";
import { LogProvider } from "../../../diary/store";
import { PageBar } from "../../../ui";
import { OpeningDiary } from "../../loading-page";
import { saver } from "../../saver";

/* One match's page: the story around it (app/diary/story.ts), how extreme it was among every match
   (app/diary/match-index.ts), and starring it. /matches/random picks one, from one Slam or big event when
   ?slam= says which. */

const idOf = (id: string) => decodeURIComponent(id).slice(0, 120);

/** A shared match's link reads as the match: "Wimbledon 2008 · Final: Nadal beat Federer" */
export async function generateMetadata({ params }: PageProps<"/matches/[id]">): Promise<Metadata> {
  const { id } = await params;
  const story = id !== "random" ? await matchStory(idOf(id)).catch(() => null) : null;
  if (!story) return { title: "A match · CourtSaga" };
  const title = `${story.event} ${story.season} · ${roundName(story)}: ${story.names[story.a.key]} beat ${story.names[story.b.key]}`;
  const lede = story.lede[0]?.parts.map((p) => (typeof p === "string" ? p : p.text)).join("");
  const description = lede ? `${lede}. The story around it, on CourtSaga.` : "The story around it, on CourtSaga.";
  return { title: `${title} · CourtSaga`, description, openGraph: { title, description } };
}

// Signed out, a match opens the same: the story without a diary
const noDiary: DiaryData = { rows: [], entries: {}, order: [], version: "guest" };

export default function MatchPage({ params, searchParams }: PageProps<"/matches/[id]">) {
  return (
    <div className="flex flex-1 flex-col">
      <PageBar n={2} title="Matches" />
      <section className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <OneMatch params={params} searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function OneMatch({ params, searchParams }: Pick<PageProps<"/matches/[id]">, "params" | "searchParams">) {
  const [{ id }, { slam }] = await Promise.all([params, searchParams]);
  // A Slam or a big event picked in Tournaments, which Surprise me keeps to
  const known: string[] = [...slams, ...bigEvents.map((b) => b.key)];
  const atSlam = typeof slam === "string" && known.includes(slam) ? slam : undefined;
  if (id === "random") {
    // A fresh pick on every request, signed in or not
    await connection();
    const picked = await randomStoryId(atSlam);
    redirect(picked ? `${matchHref(picked)}${atSlam ? `?slam=${encodeURIComponent(atSlam)}` : ""}` : "/tournaments");
  }
  const wanted = idOf(id);
  const session = await sessionOrDown();
  const user = session === "down" ? null : (session?.user ?? null);
  const [diary, story, seasons, row] = await Promise.all([
    // A fan's stars are an extra: without the database the story still shows
    user ? loadDiary(user.id).catch(() => noDiary) : noDiary,
    matchStory(wanted),
    seasonRange(),
    // The match itself, so it can be starred right here
    findMatch(wanted),
  ]);
  const rows = row && !diary.entries[row.id] ? [...diary.rows, row] : diary.rows;

  return (
    <LogProvider
      // Afresh for each match, so the one open is always in the store to star
      key={`${diary.version}:${wanted}`}
      mode={user ? "diary" : "shared"}
      rows={rows}
      entries={diary.entries}
      order={diary.order}
      focusId={latestPage(diary)}
      saver={user ? saver : undefined}
    >
      <ExploreSection
        story={story}
        missing={!story}
        slam={atSlam ?? null}
        guest={!user}
        seasons={seasons}
        extremes={
          story ? (
            <Suspense fallback={null}>
              <HowExtreme id={wanted} />
            </Suspense>
          ) : undefined
        }
      />
    </LogProvider>
  );
}

async function HowExtreme({ id }: { id: string }) {
  const x = await matchExtremes(id).catch(() => null);
  return x && <ExtremesPanel x={x} />;
}
