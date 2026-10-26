import Link from "next/link";
import { DataCredit } from "../credits";
import { Logo } from "../ui";

/* Signing up and logging in: the site's bar, and one panel on the page under it. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-header text-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-8">
          <Logo />
          <Link href="/" className="ml-auto text-sm font-semibold text-white/75 transition-colors hover:text-white">
            ← Back
          </Link>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16 pt-8 sm:pt-14">
        <div className="panel h-fit w-full max-w-md p-6 sm:p-8">{children}</div>
      </main>
      <footer className="border-t border-line bg-surface px-4 py-5 text-center text-xs text-muted sm:px-8">
        <DataCredit />
      </footer>
    </div>
  );
}
