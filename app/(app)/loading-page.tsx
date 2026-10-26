import { TennisBall } from "../diary/fun";

/** Shown for a moment while a page opens: a ball bouncing */
export function OpeningDiary() {
  return (
    <p className="flex flex-col items-center gap-3 py-16 text-sm font-semibold text-muted" role="status">
      <TennisBall filled className="h-7 w-7 motion-safe:animate-bounce" />
      Loading…
    </p>
  );
}
