"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { nameResults, sameQuestions, showAnswers } from "../actions";

/* Sharing results: a name to put on them, and the link to copy (or a phone's share sheet). For anyone
   else who opens them, the same questions to try. */

export function ShareResults({ id, origin, name: initial, text }: { id: string; origin: string; name: string | null; text: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const copy = () =>
    start(async () => {
      if (name.trim() !== saved) {
        await nameResults(id, name).catch(() => undefined);
        setSaved(name.trim());
        router.refresh();
      }
      const url = `${origin}/quiz/${id}`;
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: text, url }).catch(() => undefined);
      else await navigator.clipboard.writeText(url).catch(() => undefined);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block min-w-0 flex-1 basis-56">
        <span className="mb-1 block text-sm font-semibold">Name on the results</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Your name (optional)" className="field" />
      </label>
      <button type="button" onClick={copy} disabled={pending} className={`btn ${copied ? "border-grass bg-grass text-white" : "btn-primary"}`}>
        {copied ? "Link copied" : "Copy the link"}
      </button>
    </div>
  );
}

export function TakeSame({ id }: { id: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await sameQuestions(id).catch(() => null);
            if (res && "id" in res) router.push(`/quiz/${res.id}`);
            else setFailed(true);
          })
        }
        className="btn btn-primary"
      >
        {pending ? "Setting it up…" : "Take the same questions"}
      </button>
      {failed && <span className="text-sm font-medium text-fault">That didn&apos;t work. Try again.</span>}
    </>
  );
}

/** "Just show the answers": once seen, the same questions can't be taken from here */
export function ShowAnswers({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await showAnswers(id);
          router.refresh();
        })
      }
      className="cursor-pointer text-sm font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
    >
      Just show the answers (then it can&apos;t be taken)
    </button>
  );
}
