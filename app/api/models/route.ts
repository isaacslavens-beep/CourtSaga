import { advancedModels } from "@/lib/models";

// The models Statistics plays with (app/diary/models.ts), for one tour: GET /api/models?tour=wta. Fetched
// when a model's chapter is opened, so the record lists open without them.
export async function GET(request: Request) {
  const tour = new URL(request.url).searchParams.get("tour") === "wta" ? "wta" : "atp";
  const models = await advancedModels(tour).catch(() => null);
  if (!models) return Response.json({ error: "The models aren't available right now." }, { status: 503 });
  return Response.json(models, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
