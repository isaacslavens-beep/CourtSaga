"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { matches, sampleLog, type FanEntry } from "./library";

/** Asks a section to show where a match landed. `n` changes on every request. */
export type Spotlight = { target: "rank" | "story"; id: string; n: number };

type LogStore = {
  entries: Record<string, FanEntry>;
  /** Match ids in the fan's own ranking, best first */
  order: string[];
  update: (id: string, patch: Partial<FanEntry>) => void;
  /** Swap two matches in the ranking */
  swap: (a: string, b: string) => void;
  /** The match open in the log section */
  focusId: string;
  setFocusId: (id: string) => void;
  /** The last "see it in the next step" request */
  spotlight: Spotlight | null;
  goTo: (target: Spotlight["target"], id: string) => void;
};

const LogContext = createContext<LogStore | null>(null);

/** One log shared by every demo section, so an edit in one shows up in the others. */
export function LogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState(sampleLog);
  const [focusId, setFocusId] = useState("wim25");
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [order, setOrder] = useState(() =>
    [...matches]
      .sort((a, b) => sampleLog[b.id].rating - sampleLog[a.id].rating || b.date.localeCompare(a.date))
      .map((m) => m.id),
  );

  const update = useCallback(
    (id: string, patch: Partial<FanEntry>) => setEntries((e) => ({ ...e, [id]: { ...e[id], ...patch } })),
    [],
  );
  const swap = useCallback(
    (a: string, b: string) =>
      setOrder((o) => {
        const next = [...o];
        const i = next.indexOf(a);
        const j = next.indexOf(b);
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      }),
    [],
  );

  const goTo = useCallback(
    (target: Spotlight["target"], id: string) => setSpotlight((s) => ({ target, id, n: (s?.n ?? 0) + 1 })),
    [],
  );

  const value = useMemo(
    () => ({ entries, order, update, swap, focusId, setFocusId, spotlight, goTo }),
    [entries, order, update, swap, focusId, spotlight, goTo],
  );
  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export function useLog() {
  const store = useContext(LogContext);
  if (!store) throw new Error("useLog must be used inside <LogProvider>");
  return store;
}
