"use client";

import { useState, useTransition } from "react";
import { renewShareLink, shareSaga, stopSharing } from "../actions";

/* A saga can be shared by link: anyone with it can read the saga, and nothing else of the diary. The
   link is long and random, so it can only be given, not guessed. It can be renewed (the old one stops
   working) or turned off. Drawn on the saga's band at the top of the page. */
export function ShareSaga({ slug: initial, origin }: { slug: string | null; origin: string }) {
  const [slug, setSlug] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const run = (work: () => Promise<void>) =>
    start(async () => {
      setFailed(false);
      try {
        await work();
      } catch {
        setFailed(true);
      }
    });
  const copy = () =>
    run(async () => {
      const s = slug ?? (await shareSaga());
      setSlug(s);
      const url = `${origin}/s/${s}`;
      // A phone gets its share sheet, anything else the clipboard
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: "My tennis saga", url }).catch(() => undefined);
      else await navigator.clipboard.writeText(url).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  const renew = () => {
    if (!window.confirm("Make a new link? The old one stops working, for anyone you've sent it to.")) return;
    run(async () => {
      setSlug(await renewShareLink());
      setCopied(false);
    });
  };
  const stop = () => {
    if (!window.confirm("Turn the link off? Anyone who has it won't be able to open your saga.")) return;
    run(async () => {
      await stopSharing();
      setSlug(null);
      setCopied(false);
    });
  };

  const small = "cursor-pointer font-semibold text-white/75 underline-offset-4 transition hover:text-white hover:underline disabled:cursor-wait";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={copy}
        disabled={pending}
        className={`group inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 font-display text-base font-bold text-white shadow-lg shadow-black/25 ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-wait disabled:opacity-70 ${
          copied ? "bg-grass" : "bg-[#1f74d6] hover:bg-[#1a66bd]"
        }`}
      >
        <svg viewBox="0 0 20 20" aria-hidden className="h-5 w-5 fill-none stroke-current stroke-2 transition-transform group-hover:-rotate-12" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L10 5M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
        </svg>
        {copied ? "Link copied ✓" : "Share your saga"}
      </button>
      <span className="text-sm text-white/75">
        {slug ? (
          <>
            Anyone with the link can read it.{" "}
            <button type="button" onClick={renew} disabled={pending} className={small}>
              New link
            </button>{" "}
            ·{" "}
            <button type="button" onClick={stop} disabled={pending} className={small}>
              Turn off
            </button>
          </>
        ) : (
          "Anyone with the link can read it. Everything else stays private."
        )}
      </span>
      {failed && <p className="w-full text-sm font-semibold text-[#ffb4ac]">That didn&apos;t work. Check your connection and try again.</p>}
    </div>
  );
}
