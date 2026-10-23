import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { findMatches, latestPage, loadDiary, seasonRange, slamFinals } from "@/lib/diary";
import { matchStory, randomStoryId } from "@/lib/story";
import { classics } from "../../diary/classics";
import { diaryPages, slams, toFanEntry, toMatches } from "../../diary/library";
import { ExploreSection } from "../../diary/explore";
import { LogProvider } from "../../diary/store";
import { CourtBand } from "../../court-band";
import { StepHeading } from "../../step-heading";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";

export const metadata: Metadata = { title: "Explore a match · CourtSaga" };

export default function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <div className="court-uso flex flex-1 flex-col">
      <CourtBand compact>
        <StepHeading
          as="h1"
          onCourt
          compact
          n={2}
          verb="Explore"
          title="Explore a match"
          body="Pick any match and follow the story around it, one match to the next."
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
  const user = await requireUser();
  const { m, slam } = await searchParams;
  const atSlam = typeof slam === "string" && slams.includes(slam as (typeof slams)[number]) ? slam : undefined;
  if (m === "random") {
    const id = await randomStoryId(atSlam);
    // A surprise from one Slam keeps to it: the next "Surprise me" picks there too
    redirect(id ? `/explore?m=${encodeURIComponent(id)}${atSlam ? `&slam=${encodeURIComponent(atSlam)}` : ""}` : "/explore");
  }
  const wanted = typeof m === "string" ? m.slice(0, 120) : null;
  const [diary, seasons, story, finals, classicRows] = await Promise.all([
    loadDiary(user.id),
    seasonRange(),
    wanted ? matchStory(wanted) : null,
    wanted ? [] : slamFinals(),
    wanted ? [] : findMatches(classics.map((c) => c.id)),
  ]);

  // With no match open: the Slams' finals, matches everyone remembers, and the diary's latest pages
  let recent: string[] = [];
  if (!wanted) {
    const named = toMatches(diary.rows);
    const pages = diaryPages(Object.fromEntries(Object.entries(diary.entries).map(([id, e]) => [id, toFanEntry(e, named[id])])), named);
    recent = [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  }
  const recentRows = recent.map((id) => diary.rows.find((r) => r.id === id)!).filter(Boolean);

  return (
    <LogProvider key={diary.version} mode="diary" rows={diary.rows} entries={diary.entries} order={diary.order} focusId={latestPage(diary)} saver={saver}>
      <div className="space-y-8">
        <ExploreSection
          story={story}
          missing={!!wanted && !story}
          slam={atSlam ?? null}
          seasons={seasons}
          start={{ finals, classics: classicRows.map((row) => ({ row, why: classics.find((c) => c.id === row.id)!.why })), diary: recentRows }}
        />
      </div>
    </LogProvider>
  );
}
