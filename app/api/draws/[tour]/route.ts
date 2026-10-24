import { interactModels } from "@/lib/models";

// Every Slam and 1000 draw for one tour, with each entrant's rating going in, for Interact's draw replayer
// to fetch when it opens: GET /api/draws/atp. Built ahead of time with the models. The match data is
// public, so this is too.

export function generateStaticParams() {
  return [{ tour: "atp" }, { tour: "wta" }];
}

export async function GET(_request: Request, { params }: RouteContext<"/api/draws/[tour]">) {
  const { tour } = await params;
  if (tour !== "atp" && tour !== "wta") return Response.json({ error: "No such tour." }, { status: 404 });
  const models = await interactModels(tour).catch(() => null);
  if (!models) return Response.json({ error: "The draws aren't available right now." }, { status: 503 });
  return Response.json(models.draws, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
