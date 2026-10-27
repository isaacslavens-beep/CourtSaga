"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { difficulties, topics, type Difficulty, type TopicId } from "../../diary/quiz";
import type { QuizEvent, QuizPick } from "@/lib/quiz";
import { SearchIcon, Segmented } from "../../ui";
import { startQuiz, type QuizRequest } from "./actions";
import { settingsQuery } from "./shared";

/* Making a quiz: which tour, how hard, about what (categories and tournaments), from which years, and
   how long; or all about one player. The same settings give a new quiz every time. The last settings are remembered in the
   browser; a link can carry them too (a results page's "New quiz, same settings"). */

type Tours = "atp" | "wta" | "both";
const counts = [5, 10, 15, 20] as const;
const SAVED = "courtsaga-quiz-settings";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Initial = { tours: Tours; difficulty: Difficulty; topics: TopicId[]; events: string[]; from: number; to: number; count: (typeof counts)[number]; player: QuizPick | null };

const subscribeSaved = (on: () => void) => {
  window.addEventListener("storage", on);
  return () => window.removeEventListener("storage", on);
};
const readSaved = () => {
  try {
    return localStorage.getItem(SAVED);
  } catch {
    return null;
  }
};

type Choices = { players: QuizPick[]; tournaments: QuizEvent[]; from: number; to: number };

export function QuizMaker({ players, tournaments, from, to }: Choices) {
  const params = useSearchParams();
  const stored = useSyncExternalStore(subscribeSaved, readSaved, () => null);
  // Settings from the link, or else the ones used last time, or else the usual
  const initial = useMemo((): Initial => {
    let saved: Record<string, string> = {};
    try {
      saved = JSON.parse(stored ?? "{}");
    } catch {}
    const get = (k: string) => params.get(k) ?? saved[k] ?? null;
    const d = get("d");
    const t = get("t");
    const ts = get("topics")?.split(",").filter((x): x is TopicId => topics.some((y) => y.id === x));
    const f = Number(get("from"));
    const l = Number(get("to"));
    const n = Number(get("n"));
    const p = params.get("p");
    return {
      difficulty: difficulties.some((x) => x.id === d) ? (d as Difficulty) : "medium",
      tours: t === "atp" || t === "wta" || t === "both" ? t : "both",
      topics: ts?.length ? ts : topics.map((x) => x.id),
      // The tournaments, as the data names them: a choice is on if all of its names are
      events: (get("ev") ?? "").split("|").filter((e) => tournaments.some((t) => t.events.includes(e))),
      from: f >= from && f <= to ? f : from,
      to: l >= from && l <= to ? l : to,
      count: counts.includes(n as never) ? (n as (typeof counts)[number]) : 10,
      player: p ? (players.find((x) => x.key === p) ?? null) : null,
    };
  }, [params, stored, players, tournaments, from, to]);
  return <Maker key={JSON.stringify({ ...initial, player: initial.player?.key })} initial={initial} players={players} tournaments={tournaments} from={from} to={to} />;
}

function Maker({ initial, players, tournaments, from, to }: Choices & { initial: Initial }) {
  const router = useRouter();
  const [tours, setTours] = useState<Tours>(initial.tours);
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty);
  const [chosen, setChosen] = useState<TopicId[]>(initial.topics);
  const [picked, setPicked] = useState<string[]>(tournaments.filter((t) => t.events.every((e) => initial.events.includes(e))).map((t) => t.key));
  const [eventQuery, setEventQuery] = useState("");
  const [first, setFirst] = useState(initial.from);
  const [last, setLast] = useState(initial.to);
  const [count, setCount] = useState<(typeof counts)[number]>(initial.count);
  const [player, setPlayer] = useState<QuizPick | null>(initial.player);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const years = useMemo(() => Array.from({ length: to - from + 1 }, (_, i) => from + i), [from, to]);
  const typed = fold(query.trim());
  const found = typed ? players.filter((p) => (tours === "both" || p.tour === tours) && fold(p.name).includes(typed)).slice(0, 6) : [];

  // Only the tournaments the chosen tour plays
  const playing = (t: QuizEvent) => (player ? t.tours.includes(player.tour) : tours === "both" || t.tours.includes(tours));
  const offered = tournaments.filter(playing);
  const chosenEvents = offered.filter((t) => picked.includes(t.key));
  const typedEvent = fold(eventQuery.trim());
  const foundEvents = typedEvent ? offered.filter((t) => !picked.includes(t.key) && fold(t.label).includes(typedEvent)).slice(0, 6) : [];
  const pickEvent = (key: string) => setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  const toggle = (id: TopicId) => setChosen((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id]));

  const go = () =>
    start(async () => {
      setError(null);
      const request: QuizRequest = {
        tours: player ? [player.tour] : tours === "both" ? ["atp", "wta"] : [tours],
        difficulty,
        topics: chosen,
        from: Math.min(first, last),
        to: Math.max(first, last),
        player: player?.key ?? null,
        events: chosenEvents.flatMap((t) => t.events),
        count,
      };
      try {
        localStorage.setItem(SAVED, JSON.stringify(Object.fromEntries(new URLSearchParams(settingsQuery({ ...request, player: null })))));
      } catch {}
      try {
        const res = await startQuiz(request);
        if ("error" in res) setError(res.error);
        else router.push(`/quiz/${res.id}`);
      } catch {
        setError("The quiz couldn't be made just now. Try again in a moment.");
      }
    });

  const label = "mb-2 block text-sm font-semibold";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="panel" aria-labelledby="make-quiz">
        <div className="panel-head">
          <h2 id="make-quiz" className="panel-title">
            Make a quiz
          </h2>
          <span className="panel-meta">A new one every time, even with the same settings</span>
        </div>
        <div className="panel-body space-y-6">
          <div>
            <span className={label}>How hard</span>
            <Segmented label="How hard" options={difficulties.map((d) => ({ id: d.id, label: d.label }))} value={difficulty} onChange={setDifficulty} />
            <p className="mt-2 text-sm text-muted">{difficulties.find((d) => d.id === difficulty)!.blurb} Every quiz mixes in a few easier and harder ones.</p>
          </div>

          <div>
            <span className={label}>Tour</span>
            {player ? (
              <p className="text-sm text-muted">{player.tour === "atp" ? "Men's" : "Women's"}: the tour {player.name} plays on.</p>
            ) : (
              <Segmented
                label="Tour"
                options={[
                  { id: "atp", label: "Men" },
                  { id: "wta", label: "Women" },
                  { id: "both", label: "Both" },
                ]}
                value={tours}
                onChange={setTours}
              />
            )}
          </div>

          <fieldset className="space-y-5">
            <legend className="mb-3 text-sm font-semibold">About</legend>
            <div>
              <span className="mb-2 block text-sm text-muted">Statistical categories</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Statistical categories">
                {topics.map((t) => {
                  const on = chosen.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(t.id)}
                      className={`flex min-w-0 flex-col rounded border px-3 py-2 text-left transition-colors ${on ? "border-foreground bg-foreground text-white" : "border-line-strong bg-surface text-foreground hover:border-foreground"}`}
                    >
                      <span className="text-sm font-bold">
                        {on ? "✓ " : ""}
                        {t.label}
                      </span>
                      <span className={`text-xs ${on ? "text-white/75" : "text-muted"}`}>{t.blurb}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm text-muted">
                Tournaments: {chosenEvents.length ? `only ${chosenEvents.length === 1 ? "this one" : `these ${chosenEvents.length}`}` : "any, or pick some"}
                {chosenEvents.length > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <button type="button" onClick={() => setPicked([])} className="cursor-pointer font-semibold text-court underline-offset-4 hover:underline">
                      Any tournament
                    </button>
                  </>
                )}
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tournaments">
                {offered
                  .filter((t) => t.group !== "other" || picked.includes(t.key))
                  .map((t) => {
                    const on = picked.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickEvent(t.key)}
                        className={`rounded border px-2.5 py-1 text-sm font-semibold transition-colors ${on ? "border-foreground bg-foreground text-white" : "border-line-strong bg-surface hover:border-foreground"} ${t.group === "slam" && !on ? "text-foreground" : ""}`}
                      >
                        {on ? "✓ " : ""}
                        {t.label}
                      </button>
                    );
                  })}
              </div>
              <div className="relative mt-2 max-w-md">
                <SearchIcon />
                <input value={eventQuery} onChange={(e) => setEventQuery(e.target.value)} placeholder="Another tournament: Halle, Dubai, Acapulco…" className="field pl-10" aria-label="Search for a tournament" />
                {foundEvents.length > 0 && (
                  <ul className="mt-1 overflow-hidden rounded border border-line bg-surface">
                    {foundEvents.map((t) => (
                      <li key={t.key}>
                        <button
                          type="button"
                          onClick={() => {
                            pickEvent(t.key);
                            setEventQuery("");
                          }}
                          className="flex w-full cursor-pointer items-baseline justify-between gap-3 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-sunk"
                        >
                          <span className="font-semibold">{t.label}</span>
                          <span className="shrink-0 text-xs text-muted">{t.questions} questions</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {typedEvent && !foundEvents.length && <p className="mt-2 text-sm text-muted">No tournament with questions by that name.</p>}
              </div>
              {chosenEvents.length > 0 && <p className="mt-2 text-sm text-muted">With tournaments picked, only questions about them come up: champions, finals, upsets and oddities there.</p>}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-x-8 gap-y-6">
            <div>
              <span className={label}>Years</span>
              <div className="flex items-center gap-2">
                <select aria-label="From" value={first} onChange={(e) => setFirst(Number(e.target.value))} className="field w-auto py-2">
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <span className="text-muted">to</span>
                <select aria-label="To" value={last} onChange={(e) => setLast(Number(e.target.value))} className="field w-auto py-2">
                  {years.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className={label}>Questions</span>
              <Segmented label="Questions" options={counts.map((n) => ({ id: n, label: String(n) }))} value={count} onChange={setCount} />
            </div>
          </div>

          <div>
            <span className={label}>All about one player (optional)</span>
            {player ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded border border-foreground bg-sunk px-3 py-1.5 font-semibold">{player.name}</span>
                <button type="button" onClick={() => setPlayer(null)} className="cursor-pointer text-sm font-semibold text-court underline-offset-4 hover:underline">
                  Any player
                </button>
              </div>
            ) : (
              <div className="relative max-w-md">
                <SearchIcon />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for a player" className="field pl-10" aria-label="Search for a player" />
                {found.length > 0 && (
                  <ul className="mt-1 overflow-hidden rounded border border-line bg-surface">
                    {found.map((p) => (
                      <li key={p.key}>
                        <button
                          type="button"
                          onClick={() => {
                            setPlayer(p);
                            setQuery("");
                          }}
                          className="flex w-full cursor-pointer items-baseline justify-between gap-3 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-sunk"
                        >
                          <span className="font-semibold">{p.name}</span>
                          <span className="shrink-0 text-xs text-muted">
                            {p.tour === "atp" ? "Men" : "Women"} · {p.questions} questions
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {typed && !found.length && <p className="mt-2 text-sm text-muted">No player with enough questions by that name.</p>}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
            <button type="button" onClick={go} disabled={pending} className="btn btn-primary btn-lg">
              {pending ? "Writing the quiz…" : "Start the quiz"}
            </button>
            {error && (
              <p role="alert" className="font-medium text-fault">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      <aside className="panel self-start" aria-labelledby="how-quiz">
        <div className="panel-head">
          <h2 id="how-quiz" className="panel-title">
            How it works
          </h2>
        </div>
        <ul className="panel-body space-y-3 text-[0.9375rem] leading-snug">
          <li>
            <strong>Type every answer</strong>: a player, a year or a number. No choices to pick from.
          </li>
          <li>
            <strong>Spelling can be rough.</strong> A surname is enough, unless two players share it.
          </li>
          <li>
            <strong>Every question comes from the data</strong>: every tour-level singles match since {from}, and the Statistics records.
          </li>
          <li>
            <strong>Then share the results.</strong> Anyone with the link sees the score and every answer, and can take the same questions.
          </li>
        </ul>
      </aside>
    </div>
  );
}
