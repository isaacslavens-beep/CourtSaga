import { answerPlayers } from "@/lib/quiz";

// The players a quiz answer could be, as it's typed: GET /api/quiz/players?tour=atp&q=fed. Open to anyone.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tour = params.get("tour") === "wta" ? "wta" : "atp";
  const typed = (params.get("q") ?? "").slice(0, 60);
  return Response.json(await answerPlayers(tour, typed));
}
