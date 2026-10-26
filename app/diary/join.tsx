"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogInForm, SignUpForm } from "../(auth)/forms";
import { addEntry } from "../(app)/actions";
import type { StoredEntry } from "./library";

/* Signed out, the star opens this: a free account in a small dialog over the match. Once signed up (or
   logged in) the match is starred, and the page comes back as a signed-in fan's, the star in place. */
export function JoinDialog({ id, entry, onClose }: { id: string; entry: StoredEntry; onClose: () => void }) {
  const router = useRouter();
  const box = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<"signup" | "login">("signup");

  useEffect(() => {
    box.current?.showModal();
  }, []);

  const done = async () => {
    // Starred already, from another tab: nothing more to add
    await addEntry(id, entry).catch(() => {});
    router.refresh();
  };

  return (
    <dialog
      ref={box}
      onClose={onClose}
      // A click on the dimmed page around the panel closes it
      onClick={(e) => e.target === box.current && box.current.close()}
      aria-labelledby="join-title"
      className="panel m-auto w-[calc(100%-2rem)] max-w-md p-6 text-left backdrop:bg-foreground/40 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="join-title" className="font-display text-[1.75rem] font-bold leading-tight">
          {form === "signup" ? "Sign up to star it" : "Log in to star it"}
        </h2>
        <button type="button" onClick={() => box.current?.close()} aria-label="Close" className="-mr-2 -mt-1 cursor-pointer rounded p-2 text-muted hover:text-foreground">
          <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-muted">
        {form === "signup" ? "Free. Starred matches, with ratings and notes, make a saga of your own." : "The match is starred as soon as you're in."}
      </p>
      <div className="mt-6">
        {form === "signup" ? <SignUpForm onDone={done} onSwitch={() => setForm("login")} /> : <LogInForm onDone={done} onSwitch={() => setForm("signup")} />}
      </div>
    </dialog>
  );
}
