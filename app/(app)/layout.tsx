import { DataCredit } from "../credits";
import { Logo } from "../ui";
import { AppNav } from "./nav";
import { SignedIn } from "./signed-in";

/* The site's pages: home, Explore, Statistics, Advanced and the saga, under one bar with the parts as
   tabs, and who's signed in (or the ways in) at the foot. Open to anyone; starring and the saga check
   the session themselves. */
export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-header text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 px-4 sm:h-14 sm:flex-nowrap sm:px-8">
          <div className="order-1 flex h-12 items-center sm:h-auto">
            <Logo />
          </div>
          <AppNav />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 text-xs leading-relaxed text-muted sm:px-8">
          <DataCredit />
          <SignedIn />
        </div>
      </footer>
    </div>
  );
}
