import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { diaryPages, matchById, monthLabel, sampleLog } from "./demos/library";

/* The card a shared link shows: a still of the hero. The Slams along the top, the court seen from above
   with the net on the right, the words in the backcourt and two pages of the sample diary over the
   service boxes, with a ball on its way in. */

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
const [ao, , , , uso] = slams;
const photos = {
  rybakina: await dataUri("public/photos/rybakina-uso-2026.jpg", "image/jpeg"),
  alcaraz: await dataUri("public/photos/alcaraz-ao-2026-final.jpg", "image/jpeg"),
};

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

/** One page of the sample fan's diary: the photo, then the page, the event, their rating and their words on ruled paper. */
function Page({ id, photo, position, logo, x, y, tilt }: { id: string; photo: string; position: string; logo: string; x: number; y: number; tilt: number }) {
  const m = matchById[id];
  const fan = sampleLog[id];
  const page = diaryPages(sampleLog).get(id);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 250,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: 20,
        overflow: "hidden",
        transform: `rotate(${tilt}deg)`,
        boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
        color: "#0f1b2d",
      }}
    >
      <img src={photo} alt="" width={250} height={186} style={{ width: 250, height: 186, objectFit: "cover", objectPosition: position }} />
      <div style={{ display: "flex", flexDirection: "column", padding: "12px 14px 14px" }}>
        <div style={{ display: "flex", fontSize: 15, color: "#4b5a6e" }}>
          <span style={{ fontWeight: 700, color: "#0f1b2d" }}>Page {page}</span>
          <span style={{ marginLeft: 6 }}>· {monthLabel(fan.watchedDate)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 8, gap: 10 }}>
          <div style={{ display: "flex", width: 38, height: 38, padding: 3, borderRadius: 8, background: "#fff", border: "1px solid #dde3eb" }}>
            <img src={logo} alt="" width={32} height={32} style={{ width: 32, height: 32, objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{m.event}</span>
            <span style={{ fontSize: 14, color: "#4b5a6e" }}>{m.round}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            // Plain dots: an SVG inside a tilted card renders clipped
            <div key={n} style={{ width: 16, height: 16, borderRadius: 16, background: n <= fan.rating ? ballYellow : "#dde3eb" }} />
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          padding: "0 14px 6px 30px",
          borderTop: "1px solid #dde3eb",
          fontSize: 15,
          lineHeight: "24px",
          backgroundImage:
            "linear-gradient(to right, transparent 19px, rgba(214,69,65,0.45) 19px, rgba(214,69,65,0.45) 20px, transparent 20px), repeating-linear-gradient(to bottom, transparent 0px, transparent 23px, rgba(43,93,155,0.22) 23px, rgba(43,93,155,0.22) 24px)",
        }}
      >
        {fan.note}
      </div>
    </div>
  );
}

export default async function Image() {
  const courtLine = { position: "absolute", background: line } as const;
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: surround, color: "#fff", fontFamily: "Geist" }}>
        {/* The header row: the name, the Slams bobbing in the middle, and when it's coming */}
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
        <div
          style={{
            position: "absolute",
            right: 40,
            top: 34,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 18px",
            borderRadius: 999,
            fontSize: 21,
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.3)",
          }}
        >
          <div style={{ width: 13, height: 13, borderRadius: 13, background: ballYellow }} />
          Free · coming in 2027
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

        {/* The service boxes: two pages of the diary, leaning in, and a ball landing on the nearer one */}
        <Page id="uso26w" photo={photos.rybakina} position="44% 30%" logo={uso} x={612} y={146} tilt={4} />
        <Page id="ao26" photo={photos.alcaraz} position="22% 50%" logo={ao} x={852} y={176} tilt={-4} />
        <div style={{ position: "absolute", left: 1064, top: 150, display: "flex" }}>
          <Ball size={40} />
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
