import type { ReactNode } from "react";

/* The top of a saga's page. The log and the ranking are played on courts; the saga is what they add up to,
   so it opens in a quiet reading room instead (.saga-room), where the books do the talking. */
export function SagaHeader({ step, kicker, title, body, lines }: { step?: number; kicker: string; title: string; body: ReactNode; lines?: string[] | null }) {
  return (
    <header className="max-w-3xl">
      <p className="flex items-center gap-3">
        {step && <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ball font-bold text-[#0b0d12] ring-1 ring-black/10">{step}</span>}
        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">{kicker}</span>
      </p>
      <h1 className="mt-5 font-display text-5xl font-bold tracking-tight sm:text-6xl">{title}</h1>
      <p className="mt-4 text-xl font-medium leading-relaxed text-muted">{body}</p>
      {lines && lines.length > 0 && (
        <p className="mt-6 flex flex-wrap gap-2">
          {lines.map((line) => (
            <span key={line} className="rounded-full bg-white px-3 py-1 text-sm font-semibold ring-1 ring-black/10">
              {line}
            </span>
          ))}
        </p>
      )}
    </header>
  );
}
