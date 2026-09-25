import { getItsFacilityCatalog } from "../../../lib/its-facilities";

export async function GET() {
  const catalog = await getItsFacilityCatalog();
  return Response.json({
    facilities: catalog.facilities.map((facility) => ({
      value: facility.id,
      label: facility.label,
      category: facility.category,
      applicationUrl: facility.applicationUrl ?? null,
    })),
    source: catalog.source,
    syncedAt: catalog.syncedAt,
  });
}
