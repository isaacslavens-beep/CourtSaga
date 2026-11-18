"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SlamLogo } from "../match-ui";
import { Chevron, SearchIcon } from "../ui";
import { Avatar, PlayerInitials } from "./fun";
import { matchHref, roundName, scoreText, type Tour } from "./library";
import {
  PAGE_SIZE,
  emptySearch,
  examples,
  facetsFor,
  formatValue,
  inputStep,
  nationNames,
  newestFirst,
  oddById,
  oddities,
  readSearch,
  sidesOf,
  statById,
  statGroups,
  statName,
  stats,
  writeSearch,
  type FacetId,
  type Hist,
  type MatchesResult,
  type Range,
  type ResultRow,
  type Search,
  type Side,
  type StatDef,
  type Suggestion,
} from "./matches";

/* Matches: every match a tour has played, sorted by any number and filtered by anything. The search lives
   in the address (?s=aces.b.d&t=tier_slam…), so the back button, a reload and a shared link all open the
   same list; each change replaces the address and asks /api/matches for the page. */

/* ---------- The search in the address ---------- */

const searchEvent = "courtsaga-search";
const subscribeSearch = (on: () => void) => {
  window.addEventListener("popstate", on);
  window.addEventListener(searchEvent, on);
  return () => {
    window.removeEventListener("popstate", on);
    window.removeEventListener(searchEvent, on);
  };
};
function putSearch(s: Search) {
  const qs = writeSearch(s).toString();
  history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}`);
  window.dispatchEvent(new Event(searchEvent));
}
const sameSearch = (a: string, b: string) => writeSearch(readSearch(new URLSearchParams(a))).toString() === writeSearch(readSearch(new URLSearchParams(b))).toString();

/* ---------- Small pieces ---------- */

function Chip({ children, onRemove, onClick, open = false, title }: { children: ReactNode; onRemove: () => void; onClick?: () => void; open?: boolean; title?: string }) {
  return (
    <span className={`inline-flex max-w-full items-stretch overflow-hidden rounded-[4px] border text-sm ${open ? "border-foreground bg-sunk" : "border-line-strong bg-surface"}`}>
      {onClick ? (
        <button type="button" onClick={onClick} title={title} aria-expanded={open} className="min-w-0 cursor-pointer truncate px-2 py-1 text-left font-semibold hover:bg-sunk">
          {children}
        </button>
      ) : (
        <span className="min-w-0 truncate px-2 py-1 font-semibold">{children}</span>
      )}
      <button type="button" onClick={onRemove} aria-label="Remove" className="cursor-pointer border-l border-line px-1.5 text-muted hover:bg-sunk hover:text-fault">
        ×
      </button>
    </span>
  );
}

const selectClass = "field w-auto cursor-pointer py-1.5 pr-8 text-[0.9375rem] font-semibold";

/** Every statistic, by group, as one drop-down */
function StatSelect({ value, onChange, label, withDate = false, id }: { value: string; onChange: (id: string) => void; label: string; withDate?: boolean; id?: string }) {
  return (
    <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      {withDate && <option value="date">Date played</option>}
      {statGroups.map((g) => (
        <optgroup key={g.id} label={g.label}>
          {stats
            .filter((s) => s.group === g.id)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

function SideSelect({ stat, value, onChange, player, label }: { stat: StatDef; value: Side; onChange: (s: Side) => void; player: string | null; label: string }) {
  const sides = sidesOf(stat, !!player);
  if (sides.length === 1) return null;
  const names: Record<Side, string> = { w: "the winner", l: "the loser", x: "either player", b: "both players", m: "", p: player ?? "the player", o: player ? `${player}'s opponent` : "the opponent" };
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Side)} className={selectClass}>
      {sides.map((s) => (
        <option key={s} value={s}>
          {s === "b" ? "both players, added up" : names[s]}
        </option>
      ))}
    </select>
  );
}

/** A histogram of a number across the matches found: where the extremes are, how far out they go */
function Histogram({ hist, stat, range, onPick, height = 56 }: { hist: Hist; stat: StatDef; range?: { min: number | null; max: number | null }; onPick?: (lo: number, hi: number) => void; height?: number }) {
  const top = Math.max(...hist.bins);
  const whole = hist.step === Math.round(hist.step);
  const binLo = (i: number) => hist.lo + i * hist.step;
  const binHi = (i: number) => (whole ? binLo(i) + hist.step - 1 : binLo(i + 1));
  const inRange = (i: number) => !range || ((range.min === null || binHi(i) >= range.min) && (range.max === null || binLo(i) <= range.max));
  const show = (v: number) => formatValue(stat.format, v);
  return (
    <figure className="min-w-0">
      <div className="flex items-end gap-px" style={{ height }} role="img" aria-label={`How ${stat.label.toLowerCase()} spreads over ${hist.n.toLocaleString("en-GB")} matches, from ${show(hist.lo)} to ${show(hist.hi)}`}>
        {hist.bins.map((n, i) => {
          const label = `${whole && hist.step === 1 ? show(binLo(i)) : `${show(binLo(i))} to ${show(binHi(i))}`}: ${n.toLocaleString("en-GB")} match${n === 1 ? "" : "es"}`;
          const bar = (
            <span
              className={`block w-full rounded-t-[1px] ${inRange(i) ? "bg-court" : "bg-line-strong"}`}
              style={{ height: n ? `${Math.max(2, (Math.sqrt(n) / Math.sqrt(top)) * 100)}%` : 0 }}
            />
          );
          return onPick && n ? (
            <button key={i} type="button" title={`${label}. Click to keep only these.`} aria-label={label} onClick={() => onPick(binLo(i), binHi(i))} className="flex h-full flex-1 cursor-pointer items-end hover:opacity-70">
              {bar}
            </button>
          ) : (
            <span key={i} title={label} className="flex h-full flex-1 items-end">
              {bar}
            </span>
          );
        })}
      </div>
      <figcaption className="mt-1 flex justify-between gap-3 text-xs tabular-nums text-muted">
        <span>{show(hist.lo)}</span>
        <span className="truncate">median {show(hist.q[2])} · bars on a square-root scale, so the rare extremes show</span>
        <span>{show(hist.hi)}</span>
      </figcaption>
    </figure>
  );
}

/* ---------- Finding a player, an event or a country ---------- */

function SearchBox({ tour, onPick, placeholder }: { tour: Tour; onPick: (s: Suggestion | { kind: "year"; year: number }) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const [found, setFound] = useState<{ q: string; list: Suggestion[] }>({ q: "", list: [] });
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(false);
  const q = text.trim();
  const year = /^(19|20)\d\d$/.test(q) ? Number(q) : null;

  useEffect(() => {
    if (q.length < 2) return;
    const stop = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/matches/find?tour=${tour}&q=${encodeURIComponent(q)}`, { signal: stop.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((list: Suggestion[]) => setFound({ q, list }))
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(timer);
      stop.abort();
    };
  }, [q, tour]);

  const list: (Suggestion | { kind: "year"; year: number })[] = [...(year ? [{ kind: "year" as const, year }] : []), ...(found.q === q && q.length >= 2 ? found.list : [])];
  const pick = (s: (typeof list)[number]) => {
    onPick(s);
    setText("");
    setOpen(false);
    setAt(0);
  };
  const shown = open && q.length >= 2 && list.length > 0;
  return (
    <div className="relative">
      <SearchIcon className="left-3.5" />
      <input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setAt(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAt((a) => Math.min(list.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAt((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && shown) {
            e.preventDefault();
            pick(list[Math.min(at, list.length - 1)]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        aria-label="Add a player, a tournament, a country or a year"
        role="combobox"
        aria-expanded={shown}
        aria-controls="match-suggestions"
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        className="field py-2.5 pl-10 text-[1.0625rem]"
      />
      {shown && (
        <ul id="match-suggestions" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-line-strong bg-surface py-1 shadow-lg">
          {list.map((s, i) => {
            const key = s.kind === "player" ? `p${s.tour}${s.id}` : s.kind === "event" ? `e${s.name}` : s.kind === "nation" ? `c${s.ioc}` : `y${s.year}`;
            return (
              <li key={key} role="option" aria-selected={i === at}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  onMouseEnter={() => setAt(i)}
                  className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left ${i === at ? "bg-sunk" : ""}`}
                >
                  <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {s.kind === "player" ? (s.tour === tour ? "Player" : s.tour === "atp" ? "Men" : "Women") : s.kind === "event" ? "Event" : s.kind === "nation" ? "Country" : "Season"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {s.kind === "player" ? s.name : s.kind === "event" ? s.name : s.kind === "nation" ? (nationNames[s.ioc] ?? s.ioc) : s.year}
                    {s.kind === "player" && s.ioc && <span className="font-normal text-muted"> · {s.ioc}</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {s.kind === "player"
                      ? `${s.matches.toLocaleString("en-GB")} matches, ${s.years[0] === s.years[1] ? s.years[0] : `${s.years[0]}–${s.years[1]}`}`
                      : s.kind === "event" || s.kind === "nation"
                        ? `${s.matches.toLocaleString("en-GB")} matches`
                        : "every match that year"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Editing a filter ---------- */

const percentiles: { label: string; pick: (h: Hist) => { min: number | null; max: number | null } }[] = [
  { label: "Top 1%", pick: (h) => ({ min: h.q[4], max: null }) },
  { label: "Top 10%", pick: (h) => ({ min: h.q[3], max: null }) },
  { label: "Bottom 10%", pick: (h) => ({ min: null, max: h.q[1] }) },
  { label: "Bottom 1%", pick: (h) => ({ min: null, max: h.q[0] }) },
];

function RangeEditor({ range, hist, player, onChange }: { range: Range; hist: Hist | null; player: string | null; onChange: (r: Range) => void }) {
  const stat = statById.get(range.stat)!;
  const [min, setMin] = useState(range.min === null ? "" : String(range.min));
  const [max, setMax] = useState(range.max === null ? "" : String(range.max));
  // Typing settles for a moment before the search runs
  useEffect(() => {
    const timer = setTimeout(() => {
      const lo = min.trim() === "" || !Number.isFinite(Number(min)) ? null : Number(min);
      const hi = max.trim() === "" || !Number.isFinite(Number(max)) ? null : Number(max);
      if (lo !== range.min || hi !== range.max) onChange({ ...range, min: lo, max: hi });
    }, 450);
    return () => clearTimeout(timer);
  }, [min, max]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = inputStep(stat.format);
  const unit = stat.format === "pct" ? "%" : stat.format === "minutes" ? "minutes" : stat.format === "cm" ? "cm" : stat.format === "seconds" ? "seconds" : stat.format === "age" ? "years" : stat.format === "tiebreak" ? "points played" : stat.format === "set" ? "games played" : stat.format === "times" ? "times" : "";
  const set = (r: { min: number | null; max: number | null }) => {
    const round = (v: number | null) => (v === null ? null : step < 1 ? Math.round(v * 10) / 10 : Math.round(v));
    setMin(r.min === null ? "" : String(round(r.min)));
    setMax(r.max === null ? "" : String(round(r.max)));
  };
  return (
    <div className="well space-y-3 p-3 sm:p-4">
      <p className="text-sm text-muted">{stat.hint}</p>
      <div className="flex flex-wrap items-end gap-3">
        <SideSelect stat={stat} value={range.side} onChange={(side) => onChange({ ...range, side })} player={player} label="Whose number" />
        <label className="text-sm font-semibold">
          At least
          <input type="number" inputMode="decimal" step={step} value={min} onChange={(e) => setMin(e.target.value)} className="field mt-1 block w-28 py-1.5" />
        </label>
        <label className="text-sm font-semibold">
          At most
          <input type="number" inputMode="decimal" step={step} value={max} onChange={(e) => setMax(e.target.value)} className="field mt-1 block w-28 py-1.5" />
        </label>
        {unit && <span className="pb-2 text-sm text-muted">{unit}</span>}
      </div>
      {hist && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Quick picks:</span>
            {percentiles.map((p) => (
              <button key={p.label} type="button" onClick={() => set(p.pick(hist))} className="tag">
                {p.label}
              </button>
            ))}
          </div>
          <Histogram hist={hist} stat={stat} range={range} onPick={(lo, hi) => set({ min: lo, max: hi })} height={44} />
        </>
      )}
    </div>
  );
}

function FacetEditor({ id, label, values, chosen, counts, onChange }: { id: FacetId; label: string; values: { id: string; label: string }[]; chosen: string[]; counts: Record<string, number> | undefined; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="well p-3 sm:p-4">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => {
          const on = chosen.includes(v.id);
          const n = counts?.[v.id] ?? 0;
          return (
            <label key={v.id} className={`flex cursor-pointer items-center gap-2 rounded-[4px] border px-2.5 py-1.5 text-sm ${on ? "border-foreground bg-surface font-semibold" : "border-line bg-surface"} ${!n && !on ? "opacity-50" : ""}`}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? chosen.filter((c) => c !== v.id) : [...chosen, v.id])} className="accent-[var(--court)]" name={`${id}-${v.id}`} />
              {v.label}
              <span className="text-xs tabular-nums text-muted">{n.toLocaleString("en-GB")}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------- The results ---------- */

function Cell({ row, stat, side, value, w, l, strong }: { row: ResultRow; stat: StatDef; side: Side; value: number | null; w?: number | null; l?: number | null; strong: boolean }) {
  const both = (side === "x" || side === "b") && (w !== undefined || l !== undefined);
  return (
    <span className="block text-right">
      <span className={`stat block leading-none ${strong ? "text-2xl" : "text-lg text-muted"}`}>{formatValue(stat.format, value)}</span>
      {/* Each player's own number: one under the other on a phone */}
      {both && (
        <span className="mt-0.5 flex flex-col items-end text-[11px] tabular-nums text-muted sm:flex-row sm:justify-end sm:gap-1 sm:whitespace-nowrap">
          <span className="max-w-full truncate">
            {row.w.name.split(" ").pop()} {formatValue(stat.format, w ?? null)}
          </span>
          <span aria-hidden className="max-sm:hidden">
            ·
          </span>
          <span className="max-w-full truncate">
            {row.l.name.split(" ").pop()} {formatValue(stat.format, l ?? null)}
          </span>
        </span>
      )}
    </span>
  );
}

function ResultLine({ row, columns, focus }: { row: ResultRow; columns: { stat: StatDef; side: Side }[]; focus: string | null }) {
  const label = `${row.event} ${row.season} · ${roundName({ round: row.round, event: row.event, tour: row.w.key.startsWith("wta") ? "wta" : "atp" })}`;
  const won = focus ? row.w.key === focus : null;
  const who = (p: ResultRow["w"], winner: boolean) => (
    <span className={winner ? "font-semibold" : "text-muted"}>
      {p.name}
      {p.seed ? <sup className="ml-0.5 text-[10px] font-normal text-muted">{p.seed}</sup> : null}
    </span>
  );
  return (
    <Link href={matchHref(row.id)} prefetch={false} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-sunk sm:px-5">
      <span className={`rank ${row.n === 1 ? "rank-first" : ""}`}>{row.n}</span>
      <span className="flex shrink-0 -space-x-2 max-sm:hidden">
        <Avatar name={row.w.name} size="h-8 w-8 text-xs ring-2 ring-surface" />
        <Avatar name={row.l.name} size="h-8 w-8 text-xs ring-2 ring-surface" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
          <SlamLogo event={row.event} size="h-4 w-4" />
          <span className="sm:truncate">{label}</span>
          {won !== null && <span className={`ml-1 shrink-0 rounded-[3px] px-1.5 text-[11px] font-bold ${won ? "bg-ball text-foreground" : "bg-sunk text-muted ring-1 ring-inset ring-line"}`}>{won ? "Won" : "Lost"}</span>}
        </span>
        <span className="block text-[0.9375rem] leading-snug sm:truncate">
          {who(row.w, true)} <span className="text-muted">beat</span> {who(row.l, false)} <span className="whitespace-nowrap text-sm tabular-nums text-muted">{scoreText(row.score)}</span>
        </span>
      </span>
      {columns.map((c, i) => (
        <span key={i} className={`w-20 shrink-0 sm:w-28 ${i > 0 ? "max-sm:hidden" : ""}`}>
          <Cell row={row} stat={c.stat} side={c.side} {...row.cells[i]} strong={i === 0} />
        </span>
      ))}
      <Chevron className="h-3 w-3 shrink-0 text-court opacity-0 transition-opacity group-hover:opacity-100 max-sm:hidden" />
    </Link>
  );
}

/* ---------- The page ---------- */

type Loaded = { key: string; result: MatchesResult | null; error: boolean };

export function MatchesView({ tour }: { tour: Tour }) {
  const qs = useSyncExternalStore(subscribeSearch, () => location.search.slice(1), () => null);
  const search = useMemo(() => (qs === null ? null : readSearch(new URLSearchParams(qs))), [qs]);
  const key = search ? `${tour}?${writeSearch(search).toString()}` : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // "r0", "t:tier"
  const [adding, setAdding] = useState("");
  const [moreExamples, setMoreExamples] = useState(false);
  const [allOdd, setAllOdd] = useState(false); // on a phone, every oddity rather than the first four
  const results = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!key) return;
    const stop = new AbortController();
    fetch(`/api/matches?tour=${tour}&${key.split("?")[1]}`, { signal: stop.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((result: MatchesResult | null) => setLoaded({ key, result, error: !result }))
      .catch((e) => e?.name !== "AbortError" && setLoaded({ key, result: null, error: true }));
    return () => stop.abort();
  }, [key, tour]);

  const s = search ?? emptySearch;
  const result = loaded?.result ?? null;
  const pending = !loaded || loaded.key !== key;
  const facets = useMemo(() => facetsFor(tour), [tour]);
  const firstPlayer = s.players[0] ? (result?.people[s.players[0]]?.name ?? null) : null;
  // Named in full in the controls ("Serena Williams's aces"), as a surname alone can be two players
  const playerShort = firstPlayer;

  const change = (next: Partial<Search>, keepPage = false) => putSearch({ ...s, ...next, page: keepPage ? (next.page ?? s.page) : 0 });
  const sortStat = s.sort.stat === "date" ? null : statById.get(s.sort.stat)!;
  const setSort = (stat: string) => {
    if (stat === "date") return change({ sort: { ...newestFirst, dir: s.sort.stat === "date" ? s.sort.dir : "desc" } });
    const def = statById.get(stat)!;
    const sides = sidesOf(def, s.players.length > 0);
    const side = sides.includes(s.sort.side) ? s.sort.side : sides.includes("b") ? "b" : sides[0];
    change({ sort: { stat, side, dir: s.sort.stat === "date" ? "desc" : s.sort.dir } });
  };
  const addFilter = (value: string) => {
    setAdding("");
    if (value.startsWith("t:")) {
      const f = value.slice(2) as FacetId;
      setEditing(`t:${f}`);
      if (!s.facets[f]) change({ facets: { ...s.facets, [f]: [] } });
      return;
    }
    const def = statById.get(value)!;
    const sides = sidesOf(def, s.players.length > 0);
    const side: Side = sides.includes("x") ? "x" : sides[0];
    // A new range starts open (only the matches with the number), its editor open to set the bounds
    setEditing(`r${s.ranges.length}`);
    change({ ranges: [...s.ranges, { stat: value, side, min: null, max: null }] });
  };
  const pickSuggestion = (x: Suggestion | { kind: "year"; year: number }) => {
    if (x.kind === "player") {
      if (x.tour !== tour) {
        router.push(`${x.tour === "atp" ? "/matches" : "/matches/women"}?p=${encodeURIComponent(x.id)}`);
        return;
      }
      if (s.players.includes(x.id)) return;
      change({ players: [...s.players, x.id].slice(-2) });
    } else if (x.kind === "event") {
      if (!s.events.includes(x.name)) change({ events: [...s.events, x.name].slice(-4) });
    } else if (x.kind === "nation") {
      if (!s.nations.includes(x.ioc)) change({ nations: [...s.nations, x.ioc].slice(-2) });
    } else {
      change({ ranges: [...s.ranges.filter((r) => r.stat !== "season"), { stat: "season", side: "m", min: x.year, max: x.year }] });
    }
  };
  // Picking a player turns "Player" and "Opponent" on; dropping the last one turns them off again
  const dropPlayer = (id: string) => {
    const players = s.players.filter((p) => p !== id);
    const fix = (side: Side): Side => (players.length ? side : side === "p" ? "w" : side === "o" ? "l" : side);
    change({ players, result: players.length ? s.result : null, sort: { ...s.sort, side: fix(s.sort.side) }, ranges: s.ranges.map((r) => ({ ...r, side: fix(r.side) })) });
  };
  const visibleExamples = examples.filter((e) => !e.tours || e.tours.includes(tour));
  const activeExample = qs !== null ? visibleExamples.find((e) => sameSearch(e.query, qs))?.id : undefined;
  const anything = s.players.length + s.events.length + s.nations.length + s.ranges.length + Object.keys(s.facets).length + s.odd.length > 0 || s.sort.stat !== "date" || s.sort.dir !== "desc";

  const columns = [...(sortStat ? [{ stat: sortStat, side: s.sort.side }] : []), ...s.ranges.map((r) => ({ stat: statById.get(r.stat)!, side: r.side }))];
  const initials = useMemo(() => (result ? result.rows.flatMap((r) => [[r.w.name, r.w.initials] as const, [r.l.name, r.l.initials] as const]) : []), [result]);
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const turnPage = (page: number) => {
    change({ page }, true);
    requestAnimationFrame(() => results.current && results.current.getBoundingClientRect().top < 0 && results.current.scrollIntoView({ block: "start" }));
  };
  const tourWord = tour === "atp" ? "men's" : "women's";

  return (
    <div className="space-y-6">
      <SearchBox
        tour={tour}
        onPick={pickSuggestion}
        placeholder={s.players.length === 1 ? "Add a second player for their rivalry, or an event" : "Add a player, tournament, country or year"}
      />

      {/* Examples, one click each, loaded into the controls below to change from there */}
      <section aria-label="Example searches">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">Try:</span>
          {visibleExamples.slice(0, moreExamples ? undefined : 8).map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={activeExample === e.id}
              onClick={() => {
                setEditing(null);
                putSearch({ ...readSearch(new URLSearchParams(e.query)), players: s.players, events: s.events, nations: s.nations, result: s.result });
              }}
              className={`tag ${activeExample === e.id ? "border-foreground bg-foreground text-white" : ""}`}
            >
              {e.label}
            </button>
          ))}
          {!moreExamples && visibleExamples.length > 8 && (
            <button type="button" onClick={() => setMoreExamples(true)} className="cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline">
              {visibleExamples.length - 8} more
            </button>
          )}
        </div>
      </section>

      {/* The controls: who and where, the sort, the filters and the oddities */}
      <section aria-label="Sort and filter" className="panel">
        {(s.players.length > 0 || s.events.length > 0 || s.nations.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
            {s.players.map((id, i) => (
              <Chip key={id} onRemove={() => dropPlayer(id)}>
                <span className="font-normal text-muted">{i === 0 ? (s.players.length > 1 ? "Rivalry:" : "Player:") : "v"}</span> {result ? (result.people[id]?.name ?? "Unknown player") : "…"}
              </Chip>
            ))}
            {s.players.length > 0 && (
              <div className="seg" role="group" aria-label={`${firstPlayer ?? "The player"} won or lost`}>
                {(
                  [
                    [null, "All"],
                    ["won", "Won"],
                    ["lost", "Lost"],
                  ] as const
                ).map(([v, label]) => (
                  <button key={label} type="button" aria-pressed={s.result === v} onClick={() => change({ result: v })}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {s.events.map((e) => (
              <Chip key={e} onRemove={() => change({ events: s.events.filter((x) => x !== e) })}>
                <span className="font-normal text-muted">At</span> {e}
              </Chip>
            ))}
            {s.nations.map((c) => (
              <Chip key={c} onRemove={() => change({ nations: s.nations.filter((x) => x !== c) })}>
                <span className="font-normal text-muted">{s.nations.length > 1 && c === s.nations[1] ? "v" : "A player from"}</span> {nationNames[c] ?? c}
              </Chip>
            ))}
          </div>
        )}

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {/* Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="sort-by" className="w-20 shrink-0 text-sm font-semibold max-sm:w-full">
              Sort by
            </label>
            <StatSelect id="sort-by" label="Sort by" value={s.sort.stat} onChange={setSort} withDate />
            {sortStat && <SideSelect stat={sortStat} value={s.sort.side} onChange={(side) => change({ sort: { ...s.sort, side } })} player={playerShort} label="Whose number" />}
            <div className="seg" role="group" aria-label="Which end first">
              <button type="button" aria-pressed={s.sort.dir === "desc"} onClick={() => change({ sort: { ...s.sort, dir: "desc" } })}>
                {sortStat ? "Most first" : "Newest first"}
              </button>
              <button type="button" aria-pressed={s.sort.dir === "asc"} onClick={() => change({ sort: { ...s.sort, dir: "asc" } })}>
                {sortStat ? "Least first" : "Oldest first"}
              </button>
            </div>
          </div>
          {sortStat && <p className="-mt-2 text-sm text-muted sm:pl-[5.5rem]">{sortStat.hint}</p>}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-sm font-semibold max-sm:w-full">Filters</span>
            {s.ranges.map((r, i) => {
              const def = statById.get(r.stat)!;
              const bounds = r.min !== null && r.max !== null ? (r.min === r.max ? `= ${formatValue(def.format, r.min)}` : `${formatValue(def.format, r.min)} to ${formatValue(def.format, r.max)}`) : r.min !== null ? `≥ ${formatValue(def.format, r.min)}` : r.max !== null ? `≤ ${formatValue(def.format, r.max)}` : "recorded · set a range";
              return (
                <Chip key={`r${i}`} open={editing === `r${i}`} onClick={() => setEditing(editing === `r${i}` ? null : `r${i}`)} onRemove={() => (setEditing(null), change({ ranges: s.ranges.filter((_, j) => j !== i) }))}>
                  {statName(def, r.side, playerShort ?? undefined)} {bounds}
                </Chip>
              );
            })}
            {facets.map((f) => {
              const chosen = s.facets[f.id];
              if (!chosen) return null;
              const names = chosen.map((v) => f.values.find((x) => x.id === v)?.label ?? v);
              return (
                <Chip key={f.id} open={editing === `t:${f.id}`} onClick={() => setEditing(editing === `t:${f.id}` ? null : `t:${f.id}`)} onRemove={() => (setEditing(null), change({ facets: Object.fromEntries(Object.entries(s.facets).filter(([k]) => k !== f.id)) }))}>
                  <span className="font-normal text-muted">{f.label}:</span> {names.length ? names.join(", ") : "pick"}
                </Chip>
              );
            })}
            <select aria-label="Add a filter" value={adding} onChange={(e) => addFilter(e.target.value)} className={`${selectClass} text-court`}>
              <option value="">+ Add a filter</option>
              <optgroup label="Where and how">
                {facets
                  .filter((f) => !s.facets[f.id])
                  .map((f) => (
                    <option key={f.id} value={`t:${f.id}`}>
                      {f.label}
                    </option>
                  ))}
              </optgroup>
              {statGroups.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {stats
                    .filter((x) => x.group === g.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          {/* The filter being changed, under the row */}
          {s.ranges.map((r, i) =>
            editing === `r${i}` ? (
              <RangeEditor
                key={`${i}-${r.stat}-${r.side}`}
                range={r}
                hist={result && !pending ? (result.rangeHists[i] ?? null) : (result?.rangeHists[i] ?? null)}
                player={playerShort}
                onChange={(next) => change({ ranges: s.ranges.map((x, j) => (j === i ? next : x)) })}
              />
            ) : null,
          )}
          {facets.map((f) =>
            editing === `t:${f.id}` && s.facets[f.id] ? (
              <FacetEditor key={f.id} id={f.id} label={f.label} values={f.values} chosen={s.facets[f.id]!} counts={result?.facets[f.id]} onChange={(v) => change({ facets: { ...s.facets, [f.id]: v } })} />
            ) : null,
          )}

          {/* Oddities */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-sm font-semibold max-sm:w-full">Oddities</span>
            {oddities.map((o, i) => {
              const on = s.odd.includes(o.id);
              const n = result?.odd[o.id];
              return (
                <button
                  key={o.id}
                  type="button"
                  title={o.hint}
                  aria-pressed={on}
                  onClick={() => change({ odd: on ? s.odd.filter((x) => x !== o.id) : [...s.odd, o.id] })}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[13px] font-semibold transition-colors ${
                    on ? "border-foreground bg-foreground text-white" : "border-line-strong bg-surface hover:border-foreground"
                  } ${!on && n === 0 ? "opacity-45" : ""} ${i >= 4 && !on && !allOdd ? "max-sm:hidden" : ""}`}
                >
                  {o.label}
                  {n !== undefined && <span className={`tabular-nums ${on ? "text-white/70" : "text-muted"} font-normal`}>{n.toLocaleString("en-GB")}</span>}
                </button>
              );
            })}
            {!allOdd && (
              <button type="button" onClick={() => setAllOdd(true)} className="cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline sm:hidden">
                All {oddities.length} oddities
              </button>
            )}
          </div>
          {anything && (
            <p>
              <button type="button" onClick={() => (setEditing(null), putSearch(emptySearch))} className="cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline">
                Clear everything
              </button>
            </p>
          )}
        </div>

        {/* How the sorted number spreads */}
        {sortStat && result?.sortHist && (
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <p className="mb-2 text-sm">
              <span className="font-semibold">{statName(sortStat, s.sort.side, playerShort ?? undefined)}</span>{" "}
              <span className="text-muted">across the {result.sortable.toLocaleString("en-GB")} matches found that have it. Click a bar to keep only those.</span>
            </p>
            <Histogram
              hist={result.sortHist}
              stat={sortStat}
              onPick={(lo, hi) => {
                const existing = s.ranges.findIndex((r) => r.stat === s.sort.stat && r.side === s.sort.side);
                const next = { stat: s.sort.stat, side: s.sort.side, min: lo, max: hi };
                change({ ranges: existing >= 0 ? s.ranges.map((r, j) => (j === existing ? next : r)) : [...s.ranges, next] });
              }}
            />
          </div>
        )}
      </section>

      {/* The list */}
      <section ref={results} aria-label="Matches found" aria-busy={pending} className="scroll-mt-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[0.9375rem]" aria-live="polite">
            {result ? (
              <>
                <span className="stat text-2xl">{result.total.toLocaleString("en-GB")}</span> <span className="text-muted">of the {tourWord} {result.all.toLocaleString("en-GB")} matches</span>
                {sortStat && result.sortable < result.total && <span className="text-muted"> · {(result.total - result.sortable).toLocaleString("en-GB")} without this number come last</span>}
              </>
            ) : loaded?.error ? (
              <span className="font-medium text-fault">The matches aren&apos;t available right now. Try again in a little while.</span>
            ) : (
              <span className="text-muted">Opening every match…</span>
            )}
          </p>
          {result && result.total > PAGE_SIZE && (
            <p className="text-sm tabular-nums text-muted">
              {(result.page * PAGE_SIZE + 1).toLocaleString("en-GB")}–{Math.min(result.total, (result.page + 1) * PAGE_SIZE).toLocaleString("en-GB")}
            </p>
          )}
        </div>
        <div className={`panel overflow-hidden transition-opacity ${pending && result ? "opacity-55" : ""}`}>
          <div className="flex items-center gap-3 border-b border-line bg-sunk px-3 py-2 text-xs font-semibold text-muted sm:px-5">
            <span className="w-7 shrink-0">#</span>
            <span className="min-w-0 flex-1">Match</span>
            {columns.map((c, i) => (
              <span key={i} className={`w-20 shrink-0 text-right sm:w-28 ${i > 0 ? "max-sm:hidden" : ""}`} title={c.stat.hint}>
                {c.side === "m" ? c.stat.short : `${c.stat.short} · ${c.side === "p" ? (playerShort ?? "player") : c.side === "o" ? "opp." : c.side === "x" ? "either" : c.side === "b" ? "both" : c.side === "w" ? "winner" : "loser"}`}
              </span>
            ))}
            <span className="w-3 shrink-0 max-sm:hidden" />
          </div>
          {result && result.rows.length > 0 ? (
            <PlayerInitials names={initials}>
              <ol className="divide-y divide-line">
                {result.rows.map((row) => (
                  <li key={row.id}>
                    <ResultLine row={row} columns={columns} focus={s.players[0] ? `${tour}:${s.players[0]}` : null} />
                  </li>
                ))}
              </ol>
            </PlayerInitials>
          ) : result ? (
            <p className="px-4 py-8 text-center text-muted sm:px-5">No match fits all of that. Take a filter away, or widen a range.</p>
          ) : (
            <div className="space-y-px" aria-hidden>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="h-[3.75rem] animate-pulse bg-sunk/70" />
              ))}
            </div>
          )}
        </div>
        {result && pages > 1 && (
          <nav aria-label="Pages" className="mt-3 flex items-center justify-between gap-3">
            <button type="button" disabled={result.page === 0} onClick={() => turnPage(result.page - 1)} className="btn btn-secondary btn-sm disabled:cursor-default disabled:opacity-40">
              ← Previous
            </button>
            <span className="text-sm tabular-nums text-muted">
              Page {result.page + 1} of {pages.toLocaleString("en-GB")}
            </span>
            <button type="button" disabled={result.page >= pages - 1} onClick={() => turnPage(result.page + 1)} className="btn btn-secondary btn-sm disabled:cursor-default disabled:opacity-40">
              Next →
            </button>
          </nav>
        )}
      </section>

      {result && <About result={result} />}
    </div>
  );
}

/** What the list counts, what it leaves out, and how the drama score is worked out */
function About({ result }: { result: MatchesResult }) {
  return (
    <div className="space-y-3 text-sm text-muted">
      <p>
        Every tour-level singles match the {result.tour === "atp" ? "men" : "women"} played from {result.from} to{" "}
        {new Date(`${result.last}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}, team cups and the Olympics included. Walkovers aren&apos;t
        matches, so they&apos;re left out. Serve and return numbers exist only where the data recorded them
        {result.tour === "wta" ? " (for women, mostly from 2013)" : ""}, and match lengths likewise{result.tour === "wta" ? " (mostly from 2016)" : ""}. Numbers that can&apos;t be true, like
        serve stats that don&apos;t add up to the score or a 6-4 6-2 that lasted 41 hours, are left out, since sorting by an extreme finds the typos first. Oddities count only matches
        played to the end.
      </p>
      <details className="well px-4 py-3">
        <summary className="cursor-pointer font-semibold text-foreground">How the drama score works</summary>
        <div className="mt-2 space-y-2">
          <p>Out of 100, from how a match unfolded, never from who played or what was at stake. Only matches played to the end have one.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <span className="font-semibold text-foreground">Closeness, up to 20:</span> the loser&apos;s share of the points, from 40% (0) to 50% or more (20). Where points weren&apos;t recorded,
              it&apos;s estimated from the share of games, fitted on the matches that recorded both.
            </li>
            <li>
              <span className="font-semibold text-foreground">Distance, up to 20:</span> a deciding set 20; best of five in four sets 8.
            </li>
            <li>
              <span className="font-semibold text-foreground">Swings, up to 20:</span> 10 for each set the winner took from behind, 6 for each the loser did.
            </li>
            <li>
              <span className="font-semibold text-foreground">Finish, up to 20:</span> the last set in a tiebreak or past 7–5, 20; 7–5, 14; 6–4, 6.
            </li>
            <li>
              <span className="font-semibold text-foreground">Tiebreaks, up to 10:</span> 5 each.
            </li>
            <li>
              <span className="font-semibold text-foreground">Length, up to 10:</span> games played, from half the format&apos;s longest usual match (13 games a set) to all of it.
            </li>
          </ul>
          <p>
            The 2025 Roland Garros final scores 98, the 2019 Wimbledon final 92 and Isner–Mahut 96; a 6-0 6-0 scores 0. Every match&apos;s own page breaks its score down.
          </p>
        </div>
      </details>
    </div>
  );
}

/** The oddity, as a reason, for the match page */
export const oddityLabel = (id: string) => oddById.get(id)?.label ?? id;
