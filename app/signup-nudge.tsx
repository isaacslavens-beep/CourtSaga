"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* One small sign-up bar floating at the foot of the landing page, always there. Its line follows the
   step being looked at, so it says what an account adds to the demo on screen. */

// Each step's line, then a shorter one for a phone
const lines: Record<string, [string, string]> = {
  explore: ["Sign up free to explore any tennis match", "Explore any match"],
  statistics: ["Sign up free to star the matches behind the records", "Star any match"],
  saga: ["Sign up free to build your own saga", "Build your own saga"],
};
const fallback: [string, string] = ["CourtSaga is free. Sign up to start your own", "It's free"];

export function SignupBar() {
  const [step, setStep] = useState<string | null>(null);

  useEffect(() => {
    const sections = Object.keys(lines)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    // The step covering the middle of the screen is the one being looked at
    const watch = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setStep(e.target.id);
          else setStep((cur) => (cur === e.target.id ? null : cur));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sections.forEach((s) => watch.observe(s));
    return () => watch.disconnect();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-[#0f1b2d]/90 py-1.5 pl-5 pr-1.5 text-sm text-white shadow-lg shadow-black/20 ring-1 ring-white/10 backdrop-blur-md">
        <span key={step ?? "none"} className="fade-in min-w-0 truncate font-medium">
          <span className="max-sm:hidden">{(step ? lines[step] : fallback)[0]}</span>
          <span className="sm:hidden">{(step ? lines[step] : fallback)[1]}</span>
        </span>
        <Link href="/signup" className="shrink-0 rounded-full bg-ball px-4 py-1.5 font-bold text-[#0b0d12] transition hover:brightness-105">
          Sign up free
        </Link>
      </div>
    </div>
  );
}
