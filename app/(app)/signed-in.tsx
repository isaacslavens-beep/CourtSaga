"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/* Who's signed in, at the foot of every page beside the data's credit, with a small way to log out;
   signed out, the ways in. Read in the browser, so the pages built ahead of time stay the same for
   everyone. */
export function SignedIn() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const [pending, setPending] = useState(false);
  if (isPending) return null;
  if (!data?.user)
    return (
      <span className="flex items-center gap-3">
        <Link href="/login" className="font-semibold text-court underline-offset-4 hover:underline">
          Log in
        </Link>
        <Link href="/signup" className="btn btn-primary btn-sm shrink-0">
          Sign up
        </Link>
      </span>
    );
  return (
    <span className="flex items-center gap-3">
      <span className="truncate">{data.user.email}</span>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await authClient.signOut();
          router.replace("/");
          router.refresh();
        }}
        className="btn btn-secondary btn-sm shrink-0"
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
    </span>
  );
}
