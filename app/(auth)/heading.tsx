import { accountsReady } from "@/lib/setup";

/** A form's heading, and a plain note in place of the form while accounts aren't switched on yet. */
export function AuthPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-2 text-muted">{intro}</p>}
      <div className="mt-6">
        {accountsReady() ? (
          children
        ) : (
          <p className="rounded-2xl bg-ball/25 px-4 py-3 font-medium">Accounts aren&apos;t switched on yet. In the meantime, the demo on the home page works.</p>
        )}
      </div>
    </>
  );
}
