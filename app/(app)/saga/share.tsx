"use client";

import { useState, useTransition } from "react";
import { renewShareLink, shareSaga, stopSharing } from "../actions";

/* A saga can be shared by link: anyone with it can read the saga, and nothing else of the diary. The
   link is long and random, so it can only be given, not guessed. It can be renewed (the old one stops
   working) or turned off. */
export function ShareSaga({ slug: initial, origin }: { slug: string | null; origin: string }) {
  const [slug, setSlug] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const url = slug ? `${origin}/s/${slug}` : null;

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
      await navigator.clipboard.writeText(`${origin}/s/${s}`).catch(() => undefined);
      setCopied(true);
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

  const button = "cursor-pointer rounded-full px-4 py-2 font-semibold transition disabled:cursor-wait disabled:opacity-60";
  return (
    <div className="mt-8 flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-line sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <p className="font-display text-lg font-bold">Share your saga</p>
        <p className="text-sm text-muted">
          {url ? (
            <>
              Anyone with this link can read it:{" "}
              <a href={url} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-court underline-offset-4 hover:underline">
                {url.replace(/^https?:\/\//, "")}
              </a>
            </>
          ) : (
            "A link anyone can read your saga with. The rest of your diary stays private."
          )}
        </p>
        {failed && <p className="mt-1 text-sm font-semibold text-fault">That didn&apos;t work. Check your connection and try again.</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" onClick={copy} disabled={pending} className={`${button} bg-ball text-[#0b0d12] shadow-md hover:-translate-y-0.5`}>
          {copied ? "✓ Link copied" : "Copy link to your saga"}
        </button>
        {slug && (
          <>
            <button type="button" onClick={renew} disabled={pending} className={`${button} text-muted hover:bg-foreground/5 hover:text-foreground`}>
              New link
            </button>
            <button type="button" onClick={stop} disabled={pending} className={`${button} text-muted hover:bg-fault/10 hover:text-fault`}>
              Turn off
            </button>
          </>
        )}
      </div>
    </div>
  );
}
