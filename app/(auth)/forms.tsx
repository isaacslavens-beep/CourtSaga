"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Message, SubmitButton, problem } from "../form-ui";

// Only ever send someone back to a page of this site
const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/log");

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

export function SignUpForm() {
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
    router.replace("/log");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Your name" name="name" autoComplete="given-name" required maxLength={60} placeholder="What your diary calls you" />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" hint="at least 8 characters" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      {error && <Message tone="error">{error}</Message>}
      <SubmitButton pending={pending}>{pending ? "Starting your diary…" : "Start my diary"}</SubmitButton>
      <p className="text-center text-muted">
        Have a diary already?{" "}
        <Link href="/login" className="font-semibold text-court underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function LogInForm() {
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
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      {error && <Message tone="error">{error}</Message>}
      <SubmitButton pending={pending}>{pending ? "Opening your diary…" : "Log in"}</SubmitButton>
      <p className="flex flex-wrap justify-between gap-2 text-muted">
        <Link href="/forgot-password" className="font-semibold text-court underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
        <span>
          New here?{" "}
          <Link href="/signup" className="font-semibold text-court underline-offset-4 hover:underline">
            Sign up
          </Link>
        </span>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({ email: text(form, "email"), redirectTo: "/reset-password" });
    setPending(false);
    // The same answer whether or not there's a diary for that email
    if (error) setError(problem(error));
    else setSent(true);
  }

  if (sent)
    return (
      <div className="space-y-4">
        <Message tone="done">If there&apos;s a diary for that email, a link to choose a new password is on its way. It works for an hour.</Message>
        <p className="text-muted">
          Nothing after a few minutes? Check your spam folder, or{" "}
          <button type="button" onClick={() => setSent(false)} className="cursor-pointer font-semibold text-court underline-offset-4 hover:underline">
            try again
          </button>
          .
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      {error && <Message tone="error">{error}</Message>}
      <SubmitButton pending={pending}>{pending ? "Sending…" : "Email me a link"}</SubmitButton>
      <p className="text-center text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-court underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") || !token ? problem({ code: "INVALID_TOKEN" }) : null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("again"))) return setError("Those two passwords don't match.");
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
    setPending(false);
    if (error) setError(problem(error));
    else setDone(true);
  }

  if (done)
    return (
      <div className="space-y-4">
        <Message tone="done">Your password is changed. Anywhere else you were logged in, you&apos;ll need it to log in again.</Message>
        <Link href="/login" className="inline-flex w-full items-center justify-center rounded-full bg-ball px-6 py-3 text-lg font-bold text-[#0b0d12] shadow-md">
          Log in
        </Link>
      </div>
    );

  if (!token)
    return (
      <div className="space-y-4">
        {error && <Message tone="error">{error}</Message>}
        <Link href="/forgot-password" className="inline-flex w-full items-center justify-center rounded-full bg-ball px-6 py-3 text-lg font-bold text-[#0b0d12] shadow-md">
          Get a new link
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="New password" hint="at least 8 characters" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      <Field label="Once more" name="again" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      {error && (
        <Message tone="error">
          {error}{" "}
          {error === problem({ code: "INVALID_TOKEN" }) && (
            <Link href="/forgot-password" className="underline underline-offset-4">
              Get a new link
            </Link>
          )}
        </Message>
      )}
      <SubmitButton pending={pending}>{pending ? "Saving…" : "Save my new password"}</SubmitButton>
    </form>
  );
}
