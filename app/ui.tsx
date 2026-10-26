import Link from "next/link";
import type { ReactNode } from "react";
import { TennisBall } from "./diary/fun";

/* The pieces every page is drawn with, so the site reads as one: the logo, a page's bar under the header,
   a section's rule and tab, a choice of a few, a search field and a figure in a box. The panels, buttons
   and tags themselves are classes in globals.css (.panel, .btn, .tag, .seg). */

/** The ball and the name, on the bar across the top of every page */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2">
      <TennisBall filled className="h-6 w-6" />
      <span className="font-display text-[1.375rem] font-bold leading-none">CourtSaga</span>
    </Link>
  );
}

/**
 * A page's bar, under the header: its number and its name, then whatever the page lets you set (which
 * tour) or wants to say about itself, on the right, and its headline figures, if it has any, underneath.
 */
export function PageBar({ n, title, children, foot }: { n?: number; title: ReactNode; children?: ReactNode; foot?: ReactNode }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-3.5 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h1 className="flex min-w-0 items-center gap-2.5 font-display text-[1.625rem] font-bold leading-tight sm:text-[1.875rem]">
            {n !== undefined && <span className="step h-7 w-7 text-sm">{n}</span>}
            {title}
          </h1>
          {children && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto">{children}</div>}
        </div>
        {foot && <div className="mt-3">{foot}</div>}
      </div>
    </div>
  );
}

/** A section of a page: a rule of ink with its name on a tab, and a line about it beside or under the tab */
export function SectionHead({ title, n, body, id, as: Heading = "h2", aside }: { title: ReactNode; n?: number; body?: ReactNode; id?: string; as?: "h2" | "h3"; aside?: ReactNode }) {
  return (
    <div className="section-rule mb-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <Heading id={id} className="section-tab">
          {n !== undefined && <span className="step h-5 w-5 text-xs">{n}</span>}
          {title}
        </Heading>
        {body && <p className="max-w-3xl flex-1 basis-72 pt-1.5 text-[0.9375rem] leading-snug text-muted">{body}</p>}
        {aside && <div className="ml-auto pt-1.5">{aside}</div>}
      </div>
    </div>
  );
}

/** A choice of a few, set as one strip with the chosen one in ink */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`seg ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.id)} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const SearchIcon = ({ className = "left-3" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" aria-hidden className={`pointer-events-none absolute top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 fill-none stroke-current stroke-2 text-muted ${className}`} strokeLinecap="round">
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="m13 13 4 4" />
  </svg>
);

/** A small arrowhead after a link that leads on */
export const Chevron = ({ className = "h-3 w-3" }: { className?: string }) => (
  <svg viewBox="0 0 12 12" aria-hidden className={`shrink-0 fill-none stroke-current stroke-2 ${className}`} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 2.5 8 6l-3.5 3.5" />
  </svg>
);

/** One figure in a box, its label above it: a page's or a panel's headline numbers */
export function StatBox({ label, value, className = "" }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded border border-line bg-surface px-3 py-1.5 ${className}`}>
      <p className="truncate text-xs font-medium text-muted">{label}</p>
      <p className="stat truncate text-xl leading-tight">{value}</p>
    </div>
  );
}

/** A saga's cover lines ("24 matches", "played 2008 to 2024") as a row of figures in boxes */
export function CoverStats({ lines, children }: { lines: string[]; children?: ReactNode }) {
  const figure = (line: string) => {
    const span = line.match(/^played (\d{4}) to (\d{4})$/);
    if (span) return { label: "Seasons", value: `${span[1]}–${span[2]}` };
    const one = line.match(/^played in (\d{4})$/);
    if (one) return { label: "Season", value: one[1] };
    const count = line.match(/^([\d,]+) (.+)$/);
    if (count) return { label: count[2][0].toUpperCase() + count[2].slice(1), value: count[1] };
    return { label: "", value: line };
  };
  return (
    <div className="flex flex-wrap gap-2">
      {lines.map((line) => {
        const f = figure(line);
        return <StatBox key={line} label={f.label} value={f.value} className="min-w-24" />;
      })}
      {children}
    </div>
  );
}
