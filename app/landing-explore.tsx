"use client";

import { useRef, useState } from "react";
import { StoryView } from "./diary/explore";
import type { Story } from "./diary/story";

/* The landing page's Explore: a few famous matches to read the story of, picked from chips. Stories come
   from /api/story as they're picked; the page never sends anyone into the site from here. */

export function LandingExplore({ initial, choices }: { initial: Story | null; choices: { id: string; label: string }[] }) {
  const [story, setStory] = useState(initial);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const cache = useRef(new Map<string, Story>(initial ? [[initial.id, initial]] : []));
  const asked = useRef(0);

  // Only the chosen matches open; anything else a story mentions stays where it is
  const open = async (id: string) => {
    if (!choices.some((c) => c.id === id) || id === story?.id) return;
    const n = ++asked.current;
    const known = cache.current.get(id);
    if (known) return setStory(known);
    setPending(true);
    try {
      const res = await fetch(`/api/story?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(String(res.status));
      const next: Story = await res.json();
      cache.current.set(id, next);
      if (n === asked.current) {
        setStory(next);
        setFailed(false);
      }
    } catch {
      if (n === asked.current) setFailed(true);
    } finally {
      if (n === asked.current) setPending(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={story?.id === c.id}
            onClick={() => void open(c.id)}
            className={`cursor-pointer rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition sm:text-base ${story?.id === c.id ? "border-court bg-court text-court-ink" : "border-line bg-surface text-court hover:border-court"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {failed && <p className="mb-4 rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">That story didn&apos;t load. Check your connection and try again.</p>}
      {story ? (
        <StoryView story={story} follow={(id) => void open(id)} pending={pending} page={() => null} lite still short />
      ) : (
        <p className="text-muted">The match data isn&apos;t available right now.</p>
      )}
    </div>
  );
}
