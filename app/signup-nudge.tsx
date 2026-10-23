"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* Under each step's demo on the landing page: what signing up gets you there, as a strip under the demo
   and, once per visit, a card in the corner after a few seconds in the step or a first click in it. */

const SEEN = "courtsaga:nudged";
// How long a step has to be on screen before its card shows, if nothing in it is clicked first
const LINGER_MS = 6000;

const seen = () => {
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(SEEN) ?? "[]"));
  } catch {
    return new Set<string>();
  }
};
const markSeen = (id: string) => {
  try {
    sessionStorage.setItem(SEEN, JSON.stringify([...seen(), id]));
  } catch {
    // No storage: the card may show again next time, nothing else lost
  }
};

export function SignupNudge({ step, title, body }: { step: string; title: string; body: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const section = document.getElementById(step);
    if (!section || seen().has(step)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      if (seen().has(step)) return;
      markSeen(step);
      // Only one card at a time: a newer step's replaces an older one's
      window.dispatchEvent(new CustomEvent("courtsaga-nudge", { detail: step }));
      setOpen(true);
    };
    // A step counts as being looked at while it fills half the screen (steps are often taller than it)
    let looking = false;
    const watch = new IntersectionObserver(
      ([e]) => {
        const now = e.intersectionRect.height >= innerHeight * 0.5;
        if (now === looking) return;
        looking = now;
        clearTimeout(timer);
        if (now) timer = setTimeout(show, LINGER_MS);
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    watch.observe(section);
    // A first click in the demo shows it sooner
    const clicked = (e: Event) => {
      if (strip.current?.contains(e.target as Node)) return;
      clearTimeout(timer);
      timer = setTimeout(show, 1200);
    };
    section.addEventListener("click", clicked, { once: true });
    return () => {
      watch.disconnect();
      clearTimeout(timer);
      section.removeEventListener("click", clicked);
    };
  }, [step]);

  useEffect(() => {
    const other = (e: Event) => (e as CustomEvent<string>).detail !== step && setOpen(false);
    window.addEventListener("courtsaga-nudge", other);
    return () => window.removeEventListener("courtsaga-nudge", other);
  }, [step]);

  return (
    <>
      <div ref={strip} className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold">{title}</p>
          <p className="text-muted">{body}</p>
        </div>
        <Link href="/signup" className="shrink-0 rounded-full bg-ball px-6 py-2.5 font-bold text-[#0b0d12] shadow-md shadow-black/10 transition hover:-translate-y-0.5 hover:shadow-lg">
          Sign up free
        </Link>
      </div>

      {open && (
        <div role="dialog" aria-label={title} className="rise-in fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-surface p-5 shadow-2xl ring-1 ring-line">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xl text-muted transition hover:bg-line/60">
            ×
          </button>
          <p className="pr-8 font-display text-lg font-bold leading-snug">{title}</p>
          <p className="mt-1 text-sm text-muted">{body}</p>
          <div className="mt-4 flex items-center gap-3">
            <Link href="/signup" className="rounded-full bg-ball px-5 py-2 font-bold text-[#0b0d12] shadow-md shadow-black/10 transition hover:-translate-y-0.5">
              Sign up free
            </Link>
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">
              Keep trying the demo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
