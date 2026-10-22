import type { Metadata } from "next";
import { Suspense } from "react";
import { LogInForm } from "../forms";
import { AuthPage } from "../heading";

export const metadata: Metadata = { title: "Log in · CourtSaga" };

export default function LogInPage() {
  return (
    <AuthPage title="Log in">
      {/* Reads ?next=, the page to go back to */}
      <Suspense>
        <LogInForm />
      </Suspense>
    </AuthPage>
  );
}
