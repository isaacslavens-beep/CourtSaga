import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The card a shared link shows: what CourtSaga is, beside the hero's photo

export const alt = "CourtSaga: a free, simple diary for the tennis you watch.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const photo = await readFile(join(process.cwd(), "public/photos/rybakina-uso-2026.jpg"));

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a1220", color: "#eef2f7" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, padding: "0 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 700 }}>
            <div style={{ width: 30, height: 30, borderRadius: 30, background: "#d4e157" }} />
            CourtSaga
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 36, fontSize: 70, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            <span>Remember</span>
            <span>every match</span>
            <span>you watch.</span>
          </div>
          <div style={{ marginTop: 30, fontSize: 28, lineHeight: 1.35, color: "#a7b3c4", maxWidth: 560 }}>
            A free, simple diary for the tennis you watch. Coming for the 2027 season.
          </div>
        </div>
        <img
          src={`data:image/jpeg;base64,${photo.toString("base64")}`}
          alt=""
          width={500}
          height={630}
          style={{ width: 500, height: 630, objectFit: "cover", objectPosition: "44% 20%" }}
        />
      </div>
    ),
    size,
  );
}
