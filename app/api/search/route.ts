import { getSession } from "@/lib/auth";
import { searchMatches } from "@/lib/diary";

// Finding a match to log: GET /api/search?q=wimbledon+2008+final&page=2. For signed-in fans only.
export async function GET(request: Request) {
  if (!(await getSession())) return Response.json({ error: "Log in to search." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").slice(0, 200);
  const page = Math.min(500, Number(params.get("page")) || 1);
  return Response.json(await searchMatches(query, page));
}
