import Link from "next/link";
import { DataCredit } from "../credits";
import { AppNav, CourtHeader } from "./nav";
import { SignedIn } from "./signed-in";

/* A signed-in fan's pages: the log, exploring and the saga, the landing page's three steps, and Advanced,
   with who's signed in at the foot. Each is drawn on a Slam's court, and the header sits on its surround. Each page checks the
   session itself. */
export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <CourtHeader>
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 sm:flex-nowrap sm:px-8 sm:py-4">
          <Link href="/explore" className="order-1 flex items-center gap-2">
            <span aria-hidden className="text-2xl leading-none">
              🎾
            </span>
            <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
          </Link>
          <AppNav />
        </div>
      </CourtHeader>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-6 text-xs leading-relaxed text-muted sm:px-8">
          <DataCredit />
          <SignedIn />
        </div>
      </footer>
    </div>
  );
}
