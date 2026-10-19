"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { buildBook, buildShelf, type BookData } from "./demos/books";
import { Avatar, BallScore, CollectionIcon, chartStyles } from "./demos/fun";
import { matchById, monthLabel, sampleLog } from "./demos/library";
import { Segments, ShapeChart, beat, coverPhotos, roman, tintVars, tintsOf } from "./demos/saga-ui";
import { SlamLogo } from "./match-ui";

/* The hero's taste of step 3: books from the sample fan's saga as short stories that play
   themselves. Everything in them is bound from the sample log by the same rules as the saga below. */

const shelf = buildShelf(sampleLog);

function Kicker({ children }: { children: string }) {
  return (
    <p className="rise text-sm font-semibold uppercase tracking-[0.14em] text-court" style={beat(0)}>
      {children}
    </p>
  );
}

function Headline({ children }: { children: string }) {
  return (
    <p className="rise mt-1 font-display text-2xl font-bold tracking-tight" style={beat(1)}>
      {children}
    </p>
  );
}

/** The slides for one book: its shape, its busiest chapter, the fan's best words, and where it stands. */
function storyOf(book: BookData) {
  const rivalry = book.kind === "rivalry";
  const tones = chartStyles(book.faces);
  const [lead] = book.epilogue.big;

  // The chapter with the most matches in the log (the later one on a tie), and its best note
  const logged = (c: BookData["chapters"][number]) => c.entries.filter((e) => e.kind === "logged").length;
  const chapterIdx = book.chapters.reduce((best, c, i) => (logged(c) >= logged(book.chapters[best]) ? i : best), 0);
  const chapter = book.chapters[chapterIdx];
  const words = chapter.epigraph ?? book.chapters.find((c) => c.epigraph)?.epigraph ?? null;
  // A rivalry's meetings you didn't log only name their winner in the chart strip, which runs in the same order
  const chapterStrip = book.strip.filter((x) => x.group === chapter.year);

  const Shape = () => (
    <div>
      <Kicker>At a glance</Kicker>
      <Headline>{rivalry ? book.facts[0][1] : `${lead.n} ${lead.label}`}</Headline>
      <div className="rise mt-4 [--step:90ms]" style={beat(1)}>
        <ShapeChart book={book} caption={rivalry ? "Hollow bars: not in your log." : "Where they happened."} compact />
      </div>
    </div>
  );

  const Chapter = () => (
    <div>
      <Kicker>{`Chapter ${roman[chapterIdx]} · ${chapter.year}`}</Kicker>
      <Headline>{chapter.title}</Headline>
      <ol className="mt-4 space-y-2.5">
        {chapter.entries.slice(0, 4).map((e, i) => {
          const winner = e.kind === "logged" ? e.m.winner : chapterStrip[i]?.color;
          return (
            <li key={e.kind === "logged" ? e.id : e.key} className="rise flex items-center gap-2.5 text-sm" style={beat(2 + i)}>
              <Avatar name={winner} size="h-5 w-5 text-[9px]" tone={tones.get(winner)} />
              <span className={`min-w-0 flex-1 truncate ${e.kind === "logged" ? "font-medium" : "text-muted"}`}>
                {e.kind === "logged" ? `${e.m.event.replace(/ \d{4}$/, "")} · ${e.m.round}` : e.head}
              </span>
              {e.kind === "logged" ? <BallScore value={e.fan.rating} size="sm" /> : <span className="text-muted" aria-label="Not in your log">–</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );

  const Words = () => {
    const m = matchById[words!.id];
    return (
      <div className="flex h-full flex-col">
        <Kicker>Your words</Kicker>
        <blockquote className="rise mt-3 font-display text-[1.6rem] font-semibold leading-snug tracking-tight" style={beat(1)}>
          <span className="text-court">&ldquo;</span>
          {words!.note}
          <span className="text-court">&rdquo;</span>
        </blockquote>
        <div className="rise mb-4 mt-auto flex items-center gap-3" style={beat(3)}>
          <SlamLogo event={m.event} size="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {m.event} · {m.round}
            </p>
            <p className="text-sm text-muted">Watched {monthLabel(words!.date)}</p>
          </div>
          <BallScore value={sampleLog[words!.id].rating} size="sm" />
        </div>
      </div>
    );
  };

  const Stands = () => {
    const [a, b] = book.epilogue.big;
    return (
      <div>
        <Kicker>Where it stands</Kicker>
        {rivalry ? (
          <>
            <div className="rise mt-4 flex items-center justify-between" style={beat(1)}>
              {[a, b].map((side, k) => (
                <div key={side.label} className={`flex items-center gap-3 ${k ? "flex-row-reverse" : ""}`}>
                  <Avatar name={side.label} size="h-12 w-12 text-base" tone={tones.get(side.label)} />
                  <span className="font-display text-5xl font-bold leading-none tabular-nums">{side.n}</span>
                </div>
              ))}
            </div>
            <div className="rise mt-4 flex h-2 gap-[2px]" style={beat(2)} aria-hidden>
              <span className="grow-x rounded-l-full bg-[var(--tint-a)]" style={{ width: `${(a.n / (a.n + b.n)) * 100}%` }} />
              <span className="flex-1 rounded-r-full bg-[var(--tint-b)]" />
            </div>
          </>
        ) : (
          <div className="rise mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2" style={beat(1)}>
            {book.epilogue.big.map((x) => (
              <p key={x.label} className="flex items-baseline gap-2">
                <span className="font-display text-6xl font-bold leading-none tabular-nums">{x.n}</span>
                <span className="font-semibold text-muted">{x.label}</span>
              </p>
            ))}
          </div>
        )}
        <dl className="mt-4 divide-y divide-foreground/10 text-sm">
          {book.epilogue.facts.slice(0, 2).map(([label, value], i) => (
            <div key={label} className="rise flex items-baseline justify-between gap-4 py-2" style={beat(3 + i)}>
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };

  return [
    { label: "at a glance", dur: 6000, Slide: Shape },
    { label: `chapter ${roman[chapterIdx]}`, dur: 5500, Slide: Chapter },
    ...(words ? [{ label: "your words", dur: 5000, Slide: Words }] : []),
    { label: "where it stands", dur: 5500, Slide: Stands },
  ];
}

/**
 * One book from the sample saga, playing itself. `head` holds the first slide a little longer,
 * so cards side by side don't turn their pages together.
 */
export function HeroSaga({ bookId, head = 0 }: { bookId: string; head?: number }) {
  const shelfBook = shelf.find((b) => b.id === bookId) ?? shelf[0];
  const [{ book, slides }] = useState(() => {
    const book = buildBook(shelfBook.id, sampleLog, []);
    return { book, slides: storyOf(book) };
  });
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false); // past the first slide's head start
  const [held, setHeld] = useState(false); // under the pointer
  const [stopped, setStopped] = useState(false); // the pause button
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLElement>(null);

  // Don't play to an empty room
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  const paused = held || stopped || !visible;
  const { Slide } = slides[idx];
  const photo = coverPhotos[shelfBook.id];
  const tones = chartStyles(book.faces);

  return (
    <figure
      ref={ref}
      aria-label={`A sample saga: ${book.title}`}
      style={tintVars(tintsOf(shelfBook.id, shelfBook.players))}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      className={`stage glow relative isolate overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/40 ring-1 ring-white/10 ${paused ? "paused" : ""}`}
    >
      <div className="relative h-40">
        {/* Taller than the header and faded out before its own edge, so the drifting photo never
            leaves a seam where it is clipped */}
        {photo && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-52 overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent_72%)]">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              // No blur placeholder: its edge shows through while the photo drifts
              loading="eager"
              sizes="360px"
              className={`ken-burns object-cover opacity-80 ${photo.position}`}
            />
          </div>
        )}
        <div aria-hidden className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-4 top-2.5">
          <Segments
            labels={slides.map((s) => s.label)}
            current={idx}
            onPick={(i) => {
              setStarted(true);
              setIdx(i);
            }}
            auto={{
              dur: slides[idx].dur + (started ? 0 : head),
              onDone: () => {
                setStarted(true);
                setIdx((i) => (i + 1) % slides.length);
              },
            }}
          />
        </div>
        <figcaption className="absolute inset-x-5 bottom-2 flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-court">A saga · {book.kind}</span>
            <span className="block truncate font-display text-[1.4rem] font-bold leading-tight tracking-tight">{book.title}</span>
          </span>
          {book.kind === "rivalry" ? (
            <span className="flex shrink-0 -space-x-2 pb-1">
              {book.faces.map((p) => (
                <Avatar key={p} name={p} size="h-8 w-8 text-xs ring-2 ring-surface" tone={tones.get(p)} />
              ))}
            </span>
          ) : (
            <span className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tint-a)_30%,transparent)] ring-1 ring-white/20">
              <CollectionIcon id={book.id} className="h-5 w-5" />
            </span>
          )}
        </figcaption>
      </div>

      <div className="h-[18.5rem] px-5 pt-4" aria-live={stopped ? "polite" : "off"}>
        <div key={idx} className="h-full">
          <Slide />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pb-4">
        <a href="#story" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-court">
          Explore the whole saga
          <span aria-hidden className="transition group-hover:translate-y-0.5">
            ↓
          </span>
        </a>
        <button
          type="button"
          onClick={() => setStopped((s) => !s)}
          aria-label={stopped ? "Play the story" : "Pause the story"}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted ring-1 ring-white/15 transition hover:text-foreground hover:ring-white/40"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5 fill-current">
            {stopped ? <path d="M4.5 2.5v11l9-5.5z" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}
          </svg>
        </button>
      </div>
    </figure>
  );
}
