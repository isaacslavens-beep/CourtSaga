import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* The card a shared link shows: the site's own look. The navy bar with the name, then the line about it
   on white, under an ink rule. */

export const alt = "CourtSaga: explore and track the story of tennis.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Each read is scoped to its own folder, so only those files are bundled with the card
const [narrow700, archivo500, archivo700] = await Promise.all(
  ["archivo-narrow-700", "archivo-500", "archivo-700"].map((name) => readFile(join(process.cwd(), "assets", "fonts", `${name}.woff`))),
);

const header = "#0d1c33";
const ink = "#0c1726";
const muted = "#566176";
const ball = "#d6ec4a";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#fff", color: ink, fontFamily: "Archivo" }}>
        {/* The bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: 120, padding: "0 72px", background: header, color: "#fff" }}>
          <svg width={48} height={48} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10.5" fill={ball} />
            <path d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "Archivo Narrow", fontSize: 50, letterSpacing: -0.5 }}>CourtSaga</span>
        </div>

        {/* The line */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "0 72px" }}>
          <div style={{ display: "flex", width: 120, height: 10, background: ball }} />
          <div style={{ display: "flex", marginTop: 36, fontFamily: "Archivo Narrow", fontSize: 104, lineHeight: 0.98, letterSpacing: -2 }}>
            Explore and track the story of tennis.
          </div>
          <div style={{ display: "flex", marginTop: 32, fontSize: 32, color: muted }}>Free · courtsaga.com</div>
        </div>
        <div style={{ display: "flex", height: 14, background: ink }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo Narrow", data: narrow700, weight: 700, style: "normal" },
        { name: "Archivo", data: archivo500, weight: 500, style: "normal" },
        { name: "Archivo", data: archivo700, weight: 700, style: "normal" },
      ],
    },
  );
}
