import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isAdmin, listAccounts } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { CourtBand } from "../../court-band";
import { OpeningDiary } from "../loading-page";

export const metadata: Metadata = { title: "Accounts · CourtSaga", robots: { index: false } };

// Not linked from anywhere. Anyone but the admin account gets a 404, as if the page weren't there.
export default function AdminPage() {
  return (
    <div className="court-uso flex flex-1 flex-col">
      <CourtBand>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Accounts</h1>
      </CourtBand>
      <section className="court-page flex-1 pb-16 pt-10 sm:pt-12">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-8">
          <Suspense fallback={<OpeningDiary />}>
            <Accounts />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

const joined = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function Accounts() {
  const me = await requireUser();
  if (!isAdmin(me.email)) notFound();
  const accounts = await listAccounts();
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-7">
      <h2 className="font-display text-2xl font-bold tracking-tight">{accounts.length === 1 ? "1 account" : `${accounts.length} accounts`}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-4 font-semibold">Name</th>
              <th className="py-2 pr-4 font-semibold">Email</th>
              <th className="py-2 pr-4 font-semibold">Joined</th>
              <th className="py-2 pr-4 text-right font-semibold">Matches</th>
              <th className="py-2 font-semibold">Shared</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="py-2 pr-4 font-medium">{a.name}</td>
                <td className="py-2 pr-4 break-all">{a.email}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{joined.format(a.createdAt)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{a.matches}</td>
                <td className="py-2">{a.shared ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
