import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* The card a shared match shows, the same for every match: Explore's own look, the four Slams on the US
   Open's court. The link's title says which match it is. */

export const alt = "Explore the story of any tennis match on CourtSaga.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const dataUri = (file: Buffer, type: string) => `data:${type};base64,${file.toString("base64")}`;

const [bricolage, geist500] = await Promise.all(["bricolage-700", "geist-500"].map((name) => readFile(join(process.cwd(), "assets", "fonts", `${name}.ttf`))));
const slams = await Promise.all(
  ["australian-open", "roland-garros", "wimbledon", "us-open"].map(async (name) => dataUri(await readFile(join(process.cwd(), "public", "slams", `${name}.png`)), "image/png")),
);

const surround = "#3a7556";
const court = "#2b5d9b";
const line = "rgba(255,255,255,0.8)";
const ballYellow = "#d4e157";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: surround, color: "#fff", fontFamily: "Geist" }}>
        {/* The court from above, its lines faint behind everything */}
        <div style={{ position: "absolute", left: 40, top: 40, right: 40, bottom: 40, display: "flex", background: court, border: `4px solid ${line}` }} />
        <div style={{ position: "absolute", left: 40, right: 40, top: 92, height: 4, background: line }} />
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 92, height: 4, background: line }} />

        <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {/* The name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width={44} height={44} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10.5" fill={ballYellow} />
              <path d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "Bricolage", fontSize: 40, letterSpacing: -0.5 }}>CourtSaga</span>
          </div>

          {/* The four Slams, as on Explore */}
          <div style={{ display: "flex", gap: 28, marginTop: 44 }}>
            {slams.map((src, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 150,
                  height: 150,
                  padding: 18,
                  background: "#fff",
                  borderRadius: 30,
                  transform: `rotate(${i % 2 ? 4 : -4}deg)`,
                  boxShadow: "0 16px 32px rgba(0,0,0,0.35)",
                }}
              >
                <img src={src} alt="" width={114} height={114} style={{ width: 114, height: 114, objectFit: "contain" }} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 52, fontFamily: "Bricolage", fontSize: 60, letterSpacing: -2 }}>The story of any match</div>
          <div style={{ marginTop: 10, fontSize: 28, color: "rgba(255,255,255,0.88)" }}>Explore tennis on CourtSaga</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bricolage, weight: 700, style: "normal" },
        { name: "Geist", data: geist500, weight: 500, style: "normal" },
      ],
    },
  );
}
