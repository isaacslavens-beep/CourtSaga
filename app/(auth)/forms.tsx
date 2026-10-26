"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Message, SubmitButton, problem } from "../form-ui";

// Only ever send someone back to a page of this site
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/explore");

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** In the sign-up dialog: what to do once signed in, and the other form to switch to in place of a link */
type InPlace = { onDone?: () => Promise<void>; onSwitch?: () => void };

/** The link to the other form, or a button that swaps the dialog over to it */
function Other({ href, onSwitch, children }: { href: string; onSwitch?: () => void; children: string }) {
  const style = "cursor-pointer font-semibold text-court underline-offset-4 hover:underline";
  return onSwitch ? (
    <button type="button" onClick={onSwitch} className={style}>
      {children}
    </button>
  ) : (
    <Link href={href} className={style}>
      {children}
    </Link>
  );
}

export function SignUpForm({ onDone, onSwitch }: InPlace = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name: text(form, "name"), email: text(form, "email"), password: String(form.get("password")) });
    if (error) {
      setError(problem(error));
      setPending(false);
      return;
    }
    if (onDone) return onDone();
    router.replace("/explore");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={submit} className="space-y-4">
      <Field label="Your name" name="name" autoComplete="given-name" required maxLength={60} placeholder="A first name is fine" />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" hint="at least 8 characters" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      {error && <Message tone="error">{error}</Message>}
      <SubmitButton pending={pending}>{pending ? "Signing up…" : "Sign up"}</SubmitButton>
      <p className="text-center text-muted">
        Already signed up?{" "}
        <Other href="/login" onSwitch={onSwitch}>
          Log in
        </Other>
      </p>
    </form>
  );
}

export function LogInForm({ onDone, onSwitch }: InPlace = {}) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email: text(form, "email"), password: String(form.get("password")) });
    if (error) {
      setError(problem(error));
      setPending(false);
      return;
    }
    if (onDone) return onDone();
    router.replace(next);
    router.refresh();
  }

  return (
    <form method="post" onSubmit={submit} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      {error && <Message tone="error">{error}</Message>}
      <SubmitButton pending={pending}>{pending ? "Logging in…" : "Log in"}</SubmitButton>
      <p className="text-center text-muted">
        New here?{" "}
        <Other href="/signup" onSwitch={onSwitch}>
          Sign up
        </Other>
      </p>
    </form>
  );
}
