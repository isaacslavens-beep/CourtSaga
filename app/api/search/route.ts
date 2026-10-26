import { searchMatches } from "@/lib/diary";

// Finding a match: GET /api/search?q=wimbledon+2008+final&page=2. Open to anyone.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").slice(0, 200);
  const page = Math.min(500, Number(params.get("page")) || 1);
  return Response.json(await searchMatches(query, page));
}
