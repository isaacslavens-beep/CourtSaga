import { matchStory } from "@/lib/story";

// The story around a match: GET /api/story?id=…
// With &teaser=1, only its first line, for a card to show when pointed at. The match data is public,
// so this is too.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = (params.get("id") ?? "").slice(0, 120);
  const story = id ? await matchStory(id) : null;
  if (!story) return Response.json({ error: "No such match." }, { status: 404 });
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };
  if (params.get("teaser")) {
    const first = story.lede[0];
    const line = first ? first.parts.map((p) => (typeof p === "string" ? p : p.text)).join("") : "";
    return Response.json({ line }, { headers });
  }
  return Response.json(story, { headers });
}
