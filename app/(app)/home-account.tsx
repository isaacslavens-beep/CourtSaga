"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

/** The home page's way in: making an account when signed out, the saga once signed in. Read in the browser, so the page stays prebuilt */
export function HomeAccount() {
  const { data, isPending } = authClient.useSession();
  if (isPending) return null;
  return data?.user ? (
    <Link href="/saga" className="btn btn-primary btn-lg">
      Open the saga
    </Link>
  ) : (
    <Link href="/signup" className="btn btn-primary btn-lg">
      Make an account
    </Link>
  );
}
