import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { watches } from "../../../../db/schema";
import { checkItsAvailability } from "../../../../lib/its-availability";
import { ItsFacilityRemovedError } from "../../../../lib/its-facilities";
import { getRequestUser, unauthorizedResponse } from "../../../../lib/request-user";

export async function POST(request: Request) {
  const user = getRequestUser(request);
  if (!user) return unauthorizedResponse();

  const owner = user.userId;
  const db = getDb();
  const activeWatches = await db
    .select()
    .from(watches)
    .where(and(eq(watches.ownerId, owner), eq(watches.active, true)))
    .orderBy(desc(watches.createdAt), desc(watches.id));

  const updatedWatches = [];
  let checkedCount = 0;
  let errorCount = 0;
  const recentlyCheckedAfter = Date.now() - 12 * 60 * 1000;

  // ITS公式ページへのアクセスが集中しないよう、監視条件は順番に確認する。
  for (const watch of activeWatches) {
    // 定期実行の直後に画面側も同じ条件を確認する重複アクセスを防ぐ。
    const lastCheckedAt = watch.lastCheckedAt
      ? Date.parse(watch.lastCheckedAt)
      : Number.NaN;
    if (lastCheckedAt >= recentlyCheckedAfter && lastCheckedAt <= Date.now()) {
      updatedWatches.push(watch);
      continue;
    }

    checkedCount += 1;
    const checkedAt = new Date().toISOString();

    try {
      const result = await checkItsAvailability(
        watch.facility,
        watch.checkIn,
        watch.nights
      );
      const [updated] = await db
        .update(watches)
        .set({ status: result.status, lastCheckedAt: checkedAt })
        .where(and(eq(watches.id, watch.id), eq(watches.ownerId, owner)))
        .returning();

      if (updated) updatedWatches.push(updated);
    } catch (error) {
      errorCount += 1;
      const removed = error instanceof ItsFacilityRemovedError;
      const [updated] = await db
        .update(watches)
        .set({
          status: "error",
          lastCheckedAt: checkedAt,
          ...(removed ? { active: false } : {}),
        })
        .where(and(eq(watches.id, watch.id), eq(watches.ownerId, owner)))
        .returning();

      if (updated) updatedWatches.push(updated);
    }
  }

  return Response.json({
    watches: updatedWatches,
    checkedCount,
    errorCount,
  });
}
