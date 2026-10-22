"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { pageCourts } from "./courts";

// The diary's three parts, numbered as on the landing page, then the account
const steps = [
  { href: "/log", n: 1, label: "Log" },
  { href: "/rank", n: 2, label: "Rank" },
  { href: "/saga", n: 3, label: "Saga" },
];

const pill = (on: boolean) => `flex items-center gap-2 rounded-full font-semibold transition ${on ? "bg-white text-foreground shadow-md" : "text-white/90 hover:bg-white/10"}`;

/** The three steps: on a phone a row of their own under the logo, beside it on wider screens */
export function AppNav() {
  const path = usePathname();
  return (
    <nav aria-label="Log, rank and saga" className="order-3 flex w-full items-center gap-1 sm:order-2 sm:ml-auto sm:w-auto sm:gap-1.5">
      {steps.map((s) => (
        <Link key={s.href} href={s.href} aria-current={path === s.href ? "page" : undefined} className={`${pill(path === s.href)} py-1 pl-1 pr-3 sm:py-1.5 sm:pl-1.5 sm:pr-3.5`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ball text-sm font-bold text-[#0b0d12] ring-1 ring-black/10">{s.n}</span>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

/** The header sits on the surround of the page's court, under a strip of that Slam's two colours */
export function CourtHeader({ children }: { children: ReactNode }) {
  const court = pageCourts[usePathname()] ?? "uso";
  return (
    <header className={`court-${court} bg-[var(--header)] text-white`}>
      <div aria-hidden className="flex h-1.5">
        <span className="flex-1 bg-[var(--slam-a)]" />
        <span className="flex-1 bg-[var(--slam-b)]" />
      </div>
      {children}
    </header>
  );
}

export function AccountLink() {
  const path = usePathname();
  return (
    <Link href="/account" aria-current={path === "/account" ? "page" : undefined} className={`${pill(path === "/account")} order-2 ml-auto px-3 py-1.5 sm:order-3 sm:ml-0`}>
      Account
    </Link>
  );
}
