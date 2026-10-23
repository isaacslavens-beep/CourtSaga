"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { glideTo } from "../glide";
import { HighlightsLink, SlamLogo, TournamentLabel } from "../match-ui";
import { Avatar, CourtArt, TennisBall, chartStyles } from "./fun";
import { diaryPages, roundName, scoreText, toMatches, type Match, type MatchRow, type Round } from "./library";
import { highlightVideos } from "./media";
import { Scoreboard } from "./log";
import { useLog } from "./store";
import type { DrawVisual, EventVisual, Fact, H2HVisual, Part, SeasonVisual, StatsVisual, Story, Thread } from "./story";
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
function H2HChart({ v, story, follow, page }: { v: H2HVisual; story: Story; follow: Follow; page: (id: string) => number | null }) {
  const [A, B] = [story.names[story.a.key], story.names[story.b.key]];
  const glance: Glance = {
    faces: [A, B],
    stripMode: "rivalry",
    strip: v.meetings.map((m) => {
      const winner = m.winner === "a" ? A : B;
      const p = page(m.id);
      return {
        key: m.id,
        group: String(m.year),
        color: winner,
        value: 3,
        side: m.winner === "a" ? 1 : -1,
        watched: !!p,
        title: `${m.label}: ${winner} won${p ? ` · page ${p} of your diary` : ""}`,
        logId: m.id,
      };
    }),
    stripLegend: [
      { color: A, label: `${A} won` },
      { color: B, label: `${B} won` },
      { color: "", label: "Not in your log", faded: true },
    ],
  };
  return (
    <ShapeChart
      book={glance}
      caption={`The head-to-head after every meeting: above the middle line ${A} leads, below it ${B} does. Filled dots are the meetings in your diary; the ringed one is this match.`}
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

function Picture({ thread, story, colors, follow, page }: { thread: Thread; story: Story; colors: Record<"a" | "b", string>; follow: Follow; page: (id: string) => number | null }) {
  const v = thread.visual;
  if (!v) return null;
  if (v.kind === "h2h") return <H2HChart v={v} story={story} follow={follow} page={page} />;
  if (v.kind === "event") return <EventGrid v={v} story={story} colors={colors} follow={follow} />;
  if (v.kind === "season") return <SeasonChart v={v} story={story} follow={follow} />;
  if (v.kind === "draw") return <DrawPaths v={v} story={story} follow={follow} />;
  return <StatsTable v={v} story={story} colors={colors} />;
}

/* ---------- The story ---------- */

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
}: {
  story: Story;
  follow: Follow;
  pending: boolean;
  page: (id: string) => number | null;
  logHref?: (id: string) => string; // signed in: where to log a match
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
    <section key={t.id} aria-label={t.title} className={`min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6 ${wide.has(t.id) ? "lg:col-span-2" : ""}`}>
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
          <Picture thread={t} story={story} colors={colors} follow={follow} page={page} />
        </div>
      )}
    </section>
  );

  return (
    <div className={`transition-opacity duration-300 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
      {/* Which match this is, before anything else */}
      <header key={story.id} className="fade-in mb-8 flex items-center gap-4 sm:gap-5">
        <SlamLogo event={story.event} size="h-14 w-14 sm:h-20 sm:w-20" />
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {story.event} {story.season} <span className="text-court">· {roundName(match)}</span>
          </h2>
          <p className="mt-1.5 text-lg font-medium text-muted sm:text-xl">
            <span className="font-semibold text-foreground">{story.a.name}</span> beat <span className="font-semibold text-foreground">{story.b.name}</span>{" "}
            <span className="whitespace-nowrap font-mono text-base">{scoreText(story.score)}</span>
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-10">
        {/* The match, as a page of the record */}
        <div className="min-w-0">
          <div key={story.id} className="page-turn page-stack overflow-hidden rounded-3xl border border-line bg-surface">
            <p className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 text-sm">
              <span className="font-semibold">
                {here ? (
                  <>
                    Page {here} <span className="font-normal text-muted">of your diary</span>
                  </>
                ) : (
                  <span className="font-normal text-muted">Not in your diary</span>
                )}
              </span>
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
              {logHref && (
                <Link
                  href={logHref(story.id)}
                  className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 font-semibold transition ${
                    here ? "border-2 border-line text-court hover:border-court" : "bg-ball text-[#0b0d12] shadow-md shadow-black/10 hover:brightness-105"
                  }`}
                >
                  {here ? `Open page ${here} in your diary` : "Watched it? Log this match"}
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
                <li key={f.key} className={i === 0 ? "font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl" : "text-lg font-medium leading-relaxed"}>
                  <Parts parts={f.parts} follow={follow} />.
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-lg text-muted">A quiet one: nothing in the record stands out about it. The threads below still lead somewhere.</p>
          )}
        </div>
      </div>

      {/* The rivalry first, then where to go next, then everything else */}
      <div className="mt-10 grid items-start gap-5 lg:grid-flow-dense lg:grid-cols-2">
        {h2h && thread(h2h)}
        {story.trail.length > 0 && <Trail story={story} follow={follow} page={page} />}
        {rest.map(thread)}
      </div>
    </div>
  );
}

/** Where to go next: the matches the story points to, each a page to turn to with the reason on it */
function Trail({ story, follow, page }: { story: Story; follow: Follow; page: (id: string) => number | null }) {
  return (
    <section aria-label="Follow the thread" className="min-w-0 rounded-3xl bg-court p-5 text-court-ink shadow-lg sm:p-6 lg:col-span-2">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-2xl font-bold tracking-tight">Follow the thread</h3>
        <span className="text-sm text-white/75">Every match here has its own story. Turn to one.</span>
      </header>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {story.trail.map((t, i) => {
          const r = story.refs[t.ref];
          const p = page(t.ref);
          const [w, l] = [story.names[r.w], story.names[r.l]];
          return (
            <li key={t.ref}>
              <button
                type="button"
                onClick={() => follow(t.ref)}
                className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface text-left text-foreground shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="relative block h-20 overflow-hidden">
                  <CourtArt surface={r.surface} className="absolute inset-0 h-full w-full scale-150 transition-transform duration-500 group-hover:scale-[1.6]" />
                  <span className="absolute inset-0 bg-gradient-to-r from-[#0a1220]/80 to-[#0a1220]/20" />
                  <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-ball font-display text-sm font-bold text-[#0b0d12]">{i + 1}</span>
                  <span className="absolute bottom-2.5 left-3 right-3 flex min-w-0 items-center gap-2 text-white">
                    <TournamentLabel event={r.label} surface={r.surface} onPhoto className="text-sm" />
                  </span>
                  <span className="absolute right-3 top-3 flex -space-x-2">
                    <Avatar name={w} size="h-9 w-9 text-xs ring-2 ring-white/80" />
                    <Avatar name={l} size="h-9 w-9 text-xs ring-2 ring-white/80" />
                  </span>
                </span>
                <span className="flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-3">
                  <span className="font-display text-lg font-bold leading-snug">{t.why}</span>
                  <span className="text-sm text-muted">
                    <span className="font-semibold text-foreground">{w}</span> beat {l} <span className="whitespace-nowrap font-mono text-xs">{scoreText(r.score)}</span>
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-court">
                    <span className="flex items-center gap-1.5">
                      Turn to it <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                    {p ? <span className="rounded-full bg-ball/50 px-2 py-0.5 text-xs text-foreground">p. {p} of your diary</span> : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
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

/** One final in a Slam's list: the year, then who beat whom */
function FinalRow({ row, page, onOpen, names }: { row: MatchRow; page: number | null; onOpen: () => void; names: readonly [string, string] }) {
  return (
    <button type="button" onClick={onOpen} className="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-court/10">
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
    </button>
  );
}

/** A random Slam semifinal or final: on the start page, and above and below every story */
function SurpriseMe({ className = "", again = false }: { className?: string; again?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      <Link
        href="/explore?m=random"
        scroll={false}
        className="group inline-flex items-center gap-4 rounded-full bg-ball py-3 pl-3 pr-9 font-display text-2xl font-bold text-[#0b0d12] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl sm:text-3xl"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b0d12] transition-transform group-hover:rotate-180 sm:h-14 sm:w-14">
          <TennisBall filled className="h-8 w-8 sm:h-9 sm:w-9" />
        </span>
        {again ? "Surprise me again" : "Surprise me"}
      </Link>
      <span className="text-muted">A random Slam semifinal or final.</span>
    </div>
  );
}

/** With no match open: pick a Slam and a final, a match everyone talks about, or let chance pick */
function Start({ start, follow }: { start: StartData; follow: Follow }) {
  const page = usePages();
  const [slam, setSlam] = useState<string | null>(null);
  const finals = start.finals.filter((r) => r.event === slam);
  const finalNames = useMemo(() => namesOf(start.finals), [start.finals]);
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
        <p className="text-muted">Pick one for every final played there since {Math.min(...start.finals.map((r) => r.season))}, then follow the story from any of them.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slamTiles.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={slam === t}
              onClick={() => pick(t)}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 px-3 py-5 font-semibold shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                slam === t ? "border-court bg-surface shadow-lg" : "border-line bg-surface/80"
              }`}
            >
              <SlamLogo event={t} size="h-16 w-16 sm:h-20 sm:w-20" />
              <span className="text-center">{t}</span>
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
                        <FinalRow row={row} page={page(row.id)} onOpen={() => follow(row.id)} names={finalNames(row)} />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <SurpriseMe className="mt-6" />
      </section>

      {start.classics.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold tracking-tight">Matches everyone talks about</h2>
          <p className="text-muted">Start with one you&apos;ve heard of.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {start.classics.map(({ row, why }) => (
              <li key={row.id}>
                <MatchCard row={row} why={why} page={page(row.id)} onOpen={() => follow(row.id)} names={cardNames(row)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {start.diary.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold tracking-tight">From your diary</h2>
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

/* ---------- Signed in ---------- */

export function ExploreSection({ story, missing, start: startData }: { story: Story | null; missing: boolean; start: StartData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const page = usePages();
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
    <div ref={top} className="scroll-mt-6">
      {missing && <p className="mb-6 rounded-2xl bg-fault/10 px-4 py-3 font-medium text-fault">That match isn&apos;t in the record. Try finding it above.</p>}
      {story ? (
        <>
          <SurpriseMe className="mb-10" />
          <StoryView story={story} follow={follow} pending={pending} page={page} logHref={(id) => `/log?m=${encodeURIComponent(id)}`} />
          <SurpriseMe className="mt-12 justify-center" again />
        </>
      ) : (
        <Start start={startData} follow={follow} />
      )}
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
      {story ? <StoryView story={story} follow={(id) => void follow(id)} pending={pending} page={page} /> : <p className="text-muted">The match data isn&apos;t available right now.</p>}
    </div>
  );
}
