"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type CSSProperties, type ReactNode } from "react";
import { glideTo } from "../glide";
import { HighlightsLink, SlamLogo, TournamentLabel, slamColours } from "../match-ui";
import { Chevron, SectionHead, Segmented } from "../ui";
import { Avatar, BallRating, BallScore, CollectionIcon, CourtArt, chartStyles } from "./fun";
import { bigEventOf, bigEvents, diaryPages, finished, parseScore, roundName, scoreText, setWinner, toMatches, watched, watchedHow, type Match, type MatchRow, type Round, type WatchMode } from "./library";
import { highlightVideos } from "./media";
import { MatchFinder } from "./finder";
import { Scoreboard } from "./scoreboard";
import { useLog } from "./store";
import type { Bracket, BracketSlot, DrawVisual, EventVisual, Fact, H2HVisual, Part, SeasonVisual, StatsVisual, Story, Thread } from "./story";
import type { Surface } from "./library";
import { ShapeChart, type Glance } from "./saga-ui";

/* Exploring one match at a time: the story around it from the whole record (see story.ts), with every
   match it mentions one click away. Signed in, each match is its own address (/explore?m=…), so the
   back button walks back along the trail; on the landing page the demo fetches stories as you go. */

type Follow = (id: string) => void;

/** Story pages are about the match data; a demo diary keys its pages by the sample's own ids */
function usePages(toLocal: (id: string) => string | undefined = (id) => id) {
  const { matches, entries } = useLog();
  const pages = useMemo(() => diaryPages(entries, matches), [entries, matches]);
  return (id: string) => {
    const local = toLocal(id);
    return local ? (pages.get(local) ?? null) : null;
  };
}

/* ---------- Pieces ---------- */

const linkClass = "cursor-pointer font-semibold text-court underline decoration-court/30 decoration-2 underline-offset-4 transition hover:decoration-court";

function Parts({ parts, follow, still = false }: { parts: Part[]; follow: Follow; still?: boolean }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" || still ? (
          <span key={i} className={typeof p === "string" ? "" : "font-semibold"}>
            {typeof p === "string" ? p : p.text}
          </span>
        ) : typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <button key={i} type="button" onClick={() => follow(p.ref)} className={linkClass}>
            {p.text}
          </button>
        ),
      )}
    </>
  );
}

/** A line of the story, with a dot in the colour of the player it's about */
function FactLine({ fact, follow, colors, still }: { fact: Fact; follow: Follow; colors: Record<"a" | "b", string>; still?: boolean }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-[0.55rem] h-2 w-2 shrink-0 rounded-[1px]" style={{ background: fact.side ? colors[fact.side] : "var(--line-strong)" }} />
      <span className="min-w-0 leading-relaxed">
        <Parts parts={fact.parts} follow={follow} still={still} />
      </span>
    </li>
  );
}

const resultTitle: Record<string, string> = { W: "Won the title", F: "Final", SF: "Semifinal", QF: "Quarterfinal", RR: "Round robin" };
const resultLevel: Record<string, number> = { W: 8, F: 7, SF: 6, QF: 5, RR: 4.5, R16: 4, "4R": 4, R32: 3, "3R": 3, R64: 2, "2R": 2, R128: 1, "1R": 1 };
const shortSeason = (y: number) => `’${String(y).slice(2)}`;

/* ---------- The pictures ---------- */

/** Every meeting, drawn exactly as the saga draws a rivalry: the head-to-head after each one */
type StarOf = (id: string) => "watched" | "starred" | null;

function H2HChart({ v, story, follow, page, starOf, still }: { v: H2HVisual; story: Story; follow: Follow; page: (id: string) => number | null; starOf: StarOf; still?: boolean }) {
  const [A, B] = [story.names[story.a.key], story.names[story.b.key]];
  const glance: Glance = {
    faces: [A, B],
    stripMode: "rivalry",
    strip: v.meetings.map((m) => {
      const winner = m.winner === "a" ? A : B;
      const p = page(m.id);
      const st = starOf(m.id);
      return {
        key: m.id,
        group: String(m.year),
        color: winner,
        value: 3,
        side: m.winner === "a" ? 1 : -1,
        watched: st !== null,
        title: `${m.label}: ${winner} won${p ? ` · starred, page ${p} of your saga` : ""}`,
        logId: m.id,
      };
    }),
    stripLegend: [
      { color: A, label: `${A} won` },
      { color: B, label: `${B} won` },
      { color: "", label: "Not starred", faded: true },
    ],
  };
  return (
    <ShapeChart
      book={glance}
      caption={`The head-to-head after every meeting: above the middle line ${A} leads, below it ${B} does.${still ? " The dark-ringed dot is this match." : " Filled dots are the meetings you starred; the dark-ringed one is this match."}`}
      spotId={story.id}
      onMark={(x) => x.key !== story.id && follow(x.key)}
      markVerb="Explore it."
    />
  );
}

// How deep a result went, for its cell's shade: the further, the stronger the player's colour
const depthShade = (result: string) => (result === "F" ? 100 : result === "SF" ? 72 : result === "QF" ? 48 : resultLevel[result] >= 4 ? 26 : 12);
const gridLegend = [
  { code: "W", label: "Won it" },
  { code: "F", label: "Final" },
  { code: "SF", label: "Semifinal" },
  { code: "QF", label: "Quarterfinal" },
  { code: "R16", label: "Last 16" },
  { code: "R64", label: "Earlier" },
];

/** One cell of the event grid: the result as a word, shaded by how far it went */
function ResultCell({ result, won, color, focus, title, onClick }: { result: string; won: boolean; color: string; focus: boolean; title: string; onClick?: () => void }) {
  const shade = depthShade(result);
  const style = won
    ? { background: "var(--ball)", color: "var(--foreground)" }
    : { background: `color-mix(in srgb, ${color} ${shade}%, var(--surface))`, color: shade >= 70 ? "#ffffff" : "var(--foreground)" };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 w-full min-w-7 items-center justify-center rounded-[3px] text-xs font-bold tabular-nums transition ${onClick ? "cursor-pointer hover:ring-2 hover:ring-foreground/40" : ""} ${focus ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface" : ""} ${won ? "ring-1 ring-black/15" : ""}`}
      style={style}
    >
      {won ? "W" : result}
    </button>
  );
}

/** Each player's result at the event, every year: a row each, a column a year, the result written in */
function EventGrid({ v, story, colors, follow }: { v: EventVisual; story: Story; colors: Record<"a" | "b", string>; follow: Follow }) {
  const n = v.seasons.length;
  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid min-w-max items-center gap-x-1 gap-y-2" style={{ gridTemplateColumns: `minmax(7.5rem, auto) repeat(${n}, minmax(1.95rem, 1fr))` }}>
          <span />
          {v.seasons.map((y) => (
            <span key={y} className={`text-center text-xs font-semibold tabular-nums ${y === story.season ? "text-foreground" : "text-muted"}`}>
              {shortSeason(y)}
            </span>
          ))}
          {v.rows.map((row) => {
            const key = row.side === "a" ? story.a.key : story.b.key;
            const name = story.names[key];
            return [
              <span key={`${row.side}-name`} className="flex min-w-0 items-center gap-2 pr-2">
                <Avatar name={name} size="h-8 w-8 text-xs" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{name}</span>
                  <span className="block text-xs text-muted">
                    {row.record[0]}–{row.record[1]}
                    {row.titles ? ` · ${row.titles} ${row.titles === 1 ? "title" : "titles"}` : ""}
                  </span>
                </span>
              </span>,
              ...row.cells.map((cell, i) =>
                cell ? (
                  <ResultCell
                    key={`${row.side}-${i}`}
                    result={cell.result}
                    won={cell.won}
                    color={colors[row.side]}
                    focus={v.seasons[i] === story.season}
                    title={`${v.seasons[i]}: ${resultTitle[cell.result] ?? cell.result}. Explore it.`}
                    onClick={() => follow(cell.id)}
                  />
                ) : (
                  <span key={`${row.side}-${i}`} aria-label={`${v.seasons[i]}: didn't play`} className="flex h-8 items-center justify-center rounded-[3px] border border-dashed border-line text-xs text-muted/60">
                    –
                  </span>
                ),
              ),
            ];
          })}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {gridLegend.map((l) => (
          <li key={l.code} className="flex items-center gap-1.5">
            <span className="w-8">
              <ResultCell result={l.code} won={l.code === "W"} color={colors.a} focus={false} title={l.label} />
            </span>
            {l.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-dashed border-line">–</span>
          Didn&apos;t play
        </li>
      </ul>
    </div>
  );
}

/** Each player's season, drawn as the saga draws a collection: one bar each, a block per match */
function SeasonChart({ v, story, follow }: { v: SeasonVisual; story: Story; follow: Follow }) {
  const [A, B] = [story.names[story.a.key], story.names[story.b.key]];
  const glance: Glance = {
    faces: [A, B],
    stripMode: "rows",
    strip: v.rows.flatMap((row) => {
      const name = row.side === "a" ? A : B;
      const group = `${name} · ${row.record[0]}–${row.record[1]}`;
      return row.events.flatMap((e) =>
        e.matches.map((m) => ({
          key: m.id,
          group,
          color: m.won ? name : "other",
          value: 3,
          side: 1 as const,
          watched: true,
          title: `${e.event}: ${m.won ? "beat" : "lost to"} ${story.names[m.opp] ?? ""}${e.result === "W" ? " · won the title" : ""}`,
          logId: m.id,
        })),
      );
    }),
    stripLegend: [
      { color: A, label: `${A} won` },
      { color: B, label: `${B} won` },
      { color: "other", label: "Lost" },
    ],
  };
  return (
    <ShapeChart
      book={glance}
      caption={`Every match each of them played in ${story.season}, in order. The marked one is this match.`}
      spotId={story.id}
      onMark={(x) => x.key !== story.id && follow(x.key)}
      markVerb="Explore it."
    />
  );
}

const roundCodes: Record<Round, string> = { R128: "R128", R64: "R64", R32: "R32", R16: "R16", QF: "QF", SF: "SF", F: "F", RR: "RR", BR: "BR", "3P": "3P" };

/** Each player's way through the draw */
function DrawPaths({ v, story, follow }: { v: DrawVisual; story: Story; follow: Follow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {v.paths.map((path) => {
        const key = path.side === "a" ? story.a.key : story.b.key;
        return (
          <div key={path.side} className="min-w-0">
            <p className="flex items-center gap-2 font-display text-base font-bold">
              <Avatar name={story.names[key]} size="h-6 w-6 text-[10px]" />
              {story.names[key]}
            </p>
            <ol className="mt-2 divide-y divide-line border-y border-line text-sm">
              {path.steps.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => !st.focus && follow(st.id)}
                    className={`flex w-full items-baseline gap-2 px-2 py-1.5 text-left ${st.focus ? "bg-ball/40" : "cursor-pointer hover:bg-sunk"}`}
                  >
                    <span className="w-9 shrink-0 text-xs font-semibold tabular-nums text-muted">{roundCodes[st.round]}</span>
                    <span className={`min-w-0 flex-1 truncate ${st.won ? "" : "text-muted line-through decoration-fault/50"}`}>
                      {st.won ? "beat" : "lost to"} {story.names[st.opp]}
                      {st.oppSeed ? <span className="text-muted"> ({st.oppSeed})</span> : null}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{scoreText(st.score)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

/** A stat as a number, to size its bar: "12/13" is a share, "73%" a percentage, anything else a count */
function statValue(v: string) {
  const share = v.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (share) return Number(share[2]) ? Number(share[1]) / Number(share[2]) : 0;
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** The match's stats line, each stat with a bar split between the players, the leader's side in full colour */
function StatsTable({ v, story, colors }: { v: StatsVisual; story: Story; colors: Record<"a" | "b", string> }) {
  return (
    <div className="text-sm">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 border-b border-line pb-2 font-semibold">
        <span className="flex items-center gap-2 truncate">
          <Avatar name={story.names[story.a.key]} size="h-6 w-6 text-[10px]" />
          <span className="truncate">{story.names[story.a.key]}</span>
        </span>
        <span />
        <span className="flex items-center justify-end gap-2 truncate">
          <span className="truncate">{story.names[story.b.key]}</span>
          <Avatar name={story.names[story.b.key]} size="h-6 w-6 text-[10px]" />
        </span>
      </div>
      {v.rows.map((r) => {
        const [a, b] = [statValue(r.a), statValue(r.b)];
        const share = a + b > 0 ? a / (a + b) : 0.5;
        return (
          <div key={r.label} className="border-b border-line/70 py-2 last:border-0">
            <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-x-3">
              <span className={`text-[0.9375rem] tabular-nums ${r.lead === "a" ? "font-bold" : "text-muted"}`}>{r.a}</span>
              <span className="text-center text-[0.8125rem] text-muted">{r.label}</span>
              <span className={`text-right text-[0.9375rem] tabular-nums ${r.lead === "b" ? "font-bold" : "text-muted"}`}>{r.b}</span>
            </div>
            <div aria-hidden className="mt-1.5 flex h-1 gap-0.5">
              <span style={{ width: `${share * 100}%`, background: colors.a, opacity: r.lead === "a" ? 1 : 0.28 }} />
              <span className="flex-1" style={{ background: colors.b, opacity: r.lead === "b" ? 1 : 0.28 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Picture({ thread, story, colors, follow, page, starOf, still }: { thread: Thread; story: Story; colors: Record<"a" | "b", string>; follow: Follow; page: (id: string) => number | null; starOf: StarOf; still?: boolean }) {
  const v = thread.visual;
  if (!v) return null;
  if (v.kind === "h2h") return <H2HChart v={v} story={story} follow={follow} page={page} starOf={starOf} still={still} />;
  if (v.kind === "event") return <EventGrid v={v} story={story} colors={colors} follow={follow} />;
  if (v.kind === "season") return <SeasonChart v={v} story={story} follow={follow} />;
  if (v.kind === "draw") return <DrawPaths v={v} story={story} follow={follow} />;
  return <StatsTable v={v} story={story} colors={colors} />;
}

/* ---------- The last four ---------- */

/** One match in the bracket: both players, winner first and bold, the score beneath */
function BracketMatch({ slot, story, follow }: { slot: BracketSlot; story: Story; follow: Follow }) {
  const row = (key: string, seed: number | null, won: boolean) => (
    <span className={`flex min-w-0 items-center gap-2 ${won ? "font-semibold" : "text-muted"}`}>
      <Avatar name={story.names[key]} size="h-6 w-6 text-[10px]" />
      <span className="min-w-0 truncate">{story.names[key]}</span>
      {seed ? <span className="shrink-0 text-xs font-normal text-muted">({seed})</span> : null}
      {won && <span aria-hidden className="ml-auto h-2 w-2 shrink-0 rounded-[1px] bg-ball ring-1 ring-black/20" />}
    </span>
  );
  const open = slot.played && !slot.focus;
  return (
    <button
      type="button"
      onClick={() => open && follow(slot.id)}
      disabled={!slot.played}
      title={slot.focus ? "This match" : slot.played ? "Explore it" : "A walkover: never played"}
      className={`flex w-full min-w-0 flex-col gap-1 rounded border px-3 py-2 text-left text-sm transition-colors ${
        slot.focus ? "cursor-default border-foreground bg-ball/25" : open ? "cursor-pointer border-line bg-surface hover:border-foreground/50" : "border-dashed border-line bg-surface/60"
      }`}
    >
      {row(slot.w, slot.ws, true)}
      {row(slot.l, slot.ls, false)}
      <span className="text-xs tabular-nums text-muted">{scoreText(slot.score)}</span>
    </button>
  );
}

/** The semifinals feeding the final, with lines joining them, for a semifinal's or final's story */
function MiniBracket({ b, story, follow }: { b: Bracket; story: Story; follow: Follow }) {
  return (
    <section aria-label="The last four" className="panel">
      <header className="panel-head">
        <h3 className="panel-title">The last four</h3>
      </header>
      <div className="panel-body grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center">
        <div className="space-y-3">
          {b.semis.map((s) => (
            <BracketMatch key={s.id} slot={s} story={story} follow={follow} />
          ))}
        </div>
        {/* The lines: each semifinal's winner on to the final */}
        <div aria-hidden className="relative h-full">
          <span className="absolute inset-y-1/4 left-0 right-1/2 border-y-2 border-r-2 border-line-strong" />
          <span className="absolute left-1/2 right-0 top-1/2 border-t-2 border-line-strong" />
        </div>
        <div>
          {b.final ? (
            <BracketMatch slot={b.final} story={story} follow={follow} />
          ) : (
            <span className="block rounded border border-dashed border-line px-3 py-4 text-center text-sm text-muted">Final not in the record yet</span>
          )}
          {b.final && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold">
              <CollectionIcon id="finals" className="h-4 w-4 text-muted" /> {story.names[b.final.w]}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- The story ---------- */

// The threads the landing's demo keeps on a phone, so it can be scrolled past quickly
const quick = new Set(["h2h", "after"]);

// Threads whose pictures need the page's whole width
const wide = new Set(["draw", "season", "h2h", "event"]);

/** What the site calls a match from a story: enough for the scoreboard and labels */
const asMatch = (story: Story): Match => ({
  id: story.id,
  event: `${story.event} ${story.season}`,
  date: story.date,
  round: story.round,
  stage: story.stage,
  tour: story.tour,
  surface: story.surface,
  winner: story.names[story.a.key],
  loser: story.names[story.b.key],
  score: story.score,
  bestOf: story.bestOf,
});

const entryNames: Record<string, string> = { Q: "Qualifier", WC: "Wildcard", LL: "Lucky loser", PR: "Protected ranking", ALT: "Alternate", SE: "Special exempt" };

function SideLine({ side, name }: { side: Story["a"]; name: string }) {
  const bits = [
    side.seed ? `Seeded ${side.seed}` : null,
    side.entry && entryNames[side.entry] ? entryNames[side.entry] : null,
    side.rank ? `No. ${side.rank}` : null,
    side.age ? `age ${Math.floor(side.age)}` : null,
  ].filter(Boolean);
  return (
    <p className="truncate text-sm">
      <span className="font-semibold">{name}</span>
      {side.ioc && <span className="text-muted"> · {side.ioc}</span>}
      {bits.length > 0 && <span className="text-muted"> · {bits.join(", ")}</span>}
    </p>
  );
}

export function StoryView({
  story,
  follow,
  pending,
  page,
  star,
  take,
  starOf = () => null,
  lite = false,
  still = false,
  short = false,
}: {
  story: Story;
  follow: Follow;
  pending: boolean;
  page: (id: string) => number | null;
  star?: ReactNode; // beside the title: copying the link
  take?: ReactNode; // under the title: your take on it, or a way to star it
  starOf?: StarOf; // whether a match is starred, and watched
  lite?: boolean; // the landing's demo: on a phone, only the threads that read quickest
  still?: boolean; // the story to read and nothing more: its matches named but not links, no trail onwards
  short?: boolean; // the landing page: only the head-to-head after the story
}) {
  const match = asMatch(story);
  const [nameA, nameB] = [story.names[story.a.key], story.names[story.b.key]];
  const styles = chartStyles([nameA, nameB]);
  const colors = { a: styles.get(nameA)!.color, b: styles.get(nameB)!.color };
  const here = page(story.id);
  const label = `${story.event} ${story.season} · ${roundName(match)}`;

  const h2h = story.threads.find((t) => t.id === "h2h");
  const rest = short ? [] : story.threads.filter((t) => t.id !== "h2h");
  const thread = (t: Thread) => (
    <section key={t.id} aria-label={t.title} className={`panel ${wide.has(t.id) ? "lg:col-span-2" : ""} ${lite && !quick.has(t.id) ? "max-sm:hidden" : ""}`}>
      <header className="panel-head">
        <h3 className="panel-title">{t.title}</h3>
        {t.kicker && <span className="panel-meta">{t.kicker}</span>}
      </header>
      <div className="panel-body">
        {t.facts.length > 0 && (
          <ul className="space-y-1.5">
            {t.facts.map((f) => (
              <FactLine key={f.key} fact={f} follow={follow} colors={colors} still={still} />
            ))}
          </ul>
        )}
        {t.visual && (
          <div className={t.facts.length ? "mt-4 border-t border-line pt-4" : ""}>
            <Picture thread={t} story={story} colors={colors} follow={follow} page={page} starOf={starOf} still={still} />
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className={`transition-opacity duration-300 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
      {/* Which match this is, before anything else */}
      <header key={story.id} className="fade-in mb-6 flex flex-wrap items-center gap-x-4 gap-y-4">
        <SlamLogo event={story.event} size="h-14 w-14 text-4xl sm:h-16 sm:w-16 sm:text-5xl" />
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-bold leading-[1.05] sm:text-[2.75rem]">
            {story.event} {story.season} · {roundName(match)}
          </h2>
          <p className="mt-1 text-[1.0625rem] text-muted">
            <span className="font-semibold text-foreground">{story.a.name}</span> beat <span className="font-semibold text-foreground">{story.b.name}</span>{" "}
            <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">{scoreText(story.score)}</span>
          </p>
        </div>
        {star && <div className="w-full sm:ml-auto sm:w-auto">{star}</div>}
      </header>
      {take && <div className="mb-6">{take}</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        {/* The match, as a page of the record */}
        <div className="min-w-0">
          <div key={story.id} className={`page-turn page-stack overflow-hidden rounded-md border bg-surface ${here ? "border-foreground" : "border-line"}`}>
            {/* Starred: say so across the top of the card */}
            {here && (
              <p className="flex items-center gap-2 bg-ball px-4 py-2 font-display text-lg font-bold">
                <span aria-hidden>★</span> In your saga
                <span className="ml-auto font-sans text-sm font-semibold opacity-75">page {here}</span>
              </p>
            )}
            <p className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2 text-sm">
              <span className="font-semibold">{here ? <span className="text-muted">Starred</span> : still ? null : <span className="font-normal text-muted">Not in your saga</span>}</span>
              <span className="tabular-nums text-muted">
                {new Date(`${story.date.slice(0, 7)}-15`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                {story.minutes ? ` · ${Math.floor(story.minutes / 60)} h ${String(story.minutes % 60).padStart(2, "0")}` : ""}
              </span>
            </p>
            <div className="relative">
              <CourtArt surface={story.surface} className="aspect-[16/9] w-full" />
              <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-2 bg-[#0a1220]/55 px-4 py-2.5 text-white">
                <TournamentLabel event={label} surface={story.surface} onPhoto />
                <HighlightsLink videoId={highlightVideos[story.id]} players={[nameA, nameB]} event={label} onPhoto />
              </div>
            </div>
            <div className="relative -mt-12 space-y-3 px-4 pb-4">
              <Scoreboard match={match} />
              <div className="space-y-0.5">
                <SideLine side={story.a} name={story.a.name} />
                <SideLine side={story.b} name={story.b.name} />
              </div>
            </div>
          </div>
        </div>

        {/* The story in three lines */}
        <div className="min-w-0 space-y-5">
          <section aria-label="The story" className="panel">
            <header className="panel-head">
              <h3 className="panel-title">The story</h3>
            </header>
            <div className="panel-body">
              {story.lede.length ? (
                <ol className="space-y-3">
                  {story.lede.map((f, i) => (
                    <li
                      key={`${story.id}-${f.key}`}
                      className={i === 0 ? "font-display text-2xl font-bold leading-tight sm:text-[1.75rem]" : "border-t border-line pt-3 text-[1.0625rem] leading-relaxed"}
                    >
                      <Parts parts={f.parts} follow={follow} still={still} />.
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[1.0625rem] text-muted">A quiet one: nothing in the record stands out about it. The threads below still lead somewhere.</p>
              )}
            </div>
          </section>
          {story.bracket && <MiniBracket b={story.bracket} story={story} follow={follow} />}
        </div>
      </div>

      {/* The rivalry first, then where to go next, then everything else */}
      <div className="mt-5 grid items-start gap-5 lg:grid-flow-dense lg:grid-cols-2">
        {h2h && thread(h2h)}
        {story.trail.length > 0 && !still && <Trail story={story} follow={follow} page={page} lite={lite} />}
        {rest.map(thread)}
      </div>
    </div>
  );
}

/** Where to go next: the matches the story points to, each a page to turn to with the reason on it */
function Trail({ story, follow, page, lite = false }: { story: Story; follow: Follow; page: (id: string) => number | null; lite?: boolean }) {
  const teasers = useTeasers();
  return (
    <section aria-label="Follow the thread" className="panel lg:col-span-2">
      <header className="panel-head">
        <h3 className="panel-title">Follow the thread</h3>
        <span className="panel-meta">Every match here has its own story. Point at one for a taste.</span>
      </header>
      <ol className="panel-body grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {story.trail.map((t, i) => {
          const r = story.refs[t.ref];
          return (
            <li key={t.ref} className={lite && i >= 3 ? "max-sm:hidden" : ""}>
              <StoryCard
                n={i + 1}
                label={r.label}
                surface={r.surface}
                names={[story.names[r.w], story.names[r.l]]}
                score={r.score}
                headline={t.why}
                page={page(t.ref)}
                teaser={teasers.get(t.ref)}
                onPeek={() => teasers.want(t.ref)}
                onOpen={() => follow(t.ref)}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- Tasters: a story's first line, fetched when you point at a match ---------- */

const teaserCache = new Map<string, string>();

/** Point at a match and its story's headline arrives, so every card hints at what's behind it */
function useTeasers() {
  const [, bump] = useState(0);
  const asked = useRef(new Set<string>());
  return {
    get: (id: string) => teaserCache.get(id),
    want: (id: string) => {
      if (teaserCache.has(id) || asked.current.has(id)) return;
      asked.current.add(id);
      fetch(`/api/story?id=${encodeURIComponent(id)}&teaser=1`)
        .then((res) => (res.ok ? res.json() : null))
        .then((t: { line: string } | null) => {
          if (!t?.line) return;
          teaserCache.set(id, t.line);
          bump((n) => n + 1);
        })
        .catch(() => asked.current.delete(id));
    },
  };
}

/** Both players and their games set by set, as a score card prints them: the winner on top, each set's winner in bold */
function MiniScore({ names, score }: { names: readonly [string, string]; score: string }) {
  const { sets, outcome } = parseScore(score);
  const done = finished(score);
  const ending = outcome === "retired" ? "ret." : outcome === "defaulted" ? "def." : outcome === "abandoned" ? "abd." : null;
  return (
    <span className="block">
      {names.map((name, row) => (
        <span key={row} className="flex items-center gap-2 py-0.5">
          <Avatar name={name} size="h-6 w-6 text-[10px]" />
          <span className={`min-w-0 flex-1 truncate text-[0.9375rem] ${row ? "text-muted" : "font-semibold"}`}>{name}</span>
          <span className="flex text-[0.9375rem]">
            {sets.map((set, i) => {
              const went = setWinner(sets, i, done);
              const took = went === (row ? "l" : "w");
              return (
                <span key={i} className={`relative w-5 text-center tabular-nums ${took ? "font-bold text-court" : "text-muted"}`}>
                  {row ? set.l : set.w}
                  {set.tb !== null && went && !took && <sup className="absolute -right-0.5 top-0 text-[9px] font-normal">{set.tb}</sup>}
                </span>
              );
            })}
            {ending && <span className={`w-7 text-right text-xs leading-6 text-muted ${row ? "" : "invisible"}`}>{ending}</span>}
          </span>
        </span>
      ))}
    </span>
  );
}

/** A match as a card to turn to: its event along the top, a headline, the score card, and a taste of its story */
function StoryCard({
  n,
  label,
  surface,
  names,
  score,
  headline,
  page,
  teaser,
  onPeek,
  onOpen,
}: {
  n?: number;
  label: string;
  surface: Surface;
  names: readonly [string, string];
  score: string;
  headline: string;
  page: number | null;
  teaser?: string;
  onPeek: () => void;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={onPeek}
      onFocus={onPeek}
      className="group flex h-full w-full cursor-pointer flex-col rounded-md border border-line bg-surface text-left text-foreground transition-colors hover:border-foreground/45"
    >
      <span className="flex min-w-0 items-center gap-2 border-b border-line bg-sunk px-3 py-1.5">
        {n !== undefined && <span className="rank h-5 min-w-5 text-[11px]">{n}</span>}
        <TournamentLabel event={label} surface={surface} logo="h-5 w-5" className="min-w-0 text-[0.8125rem]" />
      </span>
      <span className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <span className="font-display text-lg font-bold leading-snug">{headline}</span>
        <span className="mt-2 block">
          <MiniScore names={names} score={score} />
        </span>
        {/* A taste of the story, once pointed at */}
        <span className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
          <span className="overflow-hidden">
            <span className="mt-2 block border-l-2 border-ball pl-2.5 text-sm leading-snug text-muted">{teaser ?? "Opening the record…"}</span>
          </span>
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2.5 text-sm font-semibold text-court">
          <span className="flex items-center gap-1">
            Turn to it <Chevron className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
          {page ? <span className="rounded-[3px] bg-ball px-1.5 py-px text-xs font-bold text-foreground">★ In your saga</span> : null}
        </span>
      </span>
    </button>
  );
}

/* ---------- Starring a match from its story ---------- */

/** Whether a match is in the diary, and watched or only starred */
function useStarState(toLocal: (id: string) => string | undefined = (id) => id) {
  const { entries } = useLog();
  return (id: string): "watched" | "starred" | null => {
    const e = entries[toLocal(id) ?? ""];
    return e ? (watched(e) ? "watched" : "starred") : null;
  };
}

const starModes: { mode: WatchMode; label: string }[] = [
  { mode: "Live", label: "In person" },
  { mode: "TV", label: "On TV" },
  { mode: "Stream", label: "Streamed" },
];

/**
 * Your take on a match, at the top of its story: one click stars it, then say if you watched it, rate it,
 * say who you were backing and write a note. Everything saves as you go. At the foot of the story (`ask`),
 * the star button comes with a question, and a starred match shows what you said.
 */
function YourTake({ story, ask = false }: { story: Story; ask?: boolean }) {
  const { entries, matches, add, update, remove, saving } = useLog();
  const page = usePages();
  const fan = entries[story.id];
  const m = matches[story.id];
  const played = story.date.slice(0, 7);
  const here = page(story.id);

  if (!fan) {
    const button = (
      <button
        type="button"
        disabled={!m}
        onClick={() => add(story.id, { watchedOn: null, watchedDate: played, rating: null, cheering: null, pick: null, note: "" })}
        className="btn btn-primary btn-lg shrink-0"
      >
        <span aria-hidden>☆</span> Star this match
      </button>
    );
    if (ask)
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-display text-2xl font-bold">Want to remember this one?</p>
          {button}
        </div>
      );
    return (
      <div className="panel flex flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ "--accent": "var(--ball)" } as CSSProperties}>
        <p className="text-muted">
          <span className="font-display text-lg font-bold text-foreground">Remember this one?</span> Star it to rate it, note it, and keep it in your saga.
        </p>
        {button}
      </div>
    );
  }

  const seen = watched(fan);
  const sagaLink = (
    <Link href={`/saga?m=${encodeURIComponent(story.id)}`} className="btn btn-sm bg-foreground text-white hover:bg-foreground/85">
      See it in your saga <Chevron />
    </Link>
  );

  // At the foot: what you said, and the way to the saga
  if (ask)
    return (
      <div className="panel w-full max-w-md px-5 py-4" style={{ "--accent": "var(--ball)" } as CSSProperties}>
        <p className="flex flex-wrap items-center gap-x-2 font-display text-xl font-bold">
          <span aria-hidden>★</span> In your saga
          <span className="font-sans text-sm font-semibold text-muted">{seen ? `· watched ${watchedHow(fan.watchedOn)}` : "· starred, not watched"}</span>
        </p>
        {fan.rating ? (
          <span className="mt-1.5 inline-flex">
            <BallScore value={fan.rating} size="sm" />
          </span>
        ) : null}
        {fan.note && <p className="mt-2 border-l-2 border-ball pl-3 text-sm italic">&ldquo;{fan.note}&rdquo;</p>}
        <p className="mt-3">{sagaLink}</p>
      </div>
    );

  const players = m ? [m.winner, m.loser] : [];
  return (
    <section aria-label="Your take" className="panel overflow-hidden" style={{ "--accent": "var(--ball)" } as CSSProperties}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-ball px-4 py-2.5 sm:px-5">
        <p className="font-display text-xl font-bold">
          <span aria-hidden>★</span> In your saga{here ? <span className="font-sans text-sm font-semibold opacity-70"> · page {here}</span> : null}
        </p>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-xs font-semibold opacity-70" role="status" aria-live="polite">
            {saving === "error" ? "Couldn't save. Check your connection." : saving === "saving" ? "Saving…" : "Saves as you go"}
          </span>
          {sagaLink}
        </span>
      </header>
      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Did you watch it?</p>
            <div className="seg mt-1.5" role="group" aria-label="Did you watch it?">
              {starModes.map(({ mode, label }) => (
                <button key={mode} type="button" aria-pressed={fan.watchedOn === mode} onClick={() => update(story.id, { watchedOn: mode, ...(seen ? {} : { watchedDate: played }) })}>
                  {label}
                </button>
              ))}
              <button type="button" aria-pressed={!seen} onClick={() => update(story.id, { watchedOn: null, watchedDate: played })}>
                ☆ Didn&apos;t watch it
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">
              Your rating <span className="font-normal text-muted">· if you like</span>
            </p>
            <div className="mt-1.5">
              <BallRating value={fan.rating} size="md" onChange={(rating) => update(story.id, { rating })} />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Who were you backing?</p>
            <div className="seg mt-1.5" role="group" aria-label="Who were you backing?">
              {[...players, null].map((p) => (
                <button key={p ?? "none"} type="button" aria-pressed={fan.cheering === p} onClick={() => update(story.id, { cheering: p, pick: p ? { winner: p } : null })}>
                  {p && <Avatar name={p} size="h-5 w-5 text-[9px]" />}
                  {p ?? "No one"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <label htmlFor="your-note" className="text-sm font-semibold">
            Your note <span className="font-normal text-muted">· why it matters to you, or anything else</span>
          </label>
          <textarea
            id="your-note"
            value={fan.note}
            onChange={(e) => update(story.id, { note: e.target.value })}
            rows={4}
            maxLength={2000}
            placeholder="Where you watched, who with, why it's one to remember…"
            className="paper mt-1.5 w-full flex-1 resize-none rounded border border-line-strong bg-surface pb-1 pr-3 pt-0 leading-[var(--rule)] [--rule:1.75rem] placeholder:text-muted/70 focus:border-court focus:outline-none focus:ring-3 focus:ring-court/15"
          />
          <button
            type="button"
            onClick={() => window.confirm(`Remove your star from ${story.event} ${story.season}? What you wrote about it goes with it.`) && remove(story.id)}
            className="mt-3 self-start cursor-pointer text-sm font-semibold text-muted underline-offset-4 hover:text-fault hover:underline"
          >
            Remove this star
          </button>
        </div>
      </div>
    </section>
  );
}

/** Under the star button: copy the match's link to share it (a phone's share sheet on touch screens) */
function ShareLink({ story }: { story: Story }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${location.origin}/explore?m=${encodeURIComponent(story.id)}`;
    const title = `${story.event} ${story.season} · ${roundName(asMatch(story))}`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) return await navigator.share({ title, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet closed, or no clipboard: nothing to do
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className={`btn btn-secondary ${copied ? "border-grass text-grass" : ""}`}
    >
      <svg viewBox="0 0 20 20" aria-hidden className="h-[1.125rem] w-[1.125rem] fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L10 5M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
      </svg>
      {copied ? "Link copied ✓" : "Copy link to share"}
    </button>
  );
}

/** Signed out, on a shared match: what an account adds here */
function GuestTake() {
  return (
    <div className="panel flex flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ "--accent": "var(--ball)" } as CSSProperties}>
      <p className="text-muted">
        <span className="font-display text-lg font-bold text-foreground">Remember this one?</span> Sign up free to star it, rate it, note it, and keep it in your saga.
      </p>
      <StarDemo />
    </div>
  );
}

/** In the landing's demo, the star button leads to signing up */
function StarDemo() {
  return (
    <Link href="/signup" className="btn btn-primary btn-lg shrink-0">
      <span aria-hidden>☆</span> Star this match
    </Link>
  );
}

/* ---------- Ways in, for a signed-in fan with no match open ---------- */

// What to call both players of a list of matches, so two Williamses are told apart
const namesOf = (rows: MatchRow[]) => {
  const named = toMatches(rows);
  return (row: MatchRow) => [named[row.id].winner, named[row.id].loser] as const;
};

function MatchCard({ row, why, page, onOpen, names }: { row: MatchRow; why?: string; page: number | null; onOpen: () => void; names: readonly [string, string] }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full w-full cursor-pointer items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-foreground/45"
    >
      <span className="flex shrink-0 -space-x-2">
        <Avatar name={names[0]} size="h-8 w-8 text-xs ring-2 ring-surface" />
        <Avatar name={names[1]} size="h-8 w-8 text-xs ring-2 ring-surface" />
      </span>
      <span className="min-w-0 flex-1">
        {why && <span className="block truncate text-xs font-semibold text-muted">{why}</span>}
        <span className="block truncate text-sm font-semibold">
          {row.event} {row.season} · {roundName({ ...row, event: row.event })}
        </span>
        <span className="block truncate text-sm text-muted">
          {names[0]} beat {names[1]} <span className="tabular-nums">{scoreText(row.score)}</span>
        </span>
      </span>
      {page ? <span className="shrink-0 rounded-[3px] bg-ball/60 px-1.5 py-px text-xs font-semibold tabular-nums">p. {page}</span> : null}
    </button>
  );
}

type StartData = { finals: MatchRow[]; classics: { row: MatchRow; why: string }[]; diary: MatchRow[] };

const slamTiles = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"] as const;

/** One final in a Slam's list: the year, then who beat whom */
const roundTags: Partial<Record<Round, string>> = { F: "Final", SF: "Semi", BR: "Bronze" };
const roundRank = (r: Round) => ["F", "SF", "BR"].indexOf(r);

function FinalRow({
  row,
  page,
  onOpen,
  names,
  teaser,
  onPeek,
  tag,
  sameYear = false,
}: {
  row: MatchRow;
  page: number | null;
  onOpen: () => void;
  names: readonly [string, string];
  teaser?: string;
  onPeek: () => void;
  tag?: string; // the round, where a list has more than finals
  sameYear?: boolean; // the year is shown once, on its first row
}) {
  return (
    <button type="button" onClick={onOpen} onPointerEnter={onPeek} onFocus={onPeek} className="group flex w-full cursor-pointer flex-wrap items-center gap-x-3 px-4 py-2 text-left transition-colors hover:bg-sunk sm:px-5">
      <span className={`stat w-11 shrink-0 text-xl ${sameYear ? "invisible" : ""}`}>{row.season}</span>
      {tag && (
        <span className={`w-12 shrink-0 rounded-[3px] px-1.5 py-px text-center text-[11px] font-bold ${tag === "Final" ? "bg-ball" : "bg-sunk text-muted ring-1 ring-inset ring-line"}`}>{tag}</span>
      )}
      <span className="flex shrink-0 -space-x-2">
        <Avatar name={names[0]} size="h-7 w-7 text-xs ring-2 ring-surface" />
        <Avatar name={names[1]} size="h-7 w-7 text-xs ring-2 ring-surface" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold">{names[0]}</span> <span className="text-muted">beat {names[1]}</span>{" "}
        <span className="text-xs tabular-nums text-muted max-sm:hidden">{scoreText(row.score)}</span>
      </span>
      {page ? <span className="shrink-0 rounded-[3px] bg-ball/60 px-1.5 py-px text-xs font-semibold tabular-nums">p. {page}</span> : null}
      {/* A taste of the story, once pointed at */}
      <span className="grid w-full grid-rows-[0fr] pl-14 transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
        <span className="overflow-hidden">
          <span className="mt-1 block border-l-2 border-ball pl-2.5 text-sm text-muted">{teaser ?? "Opening the record…"}</span>
        </span>
      </span>
    </button>
  );
}

// How many finals an event shows before "Show all"
const RECENT_FINALS = 10;

const surpriseHref = (slam: string | null) => (slam ? `/explore?m=random&slam=${encodeURIComponent(slam)}` : "/explore?m=random");
const surpriseWhat = (slam: string | null) => (slam ? `Random ${slam} match` : "Random Grand Slam match");

/** A random Slam semifinal or final, from one Slam once one is picked: at the foot of every story */
function SurpriseMe({ className = "", again = false, slam = null }: { className?: string; again?: boolean; slam?: string | null }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Link href={surpriseHref(slam)} scroll={false} title={surpriseWhat(slam)} className="btn btn-primary btn-lg">
        {again ? "Surprise me again" : "Surprise me"}
      </Link>
    </div>
  );
}

/** Surprise me, small: at the right end of the search bar */
function SurpriseSmall({ slam }: { slam: string | null }) {
  return (
    <Link href={surpriseHref(slam)} scroll={false} title={surpriseWhat(slam)} aria-label={`Surprise me: ${surpriseWhat(slam)}`} className="btn btn-primary">
      Surprise me
    </Link>
  );
}

/** With no match open: pick a Slam and a final, a match everyone talks about, or let chance pick */
function Start({ start, follow, slam, setSlam }: { start: StartData; follow: Follow; slam: string | null; setSlam: (slam: string | null) => void }) {
  const page = usePages();
  const isSlamTile = (slamTiles as readonly string[]).includes(slam ?? "");
  // A Slam's finals, or a big event's finals, semifinals and bronze medal matches
  const finals = start.finals.filter((r) => (isSlamTile ? r.event === slam : bigEventOf(r)?.key === slam));
  const finalNames = useMemo(() => namesOf(start.finals), [start.finals]);
  const teasers = useTeasers();
  const cardNames = useMemo(() => namesOf([...start.classics.map((c) => c.row), ...start.diary]), [start.classics, start.diary]);
  const panel = useRef<HTMLDivElement>(null);
  // A newly picked event starts at its last few finals again
  const [everything, setEverything] = useState(false);
  const [onTour, setOnTour] = useState<string>("atp");
  const pick = (t: string) => {
    setEverything(false);
    setSlam(t === slam ? null : t);
    requestAnimationFrame(() => panel.current && panel.current.getBoundingClientRect().top > innerHeight * 0.6 && glideTo(panel.current, "center"));
  };
  // Each tour that plays the picked event gets a column of its matches, year by year: the last few finals
  // to start with, everything (semifinals and bronze medal matches too) a click away. On a phone the
  // columns are one at a time, picked by tour.
  const tours = (["atp", "wta"] as const).filter((tour) => finals.some((r) => r.tour === tour));
  const shownTour = tours.includes(onTour as "atp" | "wta") ? onTour : tours[0];
  const finalsPanel = (
    <div ref={panel} className="fade-in panel mt-3">
      {tours.length > 1 && (
        <div className="border-b border-line px-4 py-2.5 lg:hidden">
          <Segmented label="Tour" options={tours.map((tour) => ({ id: tour as string, label: tour === "atp" ? "Men" : "Women" }))} value={shownTour} onChange={setOnTour} />
        </div>
      )}
      <div className={`grid ${tours.length > 1 ? "lg:grid-cols-2 lg:divide-x lg:divide-line" : ""}`}>
        {tours.map((tour) => {
          const all = finals
            .filter((r) => r.tour === tour)
            // Within a year: the final, then the semifinals, then a bronze medal match
            .sort((a, b) => b.season - a.season || roundRank(a.round) - roundRank(b.round));
          const onlyFinals = all.filter((r) => r.round === "F");
          const rows = everything ? all : onlyFinals.slice(0, RECENT_FINALS);
          return (
            <div key={tour} className={`min-w-0 ${shownTour === tour ? "" : "max-lg:hidden"}`}>
              <h3 className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
                <span className="panel-title">{tour === "atp" ? "Men's finals" : "Women's finals"}</span>
                {!isSlamTile && everything && <span className="panel-meta">with semifinals</span>}
              </h3>
              <ul className="divide-y divide-line">
                {rows.map((row, i) => (
                  <li key={row.id}>
                    <FinalRow
                      row={row}
                      tag={isSlamTile ? undefined : roundTags[row.round]}
                      sameYear={!isSlamTile && i > 0 && rows[i - 1].season === row.season}
                      page={page(row.id)}
                      onOpen={() => follow(row.id)}
                      names={finalNames(row)}
                      teaser={teasers.get(row.id)}
                      onPeek={() => teasers.want(row.id)}
                    />
                  </li>
                ))}
              </ul>
              {all.length > rows.length && (
                <div className="border-t border-line px-4 py-2.5 sm:px-5">
                  <button type="button" onClick={() => setEverything(true)} className="tag">
                    {isSlamTile ? `Show all ${onlyFinals.length} finals` : `Show all ${onlyFinals.length} finals, with semifinals`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="space-y-10">
      <section>
        <SectionHead title="Start at a Slam" body="Pick one for its last ten finals, then follow the story from any of them." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slamTiles.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={slam === t}
              onClick={() => pick(t)}
              style={{ borderTopColor: slamColours[t] }}
              className={`flex cursor-pointer items-center gap-3 rounded-md border border-t-4 bg-surface px-3 py-3 text-left transition-colors sm:px-4 ${
                slam === t ? "border-x-foreground border-b-foreground bg-sunk" : "border-x-line border-b-line hover:bg-sunk"
              }`}
            >
              <SlamLogo event={t} size="h-10 w-10 sm:h-12 sm:w-12" />
              <span className="min-w-0">
                <span className="block font-display text-base font-bold leading-tight sm:text-lg">{t}</span>
                <span className="block text-sm tabular-nums text-muted">{start.finals.filter((r) => r.event === t).length} finals</span>
              </span>
            </button>
          ))}
        </div>
        {slam && isSlamTile && finalsPanel}

        {/* The big events after the Slams, smaller: a flag and the city, or the event's own mark */}
        <h3 className="mt-6 font-display text-lg font-bold">Masters &amp; 1000s, tour finals and the Olympics</h3>
        <p className="text-sm text-muted">Their last ten finals, men&apos;s and women&apos;s, with semifinals a click away.</p>
        <div className="mt-2.5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4 lg:grid-cols-8">
          {bigEvents.map((b) => (
            <button
              key={b.key}
              type="button"
              aria-pressed={slam === b.key}
              onClick={() => pick(b.key)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition-colors ${slam === b.key ? "bg-foreground text-white" : "bg-surface hover:bg-sunk"}`}
            >
              <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center text-2xl leading-none">
                {b.key === "Olympics" ? <SlamLogo event="Olympics" size="h-7 w-7" /> : (b.flag ?? <CollectionIcon id="finals" className="h-5 w-5" />)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight">{b.label}</span>
                <span className={`block text-[11px] ${slam === b.key ? "text-white/70" : "text-muted"}`}>{b.tours.length > 1 ? "Men & women" : b.tours[0] === "atp" ? "Men" : "Women"}</span>
              </span>
            </button>
          ))}
        </div>
        {slam && !isSlamTile && finalsPanel}
      </section>

      {start.classics.length > 0 && (
        <section>
          <SectionHead title="Matches everyone talks about" body="Start with one you've heard of. Point at a card for a taste of its story." />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {start.classics.map(({ row, why }) => (
              <li key={row.id}>
                <StoryCard
                  label={`${row.event} ${row.season} · ${roundName({ ...row, event: row.event })}`}
                  surface={row.surface}
                  names={cardNames(row)}
                  score={row.score}
                  headline={why}
                  page={page(row.id)}
                  teaser={teasers.get(row.id)}
                  onPeek={() => teasers.want(row.id)}
                  onOpen={() => follow(row.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {start.diary.length > 0 && (
        <section>
          <SectionHead title="From your saga" />
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {start.diary.map((row) => (
              <li key={row.id}>
                <MatchCard row={row} page={page(row.id)} onOpen={() => follow(row.id)} names={cardNames(row)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------- Your trail: the matches explored this visit ---------- */

type Crumb = { id: string; label: string };
const CRUMBS = "courtsaga:explore-trail";
const crumbEvent = "courtsaga-trail";
const readCrumbs = () => {
  try {
    return sessionStorage.getItem(CRUMBS) ?? "[]";
  } catch {
    return "[]";
  }
};
const subscribeCrumbs = (on: () => void) => {
  window.addEventListener(crumbEvent, on);
  return () => window.removeEventListener(crumbEvent, on);
};

/** Where you've been: every match opened this visit, in order, a click from going back */
function Crumbs({ story, follow }: { story: Story; follow: Follow }) {
  const raw = useSyncExternalStore(subscribeCrumbs, readCrumbs, () => "[]");
  const crumbs = useMemo(() => {
    try {
      return JSON.parse(raw) as Crumb[];
    } catch {
      return [];
    }
  }, [raw]);
  const list = useRef<HTMLOListElement>(null);

  // Add this match to the end of the trail (once), and keep the newest in view
  useEffect(() => {
    try {
      const now = JSON.parse(readCrumbs()) as Crumb[];
      if (now[now.length - 1]?.id !== story.id) {
        const label = `${story.event} ${story.season} · ${roundName(asMatch(story))}`;
        sessionStorage.setItem(CRUMBS, JSON.stringify([...now.filter((c) => c.id !== story.id), { id: story.id, label }].slice(-30)));
        window.dispatchEvent(new Event(crumbEvent));
      }
    } catch {
      // No storage (a private window, say): no trail, nothing else lost
    }
  }, [story]);
  useEffect(() => {
    list.current?.scrollTo({ left: list.current.scrollWidth, behavior: "smooth" });
  }, [crumbs.length]);

  if (crumbs.length < 2) return null;
  return (
    <nav aria-label="Your trail" className="mb-5 flex items-center gap-3">
      <span className="shrink-0 text-sm font-semibold tabular-nums text-muted">{crumbs.length} explored</span>
      <ol ref={list} className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 text-sm [scrollbar-width:none]">
        {crumbs.map((c, i) => (
          <li key={c.id} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && <Chevron className="h-3 w-3 text-muted" />}
            {c.id === story.id ? (
              <span aria-current="page" className="rounded-[3px] bg-foreground px-2 py-0.5 font-semibold text-white">
                {c.label}
              </span>
            ) : (
              <button type="button" onClick={() => follow(c.id)} className="tag">
                {c.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------- Signed in ---------- */

export function ExploreSection({
  story,
  missing,
  slam,
  guest = false,
  seasons,
  start: startData,
}: {
  story: Story | null;
  missing: boolean;
  slam: string | null;
  seasons: [number, number] | null;
  guest?: boolean; // signed out, from a shared link: no starring, a way to sign up instead
  start: StartData;
}) {
  // The Slam picked on the start page, which Surprise me then keeps to
  const [picked, setPicked] = useState<string | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const page = usePages();
  const starOf = useStarState();
  const top = useRef<HTMLDivElement>(null);
  // Signed out, a shared link shows that match and nowhere else to go
  const follow = (id: string) => (guest ? undefined : start(() => router.push(`/explore?m=${encodeURIComponent(id)}`, { scroll: false })));
  const first = useRef(true);

  // A new story: bring its top into view
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (story && top.current && top.current.getBoundingClientRect().top < 0) glideTo(top.current, "start");
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {!guest && <MatchFinder seasons={seasons} onPick={(row) => follow(row.id)} inside={<SurpriseSmall slam={story ? slam : picked} />} />}
      <div ref={top} className="scroll-mt-6">
        {missing && <p className="mb-6 rounded border border-fault/30 bg-fault/5 px-4 py-3 font-medium text-fault">That match isn&apos;t in the record.</p>}
        {story ? (
          <>
            {/* Back to where Explore starts */}
            {!guest && (
              <>
                <Link href="/explore" className="mb-4 inline-block text-sm font-semibold text-court underline-offset-4 hover:underline">
                  ← All Slams
                </Link>
                <Crumbs story={story} follow={follow} />
              </>
            )}
            <StoryView
              story={story}
              follow={follow}
              pending={pending}
              page={page}
              star={<ShareLink story={story} />}
              take={guest ? <GuestTake /> : <YourTake story={story} />}
              starOf={starOf}
              still={guest}
            />
            {/* At the foot of the story: keep this match, or try another */}
            <div className="mt-12 flex flex-col items-center gap-8">
              {guest ? <StarDemo /> : <YourTake story={story} ask />}
              {!guest && <SurpriseMe again slam={slam} />}
            </div>
          </>
        ) : (
          <>
            <Start start={startData} follow={follow} slam={picked} setSlam={setPicked} />
          </>
        )}
      </div>
    </div>
  );
}
