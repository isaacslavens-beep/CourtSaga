import { matchStory } from "@/lib/story";

// The story around a match, for the landing page's demo to follow links with: GET /api/story?id=…
// The match data is public, so this is too.
export async function GET(request: Request) {
  const id = (new URL(request.url).searchParams.get("id") ?? "").slice(0, 120);
  const story = id ? await matchStory(id) : null;
  if (!story) return Response.json({ error: "No such match." }, { status: 404 });
  return Response.json(story, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
