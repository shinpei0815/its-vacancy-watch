import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { watches } from "../../../../db/schema";
import { sendAvailabilityEmail } from "../../../../lib/availability-email";
import { checkItsAvailability } from "../../../../lib/its-availability";
import { ItsFacilityRemovedError } from "../../../../lib/its-facilities";

function isAuthorized(request: Request) {
  const value = request.headers.get("authorization");
  return Boolean(env.CRON_SECRET) && value === `Bearer ${env.CRON_SECRET}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // GitHub Actions の暗号化 Secret から受け取り、保存せずに今回の送信だけで使う。
  const resendApiKey = request.headers.get("x-resend-api-key") ?? undefined;
  const brevoApiKey = request.headers.get("x-brevo-api-key") ?? undefined;

  const db = getDb();
  const activeWatches = await db
    .select()
    .from(watches)
    .where(eq(watches.active, true));

  let availableCount = 0;
  let notificationCount = 0;
  let errorCount = 0;

  for (const watch of activeWatches) {
    const checkedAt = new Date().toISOString();

    try {
      const result = await checkItsAvailability(
        watch.facility,
        watch.checkIn,
        watch.nights
      );
      const hasAvailability =
        result.status === "available" || result.status === "limited";
      let notified = watch.notified;

      if (hasAvailability) {
        availableCount += 1;
        if (!watch.notified) {
          const email = await sendAvailabilityEmail(
            {
              ...watch,
              status: result.status,
            },
            { resendApiKey, brevoApiKey }
          );
          if (email.sent) {
            notified = true;
            notificationCount += 1;
          }
        }
      } else {
        // 満室に戻ったら、次に空きが出た際に再通知できるようにする。
        notified = false;
      }

      await db
        .update(watches)
        .set({ status: result.status, lastCheckedAt: checkedAt, notified })
        .where(and(eq(watches.id, watch.id), eq(watches.ownerId, watch.ownerId)));
    } catch (error) {
      errorCount += 1;
      console.error("Scheduled availability check failed", watch.id, error);
      const removed = error instanceof ItsFacilityRemovedError;
      await db
        .update(watches)
        .set({
          status: "error",
          lastCheckedAt: checkedAt,
          ...(removed ? { active: false } : {}),
        })
        .where(and(eq(watches.id, watch.id), eq(watches.ownerId, watch.ownerId)));
    }
  }

  return Response.json({
    checkedCount: activeWatches.length,
    availableCount,
    notificationCount,
    errorCount,
  });
}
