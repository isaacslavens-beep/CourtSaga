import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "../forms";
import { AuthPage } from "../heading";

export const metadata: Metadata = { title: "Choose a new password · CourtSaga" };

export default function ResetPasswordPage() {
  return (
    <AuthPage title="Choose a new password">
      {/* Reads the link's ?token= */}
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthPage>
  );
}
