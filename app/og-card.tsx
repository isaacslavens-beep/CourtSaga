import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* The one look every shared link's card has: the site's navy bar with the name, then the words on white
   on the left and a photo on the right. */

export const ogSize = { width: 1200, height: 630 };

// Each read is scoped to its own folder, so only those files are bundled with the cards
const [narrow700, archivo500, archivo700] = await Promise.all(
  ["archivo-narrow-700", "archivo-500", "archivo-700"].map((name) => readFile(join(process.cwd(), "assets", "fonts", `${name}.woff`))),
);

/** A photo from assets/photos, ready to put on a card */
export const ogPhoto = async (file: string) => `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "assets", "photos", file))).toString("base64")}`;

const header = "#0d1c33";
const ink = "#0c1726";
const muted = "#566176";
const line = "#dce1e8";
const ball = "#d6ec4a";

export function ogCard({ title, titleSize = 92, eyebrow, tags = [], photo, focus }: { title: string; titleSize?: number; eyebrow?: string; tags?: string[]; photo: string; focus: string }) {
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
          {/* The words */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 620, padding: "0 48px 0 64px" }}>
            <div style={{ display: "flex", width: 100, height: 10, background: ball }} />
            {eyebrow && <div style={{ display: "flex", marginTop: 30, fontSize: 22, fontWeight: 700, letterSpacing: 4, color: muted }}>{eyebrow}</div>}
            <div style={{ display: "flex", marginTop: eyebrow ? 12 : 32, fontFamily: "Archivo Narrow", fontSize: titleSize, lineHeight: 0.98, letterSpacing: -2 }}>{title}</div>
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 30 }}>
                {tags.map((tag) => (
                  <span key={tag} style={{ display: "flex", padding: "6px 14px", border: `2px solid ${line}`, borderRadius: 4, fontSize: 24, fontWeight: 700 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* The photo */}
          <img src={photo} alt="" width={580} height={520} style={{ width: 580, height: 520, objectFit: "cover", objectPosition: focus }} />
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Archivo Narrow", data: narrow700, weight: 700, style: "normal" },
        { name: "Archivo", data: archivo500, weight: 500, style: "normal" },
        { name: "Archivo", data: archivo700, weight: 700, style: "normal" },
      ],
    },
  );
}
