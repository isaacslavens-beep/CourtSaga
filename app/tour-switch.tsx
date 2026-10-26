"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/* Which tour a page shows, as one strip in its bar: Men or Women. The part of the page that's open (its
   hash: a chapter, a model) comes along when you switch, unless it's a search. */

const subscribeHash = (on: () => void) => {
  window.addEventListener("hashchange", on);
  window.addEventListener("courtsaga-hash", on);
  return () => {
    window.removeEventListener("hashchange", on);
    window.removeEventListener("courtsaga-hash", on);
  };
};

export function TourSwitch({ tour, men, women }: { tour: "atp" | "wta"; men: string; women: string }) {
  const hash = useSyncExternalStore(subscribeHash, () => location.hash, () => "");
  const keep = hash.startsWith("#find=") ? "" : hash;
  return (
    <div className="seg" role="group" aria-label="Tour">
      {(
        [
          ["atp", "Men", men],
          ["wta", "Women", women],
        ] as const
      ).map(([t, label, href]) => (
        <Link key={t} href={`${href}${keep}`} aria-current={t === tour ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </div>
  );
}
