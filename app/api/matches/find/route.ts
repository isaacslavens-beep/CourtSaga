import { suggestMatches } from "@/lib/match-index";

// What a search box in Matches might mean: players, events and countries, GET /api/matches/find?tour=atp&q=fed.
// A name only the other tour has comes back from there, so the page can switch to it.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tour = params.get("tour") === "wta" ? "wta" : "atp";
  const query = (params.get("q") ?? "").slice(0, 60);
  let found = await suggestMatches(tour, query);
  if (!found.some((s) => s.kind === "player")) {
    const other = (await suggestMatches(tour === "atp" ? "wta" : "atp", query)).filter((s) => s.kind === "player").slice(0, 3);
    found = [...found, ...other];
  }
  return Response.json(found, { headers: { "Cache-Control": "public, max-age=300, s-maxage=86400" } });
}
