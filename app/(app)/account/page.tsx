import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { pageCount } from "@/lib/diary";
import { OpeningDiary } from "../loading-page";
import { ChangePasswordForm, DeleteAccountForm, LogOutButton } from "./forms";

export const metadata: Metadata = { title: "Your account · CourtSaga" };

export default function AccountPage() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-8">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Your account</h1>
        <Suspense fallback={<OpeningDiary />}>
          <Account />
        </Suspense>
      </div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-7">
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function Account() {
  const user = await requireUser();
  const pages = await pageCount(user.id);
  return (
    <div className="mt-8 space-y-6">
      <Card title={user.name || "You"}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-muted">
            {user.email}
            <br />
            {pages === 1 ? "1 page" : `${pages} pages`} in your diary
          </p>
          <LogOutButton />
        </div>
      </Card>
      <Card title="Change your password">
        <ChangePasswordForm />
      </Card>
      <Card title="Delete your account">
        <p className="mb-4 text-muted">
          Deleting your account deletes your diary with it: every page, your ranking, your saga and its share link. It can&apos;t be undone.
        </p>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
