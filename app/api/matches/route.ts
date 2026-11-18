import { searchMatches } from "@/lib/match-index";
import { readSearch } from "@/app/diary/matches";

// Matches: GET /api/matches?tour=atp&s=aces.b.d&r=rank.l__10&t=tier_slam&o=fewer-points&pg=2 (see readSearch
// in app/diary/matches.ts for every parameter). The match data is public and only changes with a deploy,
// so answers are cached.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tour = params.get("tour") === "wta" ? "wta" : "atp";
  const result = await searchMatches(tour, readSearch(params));
  if (!result) return Response.json({ error: "The matches aren't available right now." }, { status: 503 });
  return Response.json(result, { headers: { "Cache-Control": "public, max-age=300, s-maxage=86400" } });
}
