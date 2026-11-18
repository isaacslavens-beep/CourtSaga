"use client";

import Link from "next/link";
import { useEffect } from "react";

/* Advanced is part of Statistics now. Its chapters kept their names (#ratings, #serve, #pressure, #ages),
   so an old link opens the same one; a bare /advanced opens the top 10, where Advanced began. The hash
   never reaches the server, so this is done here rather than as a redirect. */
export function Moved({ to }: { to: string }) {
  useEffect(() => {
    location.replace(`${to}${location.hash || "#top10"}`);
  }, [to]);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
      <p className="text-muted">
        Advanced is now part of{" "}
        <Link href={`${to}#top10`} className="font-semibold text-court underline-offset-4 hover:underline">
          Statistics
        </Link>
        .
      </p>
    </div>
  );
}
