"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Message, SubmitButton, problem } from "../../form-ui";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("again"))) return setError("Those two new passwords don't match.");
    setPending(true);
    setError(null);
    setDone(false);
    const { error } = await authClient.changePassword({ currentPassword: String(form.get("current")), newPassword, revokeOtherSessions: true });
    setPending(false);
    if (error) return setError(problem(error));
    formEl.reset();
    setDone(true);
  }

  return (
    <form method="post" onSubmit={submit} className="space-y-4">
      <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
      <Field label="New password" hint="at least 8 characters" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      <Field label="New password, once more" name="again" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      {error && <Message tone="error">{error}</Message>}
      {done && <Message tone="done">Your password is changed. Anywhere else you were logged in, you&apos;ll need it to log in again.</Message>}
      <SubmitButton pending={pending}>{pending ? "Saving…" : "Change password"}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!window.confirm("Delete your account and every match you've starred? This can't be undone.")) return;
    setPending(true);
    setError(null);
    const { error } = await authClient.deleteUser({ password: String(form.get("password")) });
    if (error) {
      setPending(false);
      return setError(problem(error));
    }
    // Back to the landing page, with nothing of the diary left in the router's cache
    router.replace("/");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={submit} className="space-y-4">
      <Field label="Your password, to be sure it's you" name="password" type="password" autoComplete="current-password" required />
      {error && <Message tone="error">{error}</Message>}
      <SubmitButton pending={pending} danger>
        {pending ? "Deleting…" : "Delete my account"}
      </SubmitButton>
    </form>
  );
}

export function LogOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
      className="cursor-pointer rounded-full border-2 border-line px-4 py-1.5 font-semibold transition hover:border-court hover:text-court disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
