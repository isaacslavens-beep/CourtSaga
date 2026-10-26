import type { InputHTMLAttributes, ReactNode } from "react";

// The small pieces every account form shares: a labelled field, the main button, and a message.

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {hint && <span className="text-sm text-muted"> ({hint})</span>}
      <input {...input} className="field mt-1 text-lg" />
    </label>
  );
}

export function SubmitButton({ pending, children, danger = false }: { pending: boolean; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn-lg w-full ${danger ? "border-fault bg-fault text-white hover:brightness-110" : "btn-primary"}`}
    >
      {children}
    </button>
  );
}

export function Message({ tone, children }: { tone: "error" | "done"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded border px-4 py-3 font-medium ${tone === "error" ? "border-fault/30 bg-fault/5 text-fault" : "border-grass/30 bg-grass/5 text-grass"}`}>
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
      return "There's already an account with that email. Log in instead.";
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
  }
  return "Something went wrong. Try again in a moment.";
}
