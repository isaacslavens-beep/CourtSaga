import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* The card a shared link shows: a still of the hero. The Slams along the top, the court seen from above
   with the net on the right, the words in the backcourt and one photo over the service boxes. */

export const alt = "CourtSaga: a free, simple diary for the tennis you watch.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const file = (path: string) => readFile(join(process.cwd(), path));
const dataUri = async (path: string, type: string) => `data:${type};base64,${(await file(path)).toString("base64")}`;

const [bricolage, geist500, geist700] = await Promise.all(
  ["bricolage-700", "geist-500", "geist-700"].map((name) => file(`assets/fonts/${name}.ttf`)),
);
const slams = await Promise.all(
  ["australian-open", "roland-garros", "olympics", "wimbledon", "us-open"].map((name) => dataUri(`public/slams/${name}.png`, "image/png")),
);
const photo = await dataUri("public/photos/rybakina-uso-2026.jpg", "image/jpeg");

const surround = "#3a7556";
const court = "#2b5d9b";
const line = "rgba(255,255,255,0.85)";
const ballYellow = "#d4e157";

// The court: its outer edge, the alley between the sidelines, and where the service line falls
const C = { left: 40, top: 108, right: 1160, bottom: 590, alley: 28, service: 560 };

function Ball({ size, filled = true }: { size: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10.5" fill={filled ? ballYellow : "#dde3eb"} />
      <path
        d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default async function Image() {
  const courtLine = { position: "absolute", background: line } as const;
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: surround, color: "#fff", fontFamily: "Geist" }}>
        {/* The header row: the name and the Slams bobbing in the middle */}
        <div style={{ position: "absolute", left: C.left, top: 30, display: "flex", alignItems: "center", gap: 12 }}>
          <Ball size={40} />
          <span style={{ fontFamily: "Bricolage", fontSize: 36, letterSpacing: -0.5 }}>CourtSaga</span>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 22, display: "flex", justifyContent: "center", gap: 16 }}>
          {slams.map((src, i) => {
            const width = i === 2 ? 84 : 58;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  width,
                  height: 58,
                  padding: 6,
                  marginTop: i % 2 ? 6 : 0,
                  background: "#fff",
                  borderRadius: 14,
                  transform: `rotate(${i % 2 ? 4 : -4}deg)`,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.3)",
                }}
              >
                <img src={src} alt="" width={width - 12} height={46} style={{ width: width - 12, height: 46, objectFit: "contain" }} />
              </div>
            );
          })}
        </div>

        {/* The court: baseline on the left, net on the right */}
        <div
          style={{
            position: "absolute",
            left: C.left,
            top: C.top,
            width: C.right - C.left,
            height: C.bottom - C.top,
            display: "flex",
            background: court,
            borderLeft: `4px solid ${line}`,
            borderTop: `4px solid ${line}`,
            borderBottom: `4px solid ${line}`,
          }}
        />
        <div style={{ ...courtLine, left: C.left, width: C.right - C.left, top: C.top + C.alley, height: 4 }} />
        <div style={{ ...courtLine, left: C.left, width: C.right - C.left, top: C.bottom - C.alley - 4, height: 4 }} />
        <div style={{ ...courtLine, left: C.service, width: 4, top: C.top + C.alley, height: C.bottom - C.top - 2 * C.alley }} />
        <div style={{ ...courtLine, left: C.service, width: C.right - C.service, top: (C.top + C.bottom) / 2 - 2, height: 4 }} />
        <div style={{ ...courtLine, left: C.left, width: 16, top: (C.top + C.bottom) / 2 - 2, height: 4 }} />
        {/* The net: white tape, a post at each end */}
        <div style={{ ...courtLine, left: C.right - 2, width: 5, top: C.top - 14, height: C.bottom - C.top + 28, background: "#fff" }} />
        {[C.top - 18, C.bottom + 4].map((top) => (
          <div key={top} style={{ position: "absolute", left: C.right - 7, top, width: 15, height: 15, borderRadius: 15, background: "#0c1a2b", border: "2.5px solid rgba(255,255,255,0.85)" }} />
        ))}

        {/* The backcourt: the words */}
        <div style={{ position: "absolute", left: C.left + 64, top: C.top + C.alley, height: C.bottom - C.top - 2 * C.alley, width: C.service - C.left - 100, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "Bricolage", fontSize: 70, lineHeight: 1.02, letterSpacing: -2 }}>
            <span>Remember</span>
            <span>every match</span>
            <span>you watch.</span>
          </div>
          <div style={{ marginTop: 26, fontSize: 27, lineHeight: 1.35, color: "rgba(255,255,255,0.9)" }}>A free, simple diary for the tennis you watch.</div>
        </div>

        {/* The service boxes: one photo, leaning in */}
        <div style={{ position: "absolute", left: 618, top: 172, display: "flex", borderRadius: 20, overflow: "hidden", transform: "rotate(3deg)", boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}>
          <img src={photo} alt="" width={480} height={320} style={{ width: 480, height: 320, objectFit: "cover", objectPosition: "44% 30%" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bricolage, weight: 700, style: "normal" },
        { name: "Geist", data: geist500, weight: 500, style: "normal" },
        { name: "Geist", data: geist700, weight: 700, style: "normal" },
      ],
    },
  );
}
