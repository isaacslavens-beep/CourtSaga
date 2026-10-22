"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  findRivalries,
  placeByRating,
  reorderSlots,
  toFanEntry,
  toMatches,
  toStoredEntry,
  type FanEntry,
  type Match,
  type MatchRow,
  type RecordMeeting,
  type Rivalry,
  type StoredEntry,
} from "./library";

/** Asks a section to show where a match landed. `n` changes on every request. */
export type Spotlight = { target: "rank" | "story"; id: string; n: number };

// "demo": the landing page's sample log, where nothing is saved. "diary": a fan's own diary, saved as
// they go. "shared": someone's saga, opened from a share link, read-only.
export type Mode = "demo" | "diary" | "shared";

/** Server actions that keep a diary (app/(app)/actions.ts) */
export type Saver = {
  add: (id: string, entry: StoredEntry) => Promise<void>;
  update: (id: string, patch: Partial<StoredEntry>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
};

export type SaveState = "idle" | "saving" | "saved" | "error";

type LogStore = {
  mode: Mode;
  /** Every match the log knows: the logged ones, and any being looked at before it's logged */
  matches: Record<string, Match>;
  entries: Record<string, FanEntry>;
  /** Match ids in the fan's own ranking, best first */
  order: string[];
  /** Each rivalry's full record of meetings, by rivalry id */
  records: Record<string, RecordMeeting[]>;
  rivalries: Rivalry[];
  update: (id: string, patch: Partial<FanEntry>) => void;
  /** Put some matches (one tournament's) in a new order, in the ranking slots they already hold */
  reorder: (ids: string[]) => void;
  /** Log a match: it becomes a page in the diary */
  add: (id: string, entry: FanEntry) => void;
  /** Tear a page out */
  remove: (id: string) => void;
  /** Open a match from search, logged or not */
  view: (row: MatchRow) => void;
  /** The match open in the log section */
  focusId: string | null;
  setFocusId: (id: string) => void;
  /** The last "see it in the next step" request */
  spotlight: Spotlight | null;
  goTo: (target: Spotlight["target"], id: string) => void;
  /** Open a page of the diary in the log, from the saga */
  openInLog: (id: string) => void;
  saving: SaveState;
};

const LogContext = createContext<LogStore | null>(null);

type Props = {
  mode: Mode;
  /** The diary's matches from the database; the demo passes `matches`, already named, instead */
  rows?: MatchRow[];
  matches?: Record<string, Match>;
  entries: Record<string, StoredEntry>;
  order: string[];
  records?: Record<string, RecordMeeting[]>;
  focusId?: string | null;
  spotlight?: Spotlight | null;
  saver?: Saver;
  children: ReactNode;
};

// Edits to one page are sent together once typing pauses
const SAVE_DELAY = 600;

/** One log shared by every section on the page, so an edit in one shows up in the others. */
export function LogProvider({ mode, rows: initialRows, matches: fixed, entries: initialEntries, order: initialOrder, records = {}, focusId: initialFocus = null, spotlight: initialSpot = null, saver, children }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(() => Object.fromEntries((initialRows ?? []).map((r) => [r.id, r])));
  const [stored, setStored] = useState(initialEntries);
  const [order, setOrder] = useState(initialOrder);
  const [focusId, setFocusId] = useState(initialFocus);
  const [spotlight, setSpotlight] = useState(initialSpot);
  const [saving, setSaving] = useState<SaveState>("idle");

  const matches = useMemo(() => fixed ?? toMatches(Object.values(rows)), [fixed, rows]);
  const entries = useMemo(
    () => Object.fromEntries(Object.entries(stored).flatMap(([id, e]) => (matches[id] ? [[id, toFanEntry(e, matches[id])]] : []))),
    [stored, matches],
  );
  const rivalries = useMemo(() => findRivalries(entries, matches, records), [entries, matches, records]);

  /* ---------- Saving, for a fan's own diary ---------- */

  const pending = useRef(new Map<string, Partial<StoredEntry>>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(new Set<Promise<void>>());

  const track = useCallback((work: Promise<void>) => {
    setSaving("saving");
    inFlight.current.add(work);
    work
      .then(() => {
        inFlight.current.delete(work);
        if (!inFlight.current.size && !pending.current.size) setSaving("saved");
      })
      .catch(() => {
        inFlight.current.delete(work);
        setSaving("error");
      });
    return work;
  }, []);

  /** Send every waiting edit now, and wait until everything sent has landed. */
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (saver)
      for (const [id, patch] of pending.current) {
        pending.current.delete(id);
        track(saver.update(id, patch));
      }
    await Promise.allSettled([...inFlight.current]);
  }, [saver, track]);

  // Don't lose the last few keystrokes when the tab is hidden or closed
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void flush();
    };
  }, [flush]);

  const update = useCallback(
    (id: string, patch: Partial<FanEntry>) => {
      const m = matches[id];
      if (!m || mode === "shared") return;
      const change = toStoredEntry(patch, m);
      setStored((s) => (s[id] ? { ...s, [id]: { ...s[id], ...change } } : s));
      if (!saver || !stored[id]) return;
      pending.current.set(id, { ...pending.current.get(id), ...change });
      setSaving("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    },
    [matches, mode, saver, stored, flush],
  );

  const reorder = useCallback(
    (ids: string[]) => {
      if (mode === "shared") return;
      setOrder((o) => reorderSlots(o, ids));
      if (saver) track(saver.reorder(ids));
    },
    [mode, saver, track],
  );

  const add = useCallback(
    (id: string, fan: FanEntry) => {
      const m = matches[id];
      if (!m || stored[id] || mode === "shared") return;
      const entry = toStoredEntry(fan, m) as StoredEntry;
      setStored((s) => ({ ...s, [id]: entry }));
      setOrder((o) => placeByRating(o, (other) => stored[other]?.rating ?? 0, id, fan.rating));
      if (saver) track(saver.add(id, entry));
    },
    [matches, stored, mode, saver, track],
  );

  const remove = useCallback(
    (id: string) => {
      if (mode === "shared") return;
      pending.current.delete(id);
      setStored((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      setOrder((o) => o.filter((x) => x !== id));
      if (saver) track(saver.remove(id));
    },
    [mode, saver, track],
  );

  const view = useCallback((row: MatchRow) => {
    setRows((r) => (r[row.id] ? r : { ...r, [row.id]: row }));
    setFocusId(row.id);
  }, []);

  // In the demo the next step is further down the page; in a diary it's the next page of the site
  const goTo = useCallback(
    (target: Spotlight["target"], id: string) => {
      if (mode !== "diary") return setSpotlight((s) => ({ target, id, n: (s?.n ?? 0) + 1 }));
      void flush().then(() => router.push(`/${target === "rank" ? "rank" : "saga"}?m=${encodeURIComponent(id)}`));
    },
    [mode, flush, router],
  );

  const openInLog = useCallback(
    (id: string) => {
      if (mode === "diary") return router.push(`/log?m=${encodeURIComponent(id)}`);
      setFocusId(id);
    },
    [mode, router],
  );

  const value = useMemo(
    () => ({ mode, matches, entries, order, records, rivalries, update, reorder, add, remove, view, focusId, setFocusId, spotlight, goTo, openInLog, saving }),
    [mode, matches, entries, order, records, rivalries, update, reorder, add, remove, view, focusId, spotlight, goTo, openInLog, saving],
  );
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLog() {
  const store = useContext(LogContext);
  if (!store) throw new Error("useLog must be used inside <LogProvider>");
  return store;
}
