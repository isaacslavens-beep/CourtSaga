import "server-only";
import { desc, eq, gt, max, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { diaryEntries, matches, sagaShares, session, user } from "@/db/schema";

// The one account that can see /admin. Sign-up never checks an email, so this must be an exact match.
const ADMIN_EMAIL = "slavensisaac0@gmail.com";

export const isAdmin = (email: string) => email.toLowerCase() === ADMIN_EMAIL;

/** Every account, newest first: how many matches it has logged, when it was last seen and its share link */
export async function listAccounts() {
  return getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      matches: sql<number>`(select count(*) from ${diaryEntries} where ${diaryEntries.userId} = ${user.id})`.mapWith(Number),
      lastLogged: sql<Date | null>`(select max(${diaryEntries.createdAt}) from ${diaryEntries} where ${diaryEntries.userId} = ${user.id})`.mapWith(
        diaryEntries.createdAt,
      ),
      // Sessions are refreshed about once a day of use, and diary edits count too
      lastActive: sql<Date | null>`greatest(
        (select max(${session.updatedAt}) from ${session} where ${session.userId} = ${user.id}),
        (select max(${diaryEntries.updatedAt}) from ${diaryEntries} where ${diaryEntries.userId} = ${user.id})
      )`.mapWith(session.updatedAt),
      slug: sagaShares.slug,
    })
    .from(user)
    .leftJoin(sagaShares, eq(sagaShares.userId, user.id))
    .orderBy(desc(user.createdAt));
}

/** The last week across the site, and the latest tournament in the data (play dates are only estimates) */
export async function siteStats() {
  const db = getDb();
  const week = sql`now() - interval '7 days'`;
  const [[logged], [weekLogged], [signups], [active], [latest]] = await Promise.all([
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(diaryEntries),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(diaryEntries).where(gt(diaryEntries.createdAt, week)),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(user).where(gt(user.createdAt, week)),
    db.select({ n: sql<number>`count(distinct ${session.userId})`.mapWith(Number) }).from(session).where(gt(session.updatedAt, week)),
    db.select({ startDate: max(matches.startDate) }).from(matches).where(eq(matches.searchable, true)),
  ]);
  return { logged: logged.n, weekLogged: weekLogged.n, signups: signups.n, active: active.n, latestEvent: latest.startDate };
}

/** Anyone's name, for reading their saga from /admin */
export async function accountName(id: string) {
  const [row] = await getDb().select({ id: user.id, name: user.name }).from(user).where(eq(user.id, id));
  return row ?? null;
}
