import type { InputHTMLAttributes, ReactNode } from "react";

// The small pieces every account form shares: a labelled field, the main button, and a message.

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="font-semibold">{label}</span>
      {hint && <span className="text-sm text-muted"> · {hint}</span>}
      <input
        {...input}
        className="mt-1.5 w-full rounded-xl border-2 border-line bg-background px-3.5 py-2.5 text-lg font-medium placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-4 focus:ring-court/15"
      />
    </label>
  );
}

export function SubmitButton({ pending, children, danger = false }: { pending: boolean; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex w-full cursor-pointer items-center justify-center rounded-full px-6 py-3 text-lg font-bold shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-60 ${
        danger ? "bg-fault text-white" : "bg-ball text-[#0b0d12]"
      }`}
    >
      {children}
    </button>
  );
}

export function Message({ tone, children }: { tone: "error" | "done"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 font-medium ${tone === "error" ? "bg-fault/10 text-fault" : "bg-grass/10 text-grass"}`}>
      {children}
    </p>
  );
}

/** What went wrong, in plain words */
export function problem(error: { status?: number; code?: string; message?: string } | null) {
  if (!error) return null;
  if (error.status === 429) return "Too many tries. Wait a few minutes, then try again.";
  switch (error.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There's already an account with that email. Log in instead, or reset its password.";
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match an account.";
    case "INVALID_PASSWORD":
      return "That password isn't right.";
    case "INVALID_EMAIL":
      return "That doesn't look like an email address.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "Use 128 characters or fewer.";
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return "That link has expired or been used. Ask for a new one.";
  }
  return "Something went wrong. Try again in a moment.";
}
