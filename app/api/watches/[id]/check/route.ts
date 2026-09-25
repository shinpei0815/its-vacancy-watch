import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { watches } from "../../../../../db/schema";
import { checkItsAvailability } from "../../../../../lib/its-availability";
import { ItsFacilityRemovedError } from "../../../../../lib/its-facilities";
import { getRequestUser, unauthorizedResponse } from "../../../../../lib/request-user";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = getRequestUser(request);
  if (!user) return unauthorizedResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ error: "無効なIDです" }, { status: 400 });

  const db = getDb();
  const [watch] = await db
    .select()
    .from(watches)
    .where(and(eq(watches.id, id), eq(watches.ownerId, user.userId)))
    .limit(1);

  if (!watch) {
    return Response.json({ error: "監視条件が見つかりません" }, { status: 404 });
  }

  try {
    const result = await checkItsAvailability(
      watch.facility,
      watch.checkIn,
      watch.nights
    );
    const checkedAt = new Date().toISOString();
    const [updated] = await db
      .update(watches)
      .set({ status: result.status, lastCheckedAt: checkedAt })
      .where(and(eq(watches.id, id), eq(watches.ownerId, user.userId)))
      .returning();

    return Response.json({ watch: updated, icon: result.icon });
  } catch (error) {
    const checkedAt = new Date().toISOString();
    const removed = error instanceof ItsFacilityRemovedError;
    await db
      .update(watches)
      .set({
        status: "error",
        lastCheckedAt: checkedAt,
        ...(removed ? { active: false } : {}),
      })
      .where(and(eq(watches.id, id), eq(watches.ownerId, user.userId)));

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "空室情報の確認に失敗しました",
      },
      { status: 502 }
    );
  }
}
