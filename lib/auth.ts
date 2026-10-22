import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { account, rateLimit, session, user, verification } from "@/db/schema";

// Accounts are an email and a password, nothing else: no email check at sign-up, no social logins, no
// magic links, no 2FA, and no password reset, so CourtSaga never sends an email.

function createAuth() {
  return betterAuth({
    appName: "CourtSaga",
    // Production sets BETTER_AUTH_URL; previews and local development use the host they're served from
    baseURL: process.env.BETTER_AUTH_URL || { allowedHosts: ["localhost:*", "127.0.0.1:*", "*.vercel.app"], protocol: "auto" },
    trustedOrigins: ["https://courtsaga.com", "https://www.courtsaga.com"],
    database: drizzleAdapter(getDb(), { provider: "pg", schema: { user, session, account, verification, rateLimit } }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    // Deleting the account deletes the diary with it (see the foreign keys in db/schema.ts)
    user: { deleteUser: { enabled: true } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    // Per IP address. Stored in the database, so every server instance counts together.
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 5 * 60, max: 10 },
        "/sign-up/email": { window: 60 * 60, max: 10 },
        "/change-password": { window: 10 * 60, max: 10 },
        "/delete-user": { window: 10 * 60, max: 5 },
      },
    },
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Made on first use, so building the site never needs the database or the secret. */
export function getAuth() {
  return (instance ??= createAuth());
}

/** The signed-in fan, or null. Reads the request, so call it inside a Suspense boundary. */
export async function getSession() {
  // Read the request first: a prerender stops there, before anything touches the database
  const request = await headers();
  return getAuth().api.getSession({ headers: request });
}

/** The signed-in fan; anyone else goes to the log-in page. */
export async function requireUser() {
  const signedIn = await getSession();
  if (!signedIn) redirect("/login");
  return signedIn.user;
}
