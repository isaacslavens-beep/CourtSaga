"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Chevron, PageBar, StatBox } from "../../../ui";
import { answerQuestion } from "../actions";
import { QuizCredit, topicName, tourName } from "../parts";
import type { AskedQuestion, QuizAnswer, Turn } from "../shared";

/* Taking a quiz: one question at a time, typed, checked on the server, then what the answer was and the
   match behind it. A player's name is picked from a list as it's typed, so a misspelling can't cost the
   point; a year or a number is just typed. A quiz left halfway carries on where it stopped. */

type Shown = Extract<Turn, { status: "answered" }>;
type Option = { key: string; name: string };

const placeholders = { name: "Type a player's name", year: "Type a year", number: "Type a number" };

export function PlayQuiz({ id, questions, answered, about }: { id: string; questions: AskedQuestion[]; answered: QuizAnswer[]; about: string }) {
  const router = useRouter();
  const [results, setResults] = useState<boolean[]>(answered.map((a) => a.right));
  const [typed, setTyped] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [picked, setPicked] = useState<Option | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const next = useRef<HTMLButtonElement>(null);

  // The question on screen: the one being answered, or the one just answered while its answer shows
  const index = shown ? results.length - 1 : results.length;
  const q = questions[index];
  const right = results.filter(Boolean).length;

  useEffect(() => {
    if (shown) next.current?.focus();
    else input.current?.focus();
  }, [shown, index]);

  // The players the name being typed could be, once typing pauses; a newer search cancels an older one
  const wanted = q?.kind === "name" && !picked && !shown ? typed.trim() : "";
  useEffect(() => {
    if (!wanted) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quiz/players?tour=${q.tour}&q=${encodeURIComponent(wanted)}`, { signal: controller.signal });
        if (res.ok) {
          setOptions(await res.json());
          setActive(0);
        }
      } catch {}
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [wanted, q?.tour]);

  const pick = (o: Option) => {
    setPicked(o);
    setTyped(o.name);
    setOptions([]);
    setHint(null);
    input.current?.focus();
  };

  const send = (text: string, player: string | null = null) =>
    start(async () => {
      setFailed(false);
      try {
        const turn = await answerQuestion(id, results.length, text, player);
        if (turn.status === "again") setHint(turn.hint);
        else if (turn.status === "closed") router.refresh();
        else {
          setHint(null);
          setResults((r) => [...r, turn.right]);
          setShown(turn);
        }
      } catch {
        setFailed(true);
      }
    });

  const onward = () => {
    if (shown?.done) {
      router.refresh();
      return;
    }
    setShown(null);
    setTyped("");
    setPicked(null);
    setOptions([]);
  };

  if (!q) return null;
  return (
    <>
      <PageBar
        n={5}
        title="Quiz"
        foot={
          <div className="flex flex-wrap gap-2">
            <StatBox label="Question" value={`${index + 1} of ${questions.length}`} className="min-w-28" />
            <StatBox label="Right so far" value={right} className="min-w-28" />
          </div>
        }
      >
        <span className="text-sm text-muted">{about}</span>
      </PageBar>

      <section className="flex-1 pb-16 pt-6 sm:pt-8">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-8">
          {/* Where the quiz is: a square per question, green or red once answered */}
          <ol className="mb-4 flex gap-1" aria-label="Progress">
            {questions.map((_, i) => (
              <li
                key={i}
                aria-label={i < results.length ? (results[i] ? `Question ${i + 1}: right` : `Question ${i + 1}: wrong`) : `Question ${i + 1}`}
                className={`h-2 flex-1 rounded-[2px] ${i < results.length ? (results[i] ? "bg-grass" : "bg-fault") : i === index ? "bg-foreground" : "bg-line"}`}
              />
            ))}
          </ol>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-meta">
                {topicName(q.topic)} · {tourName(q.tour)}
              </span>
              <span className="panel-meta">
                {index + 1} / {questions.length}
              </span>
            </div>
            <div className="panel-body">
              <h2 className="font-display text-[1.5rem] font-bold leading-snug sm:text-[1.75rem]">{q.prompt}</h2>

              {!shown ? (
                <form
                  className="mt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (q.kind !== "name") {
                      if (typed.trim()) send(typed);
                    } else if (picked) send(picked.name, picked.key);
                    else if (options[active]) pick(options[active]);
                    else if (typed.trim()) setHint("Pick a player from the list, or choose Don't know.");
                  }}
                >
                  <div className="relative">
                    <input
                      ref={input}
                      value={typed}
                      onChange={(e) => {
                        setTyped(e.target.value);
                        setPicked(null);
                        setHint(null);
                        if (!e.target.value.trim()) setOptions([]);
                      }}
                      onKeyDown={(e) => {
                        if (!options.length || picked) return;
                        if (e.key === "Enter") {
                          e.preventDefault();
                          pick(options[active] ?? options[0]);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActive((a) => Math.min(a + 1, options.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActive((a) => Math.max(a - 1, 0));
                        }
                      }}
                      placeholder={q.kind === "name" ? "Start typing, then pick the player" : placeholders[q.kind]}
                      inputMode={q.kind === "name" ? "text" : "numeric"}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={80}
                      role={q.kind === "name" ? "combobox" : undefined}
                      aria-expanded={q.kind === "name" ? options.length > 0 && !picked : undefined}
                      aria-controls={q.kind === "name" ? "answer-options" : undefined}
                      aria-label="Your answer"
                      className={`field py-3 text-lg ${picked ? "border-foreground bg-sunk font-semibold" : ""}`}
                    />
                    {picked && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-grass">✓ Picked</span>}
                  </div>
                  {q.kind === "name" && !picked && wanted && options.length > 0 && (
                    <ul id="answer-options" role="listbox" aria-label="Players" className="mt-1 overflow-hidden rounded border border-line bg-surface">
                      {options.map((o, i) => (
                        <li key={o.key} role="option" aria-selected={i === active}>
                          <button
                            type="button"
                            onClick={() => pick(o)}
                            onMouseEnter={() => setActive(i)}
                            className={`w-full cursor-pointer border-b border-line px-3 py-2 text-left font-semibold last:border-b-0 ${i === active ? "bg-sunk" : ""}`}
                          >
                            {o.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.kind === "name" && !picked && wanted && !options.length && <p className="mt-2 text-sm text-muted">Keep typing: pick the player from the list that comes up.</p>}
                  {hint && (
                    <p role="status" className="mt-2 font-medium text-clay">
                      {hint}
                    </p>
                  )}
                  {failed && (
                    <p role="alert" className="mt-2 font-medium text-fault">
                      That didn&apos;t go through. Try again.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={pending || (q.kind === "name" ? !picked : !typed.trim())} className="btn btn-primary">
                      {pending ? "Checking…" : "Answer"}
                    </button>
                    <button type="button" disabled={pending} onClick={() => send("")} className="btn btn-secondary">
                      Don&apos;t know
                    </button>
                  </div>
                </form>
              ) : (
                <div className={`mt-5 rounded border-l-4 p-4 ${shown.right ? "border-grass bg-grass/8" : "border-fault bg-fault/6"}`} role="status">
                  <p className={`font-display text-xl font-bold ${shown.right ? "text-grass" : "text-fault"}`}>{shown.right ? "✓ Right" : typed.trim() ? "✗ Not quite" : "The answer"}</p>
                  <p className="mt-1 text-lg">
                    {!shown.right && typed.trim() && <span className="text-muted line-through">{typed.trim()}</span>} {!shown.right && typed.trim() && "· "}
                    <strong>{shown.answer}</strong>
                  </p>
                  <p className="mt-2 leading-snug text-muted">{shown.fact}</p>
                  {shown.go && (
                    <Link href={`/explore?m=${encodeURIComponent(shown.go)}`} target="_blank" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-court underline-offset-4 hover:underline">
                      The match in Explore <Chevron />
                    </Link>
                  )}
                  <div className="mt-4">
                    <button ref={next} type="button" onClick={onward} className="btn btn-primary">
                      {shown.done ? "See the results" : "Next question"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <QuizCredit />
        </div>
      </section>
    </>
  );
}
