import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* The card a shared link shows: the site's navy bar with the name, then the line about it on white
   beside Alcaraz and Nadal at the Paris Olympics. */

export const alt = "CourtSaga: explore and track the story of tennis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Each read is scoped to its own folder, so only those files are bundled with the card
const [narrow700, archivo500] = await Promise.all(
  ["archivo-narrow-700", "archivo-500"].map((name) => readFile(join(process.cwd(), "assets", "fonts", `${name}.woff`))),
);
// Alcaraz and Nadal at Paris 2024, a copy sized for the card
const photo = `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "assets", "photos", "alcaraz-nadal-paris-2024.jpg"))).toString("base64")}`;

const header = "#0d1c33";
const ink = "#0c1726";
const ball = "#d6ec4a";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#fff", color: ink, fontFamily: "Archivo" }}>
        {/* The bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, height: 110, padding: "0 64px", background: header, color: "#fff" }}>
          <svg width={44} height={44} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10.5" fill={ball} />
            <path d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "Archivo Narrow", fontSize: 46, letterSpacing: -0.5 }}>CourtSaga</span>
        </div>

        <div style={{ display: "flex", flex: 1 }}>
          {/* The line */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 620, padding: "0 48px 0 64px" }}>
            <div style={{ display: "flex", width: 100, height: 10, background: ball }} />
            <div style={{ display: "flex", marginTop: 32, fontFamily: "Archivo Narrow", fontSize: 92, lineHeight: 0.98, letterSpacing: -2 }}>
              Explore and track the story of tennis
            </div>
          </div>
          {/* The photo */}
          <img src={photo} alt="" width={580} height={520} style={{ width: 580, height: 520, objectFit: "cover", objectPosition: "62% 30%" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo Narrow", data: narrow700, weight: 700, style: "normal" },
        { name: "Archivo", data: archivo500, weight: 500, style: "normal" },
      ],
    },
  );
}
