"use client";

import { useState } from "react";
import type { Tour } from "./diary/library";
import { Chips, TopTen, type TopTenBooks } from "./diary/models-ui";

/* Advanced on the landing page: Advanced's own top 10 at any moment, men's or women's, and how well the
   ratings behind it pick winners. Nothing here leads into the site. */

/** The top 10s, and how often the ratings picked the winner against the rankings */
export type LandingTop = TopTenBooks & { fit: { n: number; accuracy: number; rankAccuracy: number } };

const pct1 = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString("en-GB")}%`;

export function LandingAdvanced({ men, women }: { men: LandingTop | null; women: LandingTop | null }) {
  const [tour, setTour] = useState<Tour>(men ? "atp" : "wta");
  const books = tour === "atp" ? men : women;
  if (!books) return null;
  const options = [...(men ? [{ id: "atp" as Tour, label: "Men" }] : []), ...(women ? [{ id: "wta" as Tour, label: "Women" }] : [])];
  return (
    <div className="space-y-3">
      <TopTen key={tour} books={books} tours={options.length > 1 && <Chips label="Tour" options={options} value={tour} onChange={setTour} />} />
      <p className="text-sm text-muted">
        In {books.fit.n.toLocaleString("en-GB")} {tour === "atp" ? "men's" : "women's"} matches since {books.elo.months[0]?.slice(0, 4)}, the higher-rated player won{" "}
        <strong className="font-semibold text-foreground">{pct1(books.fit.accuracy)}</strong> of them; the better-ranked player won{" "}
        <strong className="font-semibold text-foreground">{pct1(books.fit.rankAccuracy)}</strong> of those with rankings.
      </p>
    </div>
  );
}
