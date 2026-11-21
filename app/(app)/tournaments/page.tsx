import type { Metadata } from "next";
import { Suspense } from "react";
import { sessionOrDown } from "@/lib/auth";
import { bigFinals, latestPage, loadDiary, seasonRange, type DiaryData } from "@/lib/diary";
import { ExploreSection } from "../../diary/explore";
import { LogProvider } from "../../diary/store";
import { PageBar } from "../../ui";
import { OpeningDiary } from "../loading-page";
import { saver } from "../saver";

/* Tournaments: the Slams and the big events, each with its finals year by year, every one opening its
   match's page (/matches/<id>). Signed in, the finals already starred say so. */

const description = "Every Grand Slam, Masters, tour finals and Olympic final since 2003, men's and women's, each a click from its story.";

export const metadata: Metadata = {
  title: "Tournaments · CourtSaga",
  description,
  openGraph: { title: "Tennis finals since 2003 · CourtSaga", description },
};

// Signed out: the same finals, without a diary
const noDiary: DiaryData = { rows: [], entries: {}, order: [], version: "guest" };

export default function TournamentsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageBar n={1} title="Tournaments" />
      <section className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <Finals />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function Finals() {
  const session = await sessionOrDown();
  const user = session === "down" ? null : (session?.user ?? null);
  // A fan's stars are an extra: without the database the finals still show
  const [diary, finals, seasons] = await Promise.all([user ? loadDiary(user.id).catch(() => noDiary) : noDiary, bigFinals(), seasonRange()]);
  return (
    <LogProvider
      key={diary.version}
      mode={user ? "diary" : "shared"}
      rows={diary.rows}
      entries={diary.entries}
      order={diary.order}
      focusId={latestPage(diary)}
      saver={user ? saver : undefined}
    >
      <ExploreSection story={null} slam={null} guest={!user} seasons={seasons} start={{ finals }} />
    </LogProvider>
  );
}
