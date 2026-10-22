import Link from "next/link";
import type { ReactNode } from "react";
import { CourtBand } from "../../court-band";
import { DataCredit } from "../../credits";

/* A shared saga's page, on the saga's own court: Roland Garros clay in its green surround, the book on the
   felt below. Also the frame for a link that's been turned off. */
export function SharedFrame({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return (
    <div className="court-rg flex flex-1 flex-col">
      <header className="bg-[var(--hc-surround)] text-white">
        <div aria-hidden className="flex h-1.5">
          <span className="flex-1 bg-[var(--slam-a)]" />
          <span className="flex-1 bg-[var(--slam-b)]" />
        </div>
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
      <CourtBand>{heading}</CourtBand>
      <main className="stage flex-1 pb-16 pt-10 sm:pt-12">
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

/** The heading on the court: whose saga it is */
export function SharedHeading({ title, body }: { title: string; body?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/80">A saga, shared</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {body && <p className="mt-4 text-xl font-medium leading-relaxed text-white/90">{body}</p>}
    </div>
  );
}
