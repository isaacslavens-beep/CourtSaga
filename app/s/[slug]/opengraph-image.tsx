import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { coverLines, loadDiary, sharedSagaOwner, shelfOf } from "@/lib/diary";
import SiteCard from "../../opengraph-image";

/* The card a shared saga's link shows, so it looks nothing like a link to the site: the saga's warm
   reading room, whose saga it is, what's in it, and its first books fanned out beside. A link that's
   been turned off shows the site's own card. */

export const alt = "A tennis saga, shared from CourtSaga";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const [bricolage, geist500, geist700] = await Promise.all(
  ["bricolage-700", "geist-500", "geist-700"].map((name) => readFile(join(process.cwd(), "assets", "fonts", `${name}.ttf`))),
);

const room = "#f1ede4";
const ink = "#1d2433";
const muted = "#5d5a52";
const ballYellow = "#d4e157";
// The covers' colours, in shelf order
const covers = ["#1b3d6e", "#6b2238", "#7a5a12", "#1d4a3c", "#8a3f22"];

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const owner = await sharedSagaOwner((await params).slug);
  if (!owner) return SiteCard();
  const diary = await loadDiary(owner.id, { records: true });
  const books = shelfOf(diary).slice(0, 3);
  const lines = coverLines(diary);
  const title = `${owner.name}'s saga`;
  const titleSize = title.length > 18 ? 64 : title.length > 13 ? 76 : 92;

  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: room, color: ink, fontFamily: "Geist" }}>
        {/* The words, on the left */}
        <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 72, top: 64, width: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width={36} height={36} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10.5" fill={ballYellow} />
              <path d="M4.6 4.6c3.2 3.4 3.2 11.4 0 14.8M19.4 4.6c-3.2 3.4-3.2 11.4 0 14.8" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "Bricolage", fontSize: 30 }}>CourtSaga</span>
          </div>
          <span style={{ marginTop: 72, fontSize: 22, fontWeight: 700, letterSpacing: 5, color: muted }}>A TENNIS SAGA</span>
          <span style={{ marginTop: 14, fontFamily: "Bricolage", fontSize: titleSize, lineHeight: 1.02, letterSpacing: -2 }}>{title}</span>
          <span style={{ marginTop: 18, fontSize: 30, color: muted }}>Their matches, turned into a story.</span>
          {lines.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 34 }}>
              {lines.map((line) => (
                <span key={line} style={{ display: "flex", padding: "7px 16px", background: "#fff", border: "2px solid #ddd5c4", borderRadius: 999, fontSize: 20, fontWeight: 700 }}>
                  {line}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* The books, fanned out on the right */}
        {books.map((book, i) => {
          const tilt = [-7, 2, 9][i];
          const x = 636 + i * 184;
          const y = [150, 118, 158][i];
          return (
            <div key={book.id} style={{ display: "flex", position: "absolute", left: x, top: y, width: 176, height: 290, transform: `rotate(${tilt}deg)` }}>
              {/* A ribbon from the book in the middle, hanging out from under its cover */}
              {i === 1 && <div style={{ display: "flex", position: "absolute", left: 116, top: 240, width: 14, height: 86, background: ballYellow }} />}
              {/* The edges of its pages, showing beyond the cover */}
              <div style={{ display: "flex", position: "absolute", left: 8, top: 7, width: 176, height: 284, background: "#fbf6ea", border: "2px solid #e3d9c3", borderRadius: "4px 14px 14px 4px" }} />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: 176,
                  height: 290,
                  padding: "22px 16px 22px 28px",
                  background: covers[i % covers.length],
                  borderRadius: "4px 14px 14px 4px",
                  color: "#fff",
                  boxShadow: "0 24px 40px rgba(30,25,15,0.35)",
                }}
              >
                {/* The hinge */}
                <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: "rgba(0,0,0,0.25)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.75)" }}>{book.kind === "rivalry" ? "A RIVALRY" : "A COLLECTION"}</span>
                <span style={{ marginTop: "auto", fontFamily: "Bricolage", fontSize: book.title.length > 10 ? 26 : 31, lineHeight: 1.05 }}>{book.title}</span>
                <span style={{ marginTop: 10, fontSize: 19, color: "rgba(255,255,255,0.8)" }}>
                  {book.count} {book.blurb}
                </span>
              </div>
            </div>
          );
        })}
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
