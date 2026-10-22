import type { Metadata } from "next";
import { SignUpForm } from "../forms";
import { AuthPage } from "../heading";

export const metadata: Metadata = { title: "Sign up · CourtSaga" };

export default function SignUpPage() {
  return (
    <AuthPage title="Sign up" intro="Free. All you need is an email and a password.">
      <SignUpForm />
    </AuthPage>
  );
}
