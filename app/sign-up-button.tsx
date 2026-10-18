"use client";

import { useRef } from "react";

const variants = {
  primary:
    "bg-clay text-clay-ink hover:brightness-110 px-6 py-3 text-base",
  small:
    "bg-foreground text-background hover:opacity-85 px-4 py-2 text-sm",
};

export default function SignUpButton({
  label = "Sign up",
  variant = "primary",
}: {
  label?: string;
  variant?: keyof typeof variants;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={`inline-flex items-center justify-center rounded-full font-medium transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay ${variants[variant]}`}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="coming-soon-title"
        onClick={(e) => {
          // Close when clicking the backdrop (outside the panel)
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-foreground shadow-2xl"
      >
        <div className="p-8 text-center">
          <div
            aria-hidden
            className="mx-auto mb-5 h-12 w-12 rounded-full bg-ball shadow-inner"
          />
          <h2
            id="coming-soon-title"
            className="font-display text-3xl font-bold tracking-tight"
          >
            Coming soon
          </h2>
          <p className="mt-3 text-muted">
            CourtSaga isn&apos;t open yet, but it&apos;s on the way. The plan is to
            have it ready for the start of the 2027 season.
          </p>
          <form method="dialog" className="mt-7">
            <button className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition hover:opacity-85 cursor-pointer">
              Got it
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
