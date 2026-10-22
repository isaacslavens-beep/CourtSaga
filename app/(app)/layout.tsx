import Link from "next/link";
import { DataCredit } from "../credits";
import { AccountLink, AppNav } from "./nav";

/* A signed-in fan's diary: the log, the ranking and the saga, the landing page's three steps as pages.
   The header is the hero's green surround; each page checks the session itself. */
export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="hero-court bg-[var(--hc-surround)] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-8 sm:py-4">
          <Link href="/log" className="order-1 flex items-center gap-2">
            <span aria-hidden className="text-2xl leading-none">
              🎾
            </span>
            <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
          </Link>
          <AppNav />
          <AccountLink />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted sm:px-8">
          <DataCredit />
        </p>
      </footer>
    </div>
  );
}
