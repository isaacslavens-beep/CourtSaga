"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The site's parts, in order
const steps = [
  { href: "/explore", n: 1, label: "Explore" },
  { href: "/statistics", n: 2, label: "Statistics" },
  { href: "/advanced", n: 3, label: "Advanced" },
  { href: "/saga", n: 4, label: "Saga" },
];

/** The parts as tabs along the header, the open one underlined in ball yellow: on a phone a row of their own under the logo */
export function AppNav() {
  const path = usePathname();
  const on = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <nav aria-label="Explore, statistics, advanced and saga" className="order-3 -mb-px flex w-full self-stretch sm:order-2 sm:ml-auto sm:w-auto">
      {steps.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          aria-current={on(s.href) ? "page" : undefined}
          className={`relative flex flex-1 items-center justify-center gap-2 px-2 py-3 text-[0.9375rem] font-semibold transition-colors sm:flex-none sm:px-3.5 sm:py-0 ${
            on(s.href) ? "text-white" : "text-white/70 hover:text-white"
          }`}
        >
          <span
            className={`flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-[3px] text-[0.6875rem] font-extrabold tabular-nums max-[409px]:hidden ${
              on(s.href) ? "bg-ball text-foreground" : "bg-white/12 text-white/80"
            }`}
          >
            {s.n}
          </span>
          {s.label}
          {on(s.href) && <span aria-hidden className="absolute inset-x-2 bottom-0 h-[3px] bg-ball sm:inset-x-3.5" />}
        </Link>
      ))}
    </nav>
  );
}
