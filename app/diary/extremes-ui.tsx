import Link from "next/link";
import { Chevron } from "../ui";
import { PAGE_SIZE, formatValue, statById, statName, type Extremes, type Neighbour, type Standing } from "./matches";

/* How extreme a match was, on its page: its drama score taken apart, and every number of it that ranks in
   the top tenth of its tour's matches, with the matches just either side and a link to the full list in
   Matches, opened at this match's page. Worked out by extremesOf in match-index.ts. */

const count = (n: number) => n.toLocaleString("en-GB");

/** "top 0.1%", "top 4%" */
function share(better: number, ties: number, n: number) {
  const p = ((better + ties) / n) * 100;
  return p < 0.1 ? "top 0.1%" : p < 1 ? `top ${p.toFixed(1)}%` : `top ${Math.round(p)}%`;
}

/** The list in Matches sorted by this number, opened at the page this match is on */
function listHref(base: string, stat: string, side: string, dir: "desc" | "asc", better: number) {
  const page = Math.floor(better / PAGE_SIZE) + 1;
  return `${base}?s=${stat}.${side}.${dir === "desc" ? "d" : "a"}${page > 1 ? `&pg=${page}` : ""}`;
}

function Next({ label, n, format, word }: { label: string; n: Neighbour; format: Parameters<typeof formatValue>[0]; word: string }) {
  return (
    <Link href={`/matches/${encodeURIComponent(n.id)}`} prefetch={false} className="group flex min-w-0 items-baseline gap-1.5 text-sm">
      <span className="shrink-0 text-xs font-semibold text-muted">{word}</span>
      <span className="truncate text-court group-hover:underline group-hover:underline-offset-4">{label}</span>
      <span className="shrink-0 tabular-nums text-muted">{formatValue(format, n.value)}</span>
    </Link>
  );
}

function StandingLine({ s, base }: { s: Standing; base: string }) {
  const stat = statById.get(s.stat)!;
  const rank = s.better + 1;
  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex items-start gap-3">
        <span className={`rank ${rank === 1 ? "rank-first" : ""}`}>{rank}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{statName(stat, s.side)}</p>
          <p className="text-sm text-muted">
            {s.ties > 1 ? "Joint " : ""}No. {count(rank)} of {count(s.n)} for the {s.dir === "desc" ? "most" : "least"} · {share(s.better, s.ties, s.n)}
          </p>
        </div>
        <span className="stat shrink-0 text-2xl leading-none">{formatValue(stat.format, s.value)}</span>
      </div>
      <div className="mt-1.5 space-y-0.5 pl-10">
        {s.above && <Next label={s.above.label} n={s.above} format={stat.format} word="Just ahead" />}
        {s.below && <Next label={s.below.label} n={s.below} format={stat.format} word="Just behind" />}
        <Link href={listHref(base, s.stat, s.side, s.dir, s.better)} prefetch={false} className="inline-flex items-center gap-1 text-sm font-semibold text-court underline-offset-4 hover:underline">
          The full list <Chevron className="h-2.5 w-2.5" />
        </Link>
      </div>
    </li>
  );
}

export function ExtremesPanel({ x }: { x: Extremes }) {
  const base = x.tour === "atp" ? "/matches" : "/matches/women";
  const tourWord = x.tour === "atp" ? "men's" : "women's";
  if (!x.drama && !x.standings.length) return null;
  const d = x.drama;
  return (
    <section aria-labelledby="how-extreme" className="panel">
      <header className="panel-head">
        <h3 id="how-extreme" className="panel-title">
          How extreme
        </h3>
        <span className="panel-meta">Against every {tourWord} match since 2003</span>
      </header>
      <div className="grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:divide-x lg:divide-line">
        {/* The drama score, part by part */}
        <div className="panel-body max-lg:border-b max-lg:border-line">
          {d ? (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">Drama score</p>
                  <p className="stat text-5xl leading-none">
                    {Math.round(d.score)}
                    <span className="text-xl text-muted">/100</span>
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{share(d.better, d.ties, d.n).replace(/^top/, "Top")}</p>
                  <p className="tabular-nums text-muted">
                    No. {count(d.better + 1)} of {count(d.n)}
                  </p>
                  <Link href={listHref(base, "drama", "m", "desc", d.better)} prefetch={false} className="font-semibold text-court underline-offset-4 hover:underline">
                    The most dramatic
                  </Link>
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {d.parts.map((p) => (
                  <li key={p.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">{p.label}</span>
                      <span className="tabular-nums text-muted">
                        {Math.round(p.got * 10) / 10} of {p.max}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-[2px] bg-sunk ring-1 ring-inset ring-line">
                      <div className="h-full bg-court" style={{ width: `${(p.got / p.max) * 100}%` }} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{p.why}.</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">
                From how the match unfolded, never from who played or what was at stake.{" "}
                <Link href={`${base}?s=drama.m.d`} prefetch={false} className="font-semibold text-court underline-offset-4 hover:underline">
                  How it&apos;s worked out
                </Link>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">No drama score: the match wasn&apos;t played to the end.</p>
          )}
        </div>

        {/* Where its numbers rank */}
        <div className="min-w-0">
          {x.standings.length ? (
            <ol className="divide-y divide-line">
              {x.standings.map((s) => (
                <StandingLine key={`${s.stat}.${s.side}.${s.dir}`} s={s} base={base} />
              ))}
            </ol>
          ) : (
            <p className="panel-body text-sm text-muted">None of its numbers is in the top tenth of the tour&apos;s matches, either way.</p>
          )}
        </div>
      </div>
    </section>
  );
}
