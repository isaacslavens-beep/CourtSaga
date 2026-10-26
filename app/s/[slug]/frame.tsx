import Link from "next/link";
import type { ReactNode } from "react";
import { DataCredit } from "../../credits";
import { Logo } from "../../ui";

/* A shared saga's page: the site's bar, then the saga's own reading room. Also the frame for a link
   that's been turned off. */
export function SharedFrame({ children }: { children: ReactNode }) {
  return (
    <div className="saga-room flex flex-1 flex-col">
      <header className="bg-header text-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Logo />
          <Link href="/signup" className="btn btn-primary btn-sm">
            Sign up
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-muted sm:px-8">
          <DataCredit />
        </p>
      </footer>
    </div>
  );
}

/** The room under a saga's bar, where the books stand */
export function Room({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-8 sm:pt-10">{children}</div>;
}
