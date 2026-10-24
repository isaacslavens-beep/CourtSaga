import Link from "next/link";
import type { ReactNode } from "react";
import { DataCredit } from "../../credits";

/* A shared saga's page: the saga's own reading room, under its ink header. Also the frame for a link
   that's been turned off. */
export function SharedFrame({ children }: { children: ReactNode }) {
  return (
    <div className="court-saga saga-room flex flex-1 flex-col">
      <header className="bg-[var(--header)] text-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden className="text-2xl leading-none">
              🎾
            </span>
            <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
          </Link>
          <Link href="/signup" className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/25 transition hover:bg-white/20">
            Sign up
          </Link>
        </div>
      </header>
      <main className="flex-1 pb-20 pt-10 sm:pt-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-8">{children}</div>
      </main>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-8">
          <DataCredit />
        </p>
      </footer>
    </div>
  );
}
