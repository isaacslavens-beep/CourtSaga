// One eased scroll for the whole page: slow in, slow out, a little longer for longer trips.
// Instant for anyone who prefers reduced motion.

let frame = 0;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Glide the window so `el` sits at the top (or centre) of the screen. */
export function glideTo(el: Element | null, align: "start" | "center" = "start", offset = 24) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const target =
    align === "center"
      ? window.scrollY + rect.top - (window.innerHeight - rect.height) / 2
      : window.scrollY + rect.top - offset;
  const end = Math.max(0, Math.min(target, document.documentElement.scrollHeight - window.innerHeight));
  const start = window.scrollY;
  const distance = end - start;

  cancelAnimationFrame(frame);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(distance) < 2) {
    window.scrollTo({ top: end, behavior: "instant" });
    return;
  }

  const duration = Math.min(1100, 450 + Math.abs(distance) * 0.25);
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo({ top: start + distance * easeInOutCubic(t), behavior: "instant" });
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

/** Bring a row into view inside its own scrolling list first, then glide the page to it. */
export function glideToRow(row: Element | null, list: Element | null) {
  if (!row) return;
  if (list && list.scrollHeight > list.clientHeight) {
    const r = row.getBoundingClientRect();
    const l = list.getBoundingClientRect();
    list.scrollTo({ top: list.scrollTop + r.top - l.top - (l.height - r.height) / 2, behavior: "smooth" });
  }
  glideTo(list ?? row, "center");
}
