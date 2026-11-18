import type { Tour } from "../../diary/library";
import { MatchesView } from "../../diary/matches-ui";
import { TourSwitch } from "../../tour-switch";
import { PageBar } from "../../ui";

/* Matches, for one tour: every match, to sort by any number and filter by anything (app/diary/matches-ui.tsx).
   The search lives in the address and the list comes from /api/matches, so the page itself is the same
   for everyone and built ahead of time. */

export const matchesDescription = "Every tour-level singles match since 2003, to sort by any statistic and filter by player, tournament, round, surface or oddity: marathons, giant-killings, the most aces, the most dramatic finals.";

export function MatchesPage({ tour }: { tour: Tour }) {
  return (
    <div className="flex flex-1 flex-col">
      <PageBar n={2} title="Matches">
        <TourSwitch tour={tour} men="/matches" women="/matches/women" />
      </PageBar>
      <section className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">
          <MatchesView key={tour} tour={tour} />
        </div>
      </section>
    </div>
  );
}
