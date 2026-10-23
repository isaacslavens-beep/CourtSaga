"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { glideTo } from "../glide";
import { HighlightsLink, SlamLogo, TournamentLabel } from "../match-ui";
import { Avatar, BallScore, CourtArt, chartStyles } from "./fun";
import { diaryPages, roundName, scoreText, toMatches, watched, watchedHow, type Match, type MatchRow, type Round, type WatchMode } from "./library";
import { starMatch, updateEntry } from "../(app)/actions";
import { highlightVideos } from "./media";
import { Scoreboard } from "./log";
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

function Parts({ parts, follow }: { parts: Part[]; follow: Follow }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
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
function FactLine({ fact, follow, colors }: { fact: Fact; follow: Follow; colors: Record<"a" | "b", string> }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: fact.side ? colors[fact.side] : "var(--line)" }} />
      <span className="min-w-0 leading-relaxed">
        <Parts parts={fact.parts} follow={follow} />
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

function H2HChart({ v, story, follow, page, starOf }: { v: H2HVisual; story: Story; follow: Follow; page: (id: string) => number | null; starOf: StarOf }) {
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
      caption={`The head-to-head after every meeting: above the middle line ${A} leads, below it ${B} does. Filled dots are the meetings you starred; the dark-ringed one is this match.`}
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
    ? { background: "var(--ball)", color: "#0b0d12" }
    : { background: `color-mix(in srgb, ${color} ${shade}%, var(--surface))`, color: shade >= 70 ? "#ffffff" : "var(--foreground)" };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-9 w-full min-w-7 items-center justify-center rounded-lg text-xs font-bold transition ${onClick ? "cursor-pointer hover:scale-110 hover:shadow-md" : ""} ${focus ? "ring-2 ring-foreground ring-offset-2 ring-offset-surface" : ""} ${won ? "shadow-sm ring-1 ring-black/15" : ""}`}
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
            <span key={y} className={`text-center text-xs tabular-nums ${y === story.season ? "font-bold text-foreground" : "text-muted"}`}>
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
                  <span key={`${row.side}-${i}`} aria-label={`${v.seasons[i]}: didn't play`} className="flex h-9 items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted/60">
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
          <span className="flex h-9 w-8 items-center justify-center rounded-lg border border-dashed border-line">–</span>
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
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Avatar name={story.names[key]} size="h-6 w-6 text-[10px]" />
              {story.names[key]}
            </p>
            <ol className="mt-2 space-y-0.5 text-sm">
              {path.steps.map((st) => (
                <li key={st.id}>
                  <button
                    type="button"
                    onClick={() => !st.focus && follow(st.id)}
                    className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1 text-left ${st.focus ? "bg-ball/35" : "cursor-pointer hover:bg-court/10"}`}
                  >
                    <span className="w-9 shrink-0 font-mono text-xs text-muted">{roundCodes[st.round]}</span>
                    <span className={`min-w-0 flex-1 truncate ${st.won ? "" : "text-muted line-through decoration-fault/50"}`}>
                      {st.won ? "beat" : "lost to"} {story.names[st.opp]}
                      {st.oppSeed ? <span className="text-muted"> ({st.oppSeed})</span> : null}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted">{scoreText(st.score)}</span>
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
      {v.rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 border-b border-line/60 py-1.5 last:border-0">
          <span className={`flex items-center gap-1.5 font-mono tabular-nums ${r.lead === "a" ? "font-bold" : "text-muted"}`}>
            {r.lead === "a" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.a }} />}
            {r.a}
          </span>
          <span className="text-center text-xs text-muted">{r.label}</span>
          <span className={`flex items-center justify-end gap-1.5 font-mono tabular-nums ${r.lead === "b" ? "font-bold" : "text-muted"}`}>
            {r.b}
            {r.lead === "b" && <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors.b }} />}
          </span>
        </div>
      ))}
    </div>
  );
}

function Picture({ thread, story, colors, follow, page, starOf }: { thread: Thread; story: Story; colors: Record<"a" | "b", string>; follow: Follow; page: (id: string) => number | null; starOf: StarOf }) {
  const v = thread.visual;
  if (!v) return null;
  if (v.kind === "h2h") return <H2HChart v={v} story={story} follow={follow} page={page} starOf={starOf} />;
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
      {won && <span aria-hidden className="ml-auto h-2 w-2 shrink-0 rounded-full bg-ball ring-1 ring-black/15" />}
    </span>
  );
  const open = slot.played && !slot.focus;
  return (
    <button
      type="button"
      onClick={() => open && follow(slot.id)}
      disabled={!slot.played}
      title={slot.focus ? "This match" : slot.played ? "Explore it" : "A walkover: never played"}
      className={`flex w-full min-w-0 flex-col gap-1 rounded-xl border px-3 py-2 text-left text-sm shadow-sm transition ${
        slot.focus ? "cursor-default border-ball bg-ball/20 ring-2 ring-ball" : open ? "cursor-pointer border-line bg-surface hover:-translate-y-0.5 hover:border-court hover:shadow-md" : "border-dashed border-line bg-surface/60"
      }`}
    >
      {row(slot.w, slot.ws, true)}
      {row(slot.l, slot.ls, false)}
      <span className="font-mono text-[11px] text-muted">{scoreText(slot.score)}</span>
    </button>
  );
}

/** The semifinals feeding the final, with lines joining them, for a semifinal's or final's story */
function MiniBracket({ b, story, follow }: { b: Bracket; story: Story; follow: Follow }) {
  return (
    <div className="mt-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">The last four</p>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center">
        <div className="space-y-3">
          {b.semis.map((s) => (
            <BracketMatch key={s.id} slot={s} story={story} follow={follow} />
          ))}
        </div>
        {/* The lines: each semifinal's winner on to the final */}
        <div aria-hidden className="relative h-full">
          <span className="absolute inset-y-1/4 left-0 right-1/2 rounded-r-lg border-y-2 border-r-2 border-line" />
          <span className="absolute left-1/2 right-0 top-1/2 border-t-2 border-line" />
        </div>
        <div>
          {b.final ? (
            <BracketMatch slot={b.final} story={story} follow={follow} />
          ) : (
            <span className="block rounded-xl border border-dashed border-line px-3 py-4 text-center text-sm text-muted">Final not in the record yet</span>
          )}
          {b.final && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold">
              <span aria-hidden>🏆</span> {story.names[b.final.w]}
            </p>
          )}
        </div>
      </div>
    </div>
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
  logHref,
  star,
  starOf = () => null,
  lite = false,
}: {
  story: Story;
  follow: Follow;
  pending: boolean;
  page: (id: string) => number | null;
  logHref?: (id: string) => string; // signed in: where a starred match's diary page is
  star?: ReactNode; // the star button, beside the title
  starOf?: StarOf; // whether a match is starred, and watched
  lite?: boolean; // the landing's demo: on a phone, only the threads that read quickest
}) {
  const match = asMatch(story);
  const [nameA, nameB] = [story.names[story.a.key], story.names[story.b.key]];
  const styles = chartStyles([nameA, nameB]);
  const colors = { a: styles.get(nameA)!.color, b: styles.get(nameB)!.color };
  const here = page(story.id);
  const label = `${story.event} ${story.season} · ${roundName(match)}`;

  const h2h = story.threads.find((t) => t.id === "h2h");
  const rest = story.threads.filter((t) => t.id !== "h2h");
  const thread = (t: Thread) => (
    <section
      key={t.id}
      aria-label={t.title}
      className={`min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6 ${wide.has(t.id) ? "lg:col-span-2" : ""} ${lite && !quick.has(t.id) ? "max-sm:hidden" : ""}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-xl font-bold tracking-tight">{t.title}</h3>
        {t.kicker && <span className="text-sm text-muted">{t.kicker}</span>}
      </header>
      {t.facts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {t.facts.map((f) => (
            <FactLine key={f.key} fact={f} follow={follow} colors={colors} />
          ))}
        </ul>
      )}
      {t.visual && (
        <div className={t.facts.length ? "mt-5 border-t border-line pt-4" : "mt-4"}>
          <Picture thread={t} story={story} colors={colors} follow={follow} page={page} starOf={starOf} />
        </div>
      )}
    </section>
  );

  return (
    <div className={`transition-opacity duration-300 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
      {/* Which match this is, before anything else */}
      <header key={story.id} className="fade-in mb-8 flex flex-wrap items-center gap-x-5 gap-y-4">
        <span className="text-5xl sm:text-7xl">
          <SlamLogo event={story.event} size="h-14 w-14 sm:h-20 sm:w-20" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {story.event} {story.season} <span className="text-court">· {roundName(match)}</span>
          </h2>
          <p className="mt-1.5 text-lg font-medium text-muted sm:text-xl">
            <span className="font-semibold text-foreground">{story.a.name}</span> beat <span className="font-semibold text-foreground">{story.b.name}</span>{" "}
            <span className="whitespace-nowrap font-mono text-base">{scoreText(story.score)}</span>
          </p>
        </div>
        {star && <div className="w-full sm:ml-auto sm:w-auto">{star}</div>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-10">
        {/* The match, as a page of the record */}
        <div className="min-w-0">
          <div key={story.id} className={`page-turn page-stack overflow-hidden rounded-3xl border bg-surface ${here ? "border-ball ring-4 ring-ball/60" : "border-line"}`}>
            {/* Starred: say so loudly, across the top of the card */}
            {here && (
              <p className="flex items-center gap-2 bg-ball px-4 py-2.5 font-display text-lg font-bold text-[#0b0d12]">
                <span aria-hidden className="text-xl">★</span> In your saga
                <span className="ml-auto font-sans text-sm font-semibold opacity-75">page {here}</span>
              </p>
            )}
            <p className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 text-sm">
              <span className="font-semibold">{here ? <span className="text-muted">Starred</span> : <span className="font-normal text-muted">Not in your saga</span>}</span>
              <span className="text-muted">
                {new Date(`${story.date.slice(0, 7)}-15`).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                {story.minutes ? ` · ${Math.floor(story.minutes / 60)} h ${String(story.minutes % 60).padStart(2, "0")}` : ""}
              </span>
            </p>
            <div className="relative">
              <CourtArt surface={story.surface} className="aspect-[16/9] w-full" />
              <div className="absolute inset-x-0 top-0 flex flex-col items-start gap-2 bg-gradient-to-b from-[#0a1220]/75 to-transparent px-4 pb-10 pt-3 text-white">
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
              {logHref && here && (
                <Link
                  href={logHref(story.id)}
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-line px-4 py-2.5 font-semibold text-court transition hover:border-court"
                >
                  Open it in your stars
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* The story in three lines */}
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">The story</p>
          {story.lede.length ? (
            <ol className="mt-3 space-y-4">
              {story.lede.map((f, i) => (
                <li
                  key={`${story.id}-${f.key}`}
                  style={{ animationDelay: `${150 + i * 220}ms` }}
                  className={`rise-in ${i === 0 ? "font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl" : "text-lg font-medium leading-relaxed"}`}
                >
                  <Parts parts={f.parts} follow={follow} />.
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-lg text-muted">A quiet one: nothing in the record stands out about it. The threads below still lead somewhere.</p>
          )}
          {story.bracket && <MiniBracket b={story.bracket} story={story} follow={follow} />}
        </div>
      </div>

      {/* The rivalry first, then where to go next, then everything else */}
      <div className="mt-10 grid items-start gap-5 lg:grid-flow-dense lg:grid-cols-2">
        {h2h && thread(h2h)}
        {story.trail.length > 0 && <Trail story={story} follow={follow} page={page} lite={lite} />}
        {rest.map(thread)}
      </div>
    </div>
  );
}

/** Where to go next: the matches the story points to, each a page to turn to with the reason on it */
function Trail({ story, follow, page, lite = false }: { story: Story; follow: Follow; page: (id: string) => number | null; lite?: boolean }) {
  const teasers = useTeasers();
  return (
    <section aria-label="Follow the thread" className="min-w-0 rounded-3xl bg-court p-5 text-court-ink shadow-lg sm:p-6 lg:col-span-2">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl font-bold tracking-tight">Follow the thread</h3>
        <span className="text-sm text-white/75">Every match here has its own story. Point at one for a taste.</span>
      </header>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

/** A match as a card to turn to: its court and event on a banner, both faces, a headline, and a taste of its story */
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
  const [w, l] = names;
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={onPeek}
      onFocus={onPeek}
      className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface text-left text-foreground shadow-md ring-1 ring-line transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-court/40"
    >
      <span className="relative block h-20 overflow-hidden">
        <CourtArt surface={surface} className="absolute inset-0 h-full w-full scale-150 transition-transform duration-500 group-hover:scale-[1.6]" />
        <span className="absolute inset-0 bg-[#0a1220]/55" />
        {n !== undefined && <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-ball font-display text-sm font-bold text-[#0b0d12]">{n}</span>}
        <span className="absolute bottom-2.5 left-3 right-3 flex min-w-0 items-center gap-2 text-white">
          <TournamentLabel event={label} surface={surface} onPhoto className="text-sm" />
        </span>
        <span className="absolute right-3 top-3 flex -space-x-2 transition-transform duration-300 group-hover:-translate-y-0.5">
          <Avatar name={w} size="h-9 w-9 text-xs ring-2 ring-white/80" />
          <Avatar name={l} size="h-9 w-9 text-xs ring-2 ring-white/80" />
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
        <span className="font-display text-lg font-bold leading-snug">{headline}</span>
        <span className="text-sm text-muted">
          <span className="font-semibold text-foreground">{w}</span> beat {l} <span className="whitespace-nowrap font-mono text-xs">{scoreText(score)}</span>
        </span>
        {/* A taste of the story, once pointed at */}
        <span className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
          <span className="overflow-hidden">
            <span className="mt-1 block border-l-2 border-ball pl-2.5 text-sm font-medium italic leading-snug text-court">{teaser ?? "Opening the record…"}</span>
          </span>
        </span>
        <span className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-court">
          <span className="flex items-center gap-1.5">
            Turn to it <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </span>
          {page ? <span className="rounded-full bg-ball px-2 py-0.5 text-xs font-bold text-foreground">★ In your saga</span> : null}
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

/** Star this match in one click; once starred, say if you watched it, or go and add more */
function StarPanel({ story, ask = false }: { story: Story; ask?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const state = useStarState()(story.id);
  const { entries } = useLog();
  const run = (action: () => Promise<void>) =>
    start(async () => {
      await action();
      router.refresh();
    });
  if (!state) {
    const button = (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => starMatch(story.id))}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ball px-6 py-3 font-display text-lg font-bold text-[#0b0d12] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
      >
        <span aria-hidden className="text-xl">☆</span> {pending ? "Starring…" : "Star this match"}
      </button>
    );
    // At the foot of a story, the button comes with a question
    return ask ? (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-2xl font-bold tracking-tight">Want to remember this one?</p>
        {button}
      </div>
    ) : (
      button
    );
  }
  const entry = entries[story.id];
  return (
    <div className={`rise-in rounded-2xl bg-ball px-5 py-4 text-left text-[#0b0d12] shadow-lg shadow-black/15 ring-1 ring-black/10 transition ${pending ? "opacity-60" : ""}`}>
      <p className="flex flex-wrap items-center gap-x-2 font-display text-xl font-bold">
        <span aria-hidden className="text-2xl">★</span> In your saga
        <span className="font-sans text-sm font-semibold opacity-75">{state === "watched" ? `· watched ${watchedHow(entry?.watchedOn ?? null)}` : "· starred, not watched"}</span>
      </p>
      {entry?.rating ? (
        <span className="mt-1.5 inline-flex rounded-full bg-[#0b0d12] px-2 py-1">
          <BallScore value={entry.rating} size="sm" />
        </span>
      ) : null}
      {entry?.note && <p className="mt-2 max-w-sm border-l-2 border-[#0b0d12]/40 pl-3 text-sm font-medium italic">&ldquo;{entry.note}&rdquo;</p>}
      {state === "starred" && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold opacity-75">Watched it?</span>
          {starModes.map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              disabled={pending}
              onClick={() => run(() => updateEntry(story.id, { watchedOn: mode, watchedDate: story.date.slice(0, 7) }))}
              className="cursor-pointer rounded-full bg-white/80 px-2.5 py-0.5 font-semibold transition hover:bg-white"
            >
              {label}
            </button>
          ))}
        </p>
      )}
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold">
        <Link
          href={`/saga?m=${encodeURIComponent(story.id)}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0b0d12] px-3.5 py-1.5 text-ball transition hover:-translate-y-0.5"
        >
          See it in your saga <span aria-hidden>→</span>
        </Link>
        <Link href={`/star?m=${encodeURIComponent(story.id)}`} className="underline decoration-2 underline-offset-4">
          {entry?.rating || entry?.note ? "Edit your rating, pick or note" : "Add a rating, your pick or a note"}
        </Link>
      </p>
    </div>
  );
}

/** In the landing's demo, the star button leads to signing up */
function StarDemo() {
  return (
    <Link
      href="/signup"
      className="inline-flex items-center gap-2 rounded-full bg-ball px-6 py-3 font-display text-lg font-bold text-[#0b0d12] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <span aria-hidden className="text-xl">☆</span> Star this match
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
      className="group flex h-full w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-court hover:shadow-md"
    >
      <span className="flex shrink-0 -space-x-2">
        <Avatar name={names[0]} size="h-9 w-9 text-sm ring-2 ring-surface" />
        <Avatar name={names[1]} size="h-9 w-9 text-sm ring-2 ring-surface" />
      </span>
      <span className="min-w-0 flex-1">
        {why && <span className="block truncate text-xs font-semibold uppercase tracking-wide text-muted">{why}</span>}
        <span className="block truncate text-sm font-semibold">
          {row.event} {row.season} · {roundName({ ...row, event: row.event })}
        </span>
        <span className="block truncate text-sm text-muted">
          {names[0]} beat {names[1]} <span className="font-mono">{scoreText(row.score)}</span>
        </span>
      </span>
      {page ? <span className="shrink-0 rounded-full bg-ball/50 px-2 py-0.5 text-xs font-semibold">p. {page}</span> : null}
    </button>
  );
}

type StartData = { finals: MatchRow[]; classics: { row: MatchRow; why: string }[]; diary: MatchRow[] };

const slamTiles = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"] as const;
// Each Slam's own colour for its tile, as on the Slams' courts elsewhere on the site
const slamColours: Record<(typeof slamTiles)[number], string> = { "Australian Open": "#1b84c9", "Roland Garros": "#c8501c", Wimbledon: "#54237f", "US Open": "#002f87" };

/** One final in a Slam's list: the year, then who beat whom */
function FinalRow({ row, page, onOpen, names, teaser, onPeek }: { row: MatchRow; page: number | null; onOpen: () => void; names: readonly [string, string]; teaser?: string; onPeek: () => void }) {
  return (
    <button type="button" onClick={onOpen} onPointerEnter={onPeek} onFocus={onPeek} className="group flex w-full cursor-pointer flex-wrap items-center gap-x-3 rounded-xl px-2 py-2 text-left transition hover:bg-court/10">
      <span className="w-12 shrink-0 font-display text-lg font-bold tabular-nums">{row.season}</span>
      <span className="flex shrink-0 -space-x-2">
        <Avatar name={names[0]} size="h-8 w-8 text-xs ring-2 ring-surface" />
        <Avatar name={names[1]} size="h-8 w-8 text-xs ring-2 ring-surface" />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">
        <span className="font-semibold">{names[0]}</span> <span className="text-muted">beat {names[1]}</span>{" "}
        <span className="font-mono text-xs text-muted max-sm:hidden">{scoreText(row.score)}</span>
      </span>
      {page ? <span className="shrink-0 rounded-full bg-ball/50 px-2 py-0.5 text-xs font-semibold">p. {page}</span> : null}
      {/* A taste of the story, once pointed at */}
      <span className="grid w-full grid-rows-[0fr] pl-[3.75rem] transition-[grid-template-rows] duration-300 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
        <span className="overflow-hidden">
          <span className="mt-1 block border-l-2 border-ball pl-2.5 text-sm font-medium italic text-court">{teaser ?? "Opening the record…"}</span>
        </span>
      </span>
    </button>
  );
}

const surpriseHref = (slam: string | null) => (slam ? `/explore?m=random&slam=${encodeURIComponent(slam)}` : "/explore?m=random");
const surpriseWhat = (slam: string | null) => (slam ? `Random ${slam} match` : "Random Grand Slam match");

/** A random Slam semifinal or final, from one Slam once one is picked: at the foot of every story */
function SurpriseMe({ className = "", again = false, slam = null }: { className?: string; again?: boolean; slam?: string | null }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Link
        href={surpriseHref(slam)}
        scroll={false}
        title={surpriseWhat(slam)}
        className="rounded-full bg-ball px-9 py-4 font-display text-2xl font-bold text-[#0b0d12] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl sm:text-3xl"
      >
        {again ? "Surprise me again" : "Surprise me"}
      </Link>
    </div>
  );
}

/** Surprise me, small: at the top of a story, beside the way back to the Slams */
function SurpriseSmall({ slam }: { slam: string | null }) {
  return (
    <Link
      href={surpriseHref(slam)}
      scroll={false}
      title={surpriseWhat(slam)}
      aria-label={`Surprise me: ${surpriseWhat(slam)}`}
      className="nudge shine inline-block rounded-full bg-ball px-5 py-2 font-display text-lg font-bold text-[#0b0d12] shadow-md shadow-black/15 ring-1 ring-black/10 transition hover:scale-105 hover:shadow-lg sm:px-6"
    >
      Surprise me
    </Link>
  );
}

/** With no match open: pick a Slam and a final, a match everyone talks about, or let chance pick */
function Start({ start, follow, slam, setSlam }: { start: StartData; follow: Follow; slam: string | null; setSlam: (slam: string | null) => void }) {
  const page = usePages();
  const finals = start.finals.filter((r) => r.event === slam);
  const finalNames = useMemo(() => namesOf(start.finals), [start.finals]);
  const teasers = useTeasers();
  const cardNames = useMemo(() => namesOf([...start.classics.map((c) => c.row), ...start.diary]), [start.classics, start.diary]);
  const panel = useRef<HTMLDivElement>(null);
  const pick = (t: string) => {
    setSlam(t === slam ? null : t);
    requestAnimationFrame(() => panel.current && panel.current.getBoundingClientRect().top > innerHeight * 0.6 && glideTo(panel.current, "center"));
  };
  return (
    <div className="space-y-12">
      <section>
        <h2 className="font-display text-2xl font-bold tracking-tight">Start at a Slam</h2>
        <p className="text-muted">Pick one for every final played there, then follow the story from any of them.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slamTiles.map((t, i) => (
            <button
              key={t}
              type="button"
              aria-pressed={slam === t}
              onClick={() => pick(t)}
              style={{ background: slamColours[t], animationDelay: `${i * 70}ms` }}
              className={`rise-in group flex cursor-pointer flex-col items-center gap-3 rounded-3xl px-3 py-5 font-semibold text-white shadow-md transition duration-200 hover:-translate-y-1.5 hover:shadow-xl ${
                slam === t ? "-translate-y-1.5 shadow-xl ring-4 ring-ball ring-offset-2 ring-offset-[var(--page)]" : slam ? "opacity-70 hover:opacity-100" : ""
              }`}
            >
              <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <SlamLogo event={t} size="h-16 w-16 sm:h-20 sm:w-20" />
              </span>
              <span className="text-center font-display text-lg">{t}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs">{start.finals.filter((r) => r.event === t).length} finals</span>
            </button>
          ))}
        </div>
        {slam && (
          <div ref={panel} className="fade-in mt-4 grid gap-6 rounded-3xl border border-line bg-surface p-4 shadow-sm sm:p-6 lg:grid-cols-2">
            {(["atp", "wta"] as const).map((tour) => (
              <div key={tour} className="min-w-0">
                <h3 className="px-2 font-display text-lg font-bold">{tour === "atp" ? "Men's finals" : "Women's finals"}</h3>
                <ul className="mt-1 divide-y divide-line">
                  {finals
                    .filter((r) => r.tour === tour)
                    .map((row) => (
                      <li key={row.id}>
                        <FinalRow row={row} page={page(row.id)} onOpen={() => follow(row.id)} names={finalNames(row)} teaser={teasers.get(row.id)} onPeek={() => teasers.want(row.id)} />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {start.classics.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Matches everyone talks about</h2>
          <p className="text-muted">Start with one you&apos;ve heard of. Point at a card for a taste of its story.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {start.classics.map(({ row, why }, i) => (
              <li key={row.id} className="rise-in" style={{ animationDelay: `${i * 50}ms` }}>
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
          <h2 className="font-display text-xl font-bold tracking-tight">From your saga</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
    <nav aria-label="Your trail" className="mb-6 flex items-center gap-3">
      <span className="shrink-0 rounded-full bg-court px-3 py-1 text-sm font-bold text-court-ink">
        {crumbs.length} explored
      </span>
      <ol ref={list} className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 text-sm [scrollbar-width:none]">
        {crumbs.map((c, i) => (
          <li key={c.id} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-muted">→</span>}
            {c.id === story.id ? (
              <span aria-current="page" className="rounded-full bg-ball px-3 py-1 font-semibold text-[#0b0d12]">
                {c.label}
              </span>
            ) : (
              <button type="button" onClick={() => follow(c.id)} className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1 font-medium text-court transition hover:border-court">
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
  start: startData,
}: {
  story: Story | null;
  missing: boolean;
  slam: string | null;
  start: StartData;
}) {
  // The Slam picked on the start page, which Surprise me then keeps to
  const [picked, setPicked] = useState<string | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const page = usePages();
  const starOf = useStarState();
  const top = useRef<HTMLDivElement>(null);
  const follow = (id: string) => start(() => router.push(`/explore?m=${encodeURIComponent(id)}`, { scroll: false }));
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
    <div className="space-y-8">
      <div ref={top} className="scroll-mt-6">
        {missing && <p className="mb-6 rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">That match isn&apos;t in the record.</p>}
        {story ? (
          <>
            {/* Back to the Slams, or somewhere new */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Link href="/explore" className="font-semibold text-court underline-offset-4 hover:underline">
                ← All Slams
              </Link>
              <SurpriseSmall slam={slam} />
            </div>
            <Crumbs story={story} follow={follow} />
            <StoryView story={story} follow={follow} pending={pending} page={page} logHref={(id) => `/star?m=${encodeURIComponent(id)}`} star={<StarPanel story={story} />} starOf={starOf} />
            {/* At the foot of the story: keep this match, or try another */}
            <div className="mt-12 flex flex-col items-center gap-8">
              <StarPanel story={story} ask />
              <SurpriseMe again slam={slam} />
            </div>
          </>
        ) : (
          <>
            <div className="mb-10 flex flex-col items-start gap-3 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="max-w-xl text-muted">
                <span className="font-display text-lg font-bold text-foreground">Looking for a match you saw?</span> Find it on the{" "}
                <Link href="/star" className="font-semibold text-court underline underline-offset-4">
                  Star page
                </Link>
                , rate it, and explore it from there. Or let chance pick one.
              </p>
              <SurpriseSmall slam={picked} />
            </div>
            <Start start={startData} follow={follow} slam={picked} setSlam={setPicked} />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- The landing page's demo ---------- */

/**
 * The demo follows the sample log: picking a match there opens its story here when the record has it.
 * Stories come from /api/story as you click through.
 */
export function ExploreDemo({ initial, choices, toData, toSample }: { initial: Story | null; choices: { id: string; label: string }[]; toData: Record<string, string>; toSample: Record<string, string> }) {
  const { spotlight } = useLog();
  const [story, setStory] = useState(initial);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const page = usePages((id) => toSample[id]);
  const starOf = useStarState((id) => toSample[id]);
  const asked = useRef(0);

  const follow = async (id: string, scroll = true) => {
    const n = ++asked.current;
    setPending(true);
    try {
      const res = await fetch(`/api/story?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(String(res.status));
      const next: Story = await res.json();
      if (n !== asked.current) return;
      setStory(next);
      setFailed(false);
      if (scroll && root.current && root.current.getBoundingClientRect().top < 0) glideTo(root.current, "start");
    } catch {
      if (n === asked.current) setFailed(true);
    } finally {
      if (n === asked.current) setPending(false);
    }
  };

  // Arriving from the log above: open that match's story
  useEffect(() => {
    if (spotlight?.target !== "explore") return;
    glideTo(root.current, "start");
    const id = toData[spotlight.id];
    if (!id) return;
    const t = setTimeout(() => void follow(id, false), 0);
    return () => clearTimeout(t);
  }, [spotlight]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={root} className="scroll-mt-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-muted">Try:</span>
        {choices.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={story?.id === c.id}
            onClick={() => follow(c.id, false)}
            className={`cursor-pointer rounded-full border-2 px-3 py-1 text-sm font-semibold transition ${story?.id === c.id ? "border-court bg-court text-court-ink" : "border-line bg-surface text-court hover:border-court"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {failed && <p className="mb-4 rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">That story didn&apos;t load. Check your connection and try again.</p>}
      {story ? <StoryView story={story} follow={(id) => void follow(id)} pending={pending} page={page} lite star={<StarDemo />} starOf={starOf} /> : <p className="text-muted">The match data isn&apos;t available right now.</p>}
    </div>
  );
}
