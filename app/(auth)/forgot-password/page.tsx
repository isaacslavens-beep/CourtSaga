import type { Metadata } from "next";
import { ForgotPasswordForm } from "../forms";
import { AuthPage } from "../heading";

export const metadata: Metadata = { title: "Forgot your password? · CourtSaga" };

export default function ForgotPasswordPage() {
  return (
    <AuthPage title="Forgot your password?" intro="Enter the email you signed up with and we'll send a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthPage>
  );
}
