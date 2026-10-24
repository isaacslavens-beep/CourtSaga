"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/* Who's signed in, at the foot of every page beside the data's credit, with a small way to log out.
   Read in the browser, so the pages built ahead of time stay the same for everyone. */
export function SignedIn() {
  const router = useRouter();
  const { data } = authClient.useSession();
  const [pending, setPending] = useState(false);
  if (!data?.user) return null;
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
        className="shrink-0 cursor-pointer rounded-full border border-line px-2.5 py-0.5 font-semibold transition hover:border-court hover:text-court disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
    </span>
  );
}
