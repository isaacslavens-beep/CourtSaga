import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { seasonRange } from "@/lib/diary";
import { accountsReady } from "@/lib/setup";
import { SignUpForm } from "../forms";
import { AuthPage } from "../heading";

export const metadata: Metadata = { title: "Sign up · CourtSaga" };

/** Which seasons are in, and when the next one comes: "Every tour-level match from 2003 to 2025 …" */
async function Seasons() {
  await connection();
  const range = accountsReady() ? await seasonRange() : null;
  if (!range) return null;
  return (
    <p className="-mt-3 text-muted">
      Every tour-level singles match from {range[0]} to {range[1]} is ready to log. {range[1] + 1} matches will be added once that season ends.
    </p>
  );
}

export default function SignUpPage() {
  return (
    <AuthPage title="Sign up" intro="Free. All you need is an email and a password.">
      <Suspense>
        <Seasons />
      </Suspense>
      <div className="mt-6">
        <SignUpForm />
      </div>
    </AuthPage>
  );
}
