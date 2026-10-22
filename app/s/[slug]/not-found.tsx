import Link from "next/link";

export default function SagaNotShared() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight">This saga isn&apos;t shared</h1>
      <p className="mt-3 text-lg text-muted">The link may have been turned off or replaced by a new one. Ask whoever sent it for the latest.</p>
      <Link href="/" className="mt-6 inline-flex rounded-full bg-ball px-5 py-2.5 font-bold text-[#0b0d12] shadow-md">
        What&apos;s CourtSaga?
      </Link>
    </div>
  );
}
