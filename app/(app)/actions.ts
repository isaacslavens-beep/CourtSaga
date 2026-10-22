"use server";

import { randomBytes } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Db } from "@/db";
import { diaryEntries, sagaShares } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { findMatch } from "@/lib/diary";
import { placeByRating, reorderSlots, type StoredEntry } from "../diary/library";

// Keeping a diary. Every action checks the session itself and only ever touches that fan's own rows.

const side = z.enum(["winner", "loser"]);
const entry = z.strictObject({
  watchedOn: z.enum(["Live", "TV", "Stream"]),
  watchedDate: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  setsSeen: z.array(z.number().int().min(0).max(6)).max(7),
  rating: z.number().int().min(1).max(5),
  cheering: side.nullable(),
  pick: z.strictObject({ side, sets: z.number().int().min(1).max(5) }).nullable(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8),
  note: z.string().max(2000),
  classic: z.boolean(),
});
const matchId = z.string().min(1).max(120);

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const columns = (e: Partial<StoredEntry>) => ({
  ...(e.watchedOn !== undefined && { watchedOn: e.watchedOn }),
  ...(e.watchedDate !== undefined && { watchedDate: e.watchedDate }),
  ...(e.setsSeen !== undefined && { setsSeen: [...new Set(e.setsSeen)].sort((a, b) => a - b) }),
  ...(e.rating !== undefined && { rating: e.rating }),
  ...(e.cheering !== undefined && { cheering: e.cheering }),
  ...(e.pick !== undefined && { pickWinner: e.pick?.side ?? null, pickSets: e.pick?.sets ?? null }),
  ...(e.tags !== undefined && { tags: [...new Set(e.tags)] }),
  ...(e.note !== undefined && { note: e.note }),
  ...(e.classic !== undefined && { classic: e.classic }),
});

/** One fan's writes at a time, so two tabs can't scramble the ranking */
async function lockDiary(tx: Tx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
}

async function currentOrder(tx: Tx, userId: string) {
  return tx
    .select({ id: diaryEntries.matchId, rating: diaryEntries.rating, position: diaryEntries.position })
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(asc(diaryEntries.position), asc(diaryEntries.createdAt));
}

/** Store a ranking: each match's position is its place in `order` */
async function saveOrder(tx: Tx, userId: string, order: string[]) {
  const places = JSON.stringify(order.map((id, position) => ({ id, position })));
  await tx.execute(sql`
    update diary_entries as d set position = v.position
    from jsonb_to_recordset(${places}::jsonb) as v(id text, position int)
    where d.user_id = ${userId} and d.match_id = v.id and d.position <> v.position`);
}

/** Log a match. It joins the ranking above every match rated lower. */
export async function addEntry(id: string, page: StoredEntry) {
  const user = await requireUser();
  const valid = { id: matchId.parse(id), entry: entry.parse(page) };
  if (!(await findMatch(valid.id))) throw new Error("That match can't be logged.");
  await getDb().transaction(async (tx) => {
    await lockDiary(tx, user.id);
    const rows = await currentOrder(tx, user.id);
    if (rows.some((r) => r.id === valid.id)) return;
    const ratings = new Map(rows.map((r) => [r.id, r.rating]));
    const order = placeByRating(
      rows.map((r) => r.id),
      (other) => ratings.get(other) ?? 0,
      valid.id,
      valid.entry.rating,
    );
    await tx.insert(diaryEntries).values({
      userId: user.id,
      matchId: valid.id,
      watchedOn: valid.entry.watchedOn,
      watchedDate: valid.entry.watchedDate,
      setsSeen: [],
      rating: valid.entry.rating,
      position: order.indexOf(valid.id),
      ...columns(valid.entry),
    });
    await saveOrder(tx, user.id, order);
  });
}

/** Change some answers on a page */
export async function updateEntry(id: string, patch: Partial<StoredEntry>) {
  const user = await requireUser();
  const change = columns(entry.partial().parse(patch));
  if (!Object.keys(change).length) return;
  await getDb()
    .update(diaryEntries)
    .set(change)
    .where(and(eq(diaryEntries.userId, user.id), eq(diaryEntries.matchId, matchId.parse(id))));
}

/** Tear a page out of the diary */
export async function removeEntry(id: string) {
  const user = await requireUser();
  await getDb()
    .delete(diaryEntries)
    .where(and(eq(diaryEntries.userId, user.id), eq(diaryEntries.matchId, matchId.parse(id))));
}

/** Put some matches (one tournament's) in a new order, in the ranking slots they already hold */
export async function reorderEntries(ids: string[]) {
  const user = await requireUser();
  const moving = z.array(matchId).max(10_000).parse(ids);
  if (new Set(moving).size !== moving.length) throw new Error("A match can only be in one place.");
  await getDb().transaction(async (tx) => {
    await lockDiary(tx, user.id);
    const order = (await currentOrder(tx, user.id)).map((r) => r.id);
    const known = new Set(order);
    // Ignore anything no longer in the diary (torn out in another tab, say)
    await saveOrder(tx, user.id, reorderSlots(order, moving.filter((m) => known.has(m))));
  });
}

/* ---------- Sharing the saga ---------- */

// 128 random bits: a link can't be guessed, only given
const newSlug = () => randomBytes(16).toString("base64url");

/** The saga's share link, made on first use */
export async function shareSaga() {
  const user = await requireUser();
  const [row] = await getDb().insert(sagaShares).values({ userId: user.id, slug: newSlug() }).onConflictDoNothing().returning({ slug: sagaShares.slug });
  if (row) return row.slug;
  const [existing] = await getDb().select({ slug: sagaShares.slug }).from(sagaShares).where(eq(sagaShares.userId, user.id));
  return existing.slug;
}

/** A new link; the old one stops working */
export async function renewShareLink() {
  const user = await requireUser();
  const slug = newSlug();
  await getDb()
    .insert(sagaShares)
    .values({ userId: user.id, slug })
    .onConflictDoUpdate({ target: sagaShares.userId, set: { slug, createdAt: new Date() } });
  return slug;
}

/** Turn the link off */
export async function stopSharing() {
  const user = await requireUser();
  await getDb().delete(sagaShares).where(eq(sagaShares.userId, user.id));
}
