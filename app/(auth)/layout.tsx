import Link from "next/link";
import { DataCredit } from "../credits";

/* Signing up and logging in: one page of a diary, lying on the court's green
   surround, the same green as the landing page's hero. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-court flex flex-1 flex-col bg-[var(--hc-surround)]">
      <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-4 text-white sm:px-8 md:py-5">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="text-2xl leading-none">
            🎾
          </span>
          <span className="font-display text-xl font-bold tracking-tight">CourtSaga</span>
        </Link>
        <Link href="/" className="ml-auto rounded-full px-3 py-1.5 font-semibold text-white/90 transition hover:bg-white/10 hover:text-white">
          ← Back
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16 pt-4 sm:pt-10">
        <div className="page-stack h-fit w-full max-w-md rounded-3xl bg-surface p-6 text-foreground ring-1 ring-black/10 sm:p-8">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-white/75 sm:px-8 [&_a:hover]:text-white">
        <DataCredit />
      </footer>
    </div>
  );
}
