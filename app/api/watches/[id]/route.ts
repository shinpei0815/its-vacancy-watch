import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { watches } from "../../../../db/schema";
import { getRequestUser, unauthorizedResponse } from "../../../../lib/request-user";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = getRequestUser(request);
  if (!user) return unauthorizedResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ error: "無効なIDです" }, { status: 400 });

  const payload = (await request.json()) as { active?: boolean };
  if (typeof payload.active !== "boolean") {
    return Response.json({ error: "監視状態が不正です" }, { status: 400 });
  }

  const db = getDb();
  const [watch] = await db
    .update(watches)
    .set({ active: payload.active })
    .where(and(eq(watches.id, id), eq(watches.ownerId, user.userId)))
    .returning();

  if (!watch) return Response.json({ error: "監視条件が見つかりません" }, { status: 404 });
  return Response.json({ watch });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = getRequestUser(request);
  if (!user) return unauthorizedResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ error: "無効なIDです" }, { status: 400 });

  const db = getDb();
  const [deleted] = await db
    .delete(watches)
    .where(and(eq(watches.id, id), eq(watches.ownerId, user.userId)))
    .returning({ id: watches.id });

  if (!deleted) return Response.json({ error: "監視条件が見つかりません" }, { status: 404 });
  return Response.json({ ok: true });
}
