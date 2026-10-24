"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { pageCourts } from "./courts";

// The site's parts, numbered as on the landing page (Advanced comes after it)
const steps = [
  { href: "/explore", n: 1, label: "Explore" },
  { href: "/statistics", n: 2, label: "Statistics" },
  { href: "/saga", n: 3, label: "Saga" },
  { href: "/advanced", n: 4, label: "Advanced" },
];

const pill = (on: boolean) => `flex items-center gap-2 rounded-full font-semibold transition ${on ? "bg-white text-foreground shadow-md" : "text-white/90 hover:bg-white/10"}`;

/** The steps: on a phone a row of their own under the logo, beside it on wider screens */
export function AppNav() {
  const path = usePathname();
  const on = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    // Four steps fill a phone's width, so there they sit closer, and on the narrowest phones drop their numbers
    <nav aria-label="Explore, statistics, saga and advanced" className="order-3 flex w-full items-center justify-between sm:order-2 sm:ml-auto sm:w-auto sm:justify-start sm:gap-1.5">
      {steps.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          aria-current={on(s.href) ? "page" : undefined}
          className={`${pill(on(s.href))} gap-1.5 py-1 pl-1 pr-2.5 text-sm max-[409px]:px-2.5 sm:gap-2 sm:py-1.5 sm:pl-1.5 sm:pr-3.5 sm:text-base`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ball text-xs font-bold text-[#0b0d12] ring-1 ring-black/10 max-[409px]:hidden sm:h-7 sm:w-7 sm:text-sm">{s.n}</span>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

/** The header sits in the colour of the page's court */
export function CourtHeader({ children }: { children: ReactNode }) {
  const court = pageCourts[usePathname()] ?? "uso";
  return (
    <header className={`court-${court} bg-[var(--header)] text-white`}>
      {children}
    </header>
  );
}
