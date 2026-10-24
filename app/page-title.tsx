import type { ReactNode } from "react";

/* A signed-in page's heading: its step number in a ball and a short name, nothing more, as the content
   speaks for itself. White on a dark band (the saga's), ink everywhere else. */
export function PageTitle({ n, children, onDark = false }: { n: number; children: ReactNode; onDark?: boolean }) {
  return (
    <h1 className={`flex items-center gap-3 font-display text-2xl font-bold tracking-tight sm:text-3xl ${onDark ? "text-white" : ""}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ball font-sans text-base text-[#0b0d12] ring-1 ring-black/10">{n}</span>
      {children}
    </h1>
  );
}
