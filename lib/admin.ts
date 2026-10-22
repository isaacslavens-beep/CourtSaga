import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { diaryEntries, sagaShares, user } from "@/db/schema";

// The one account that can see /admin. Sign-up never checks an email, so this must be an exact match.
const ADMIN_EMAIL = "slavensisaac0@gmail.com";

export const isAdmin = (email: string) => email.toLowerCase() === ADMIN_EMAIL;

/** Every account, newest first, with how many matches it has logged and whether its saga is shared */
export async function listAccounts() {
  return getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      matches: sql<number>`(select count(*) from ${diaryEntries} where ${diaryEntries.userId} = ${user.id})`.mapWith(Number),
      shared: sql<boolean>`${sagaShares.slug} is not null`,
    })
    .from(user)
    .leftJoin(sagaShares, eq(sagaShares.userId, user.id))
    .orderBy(desc(user.createdAt));
}
