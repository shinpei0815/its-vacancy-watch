import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { watches } from "../../../db/schema";
import { japanToday } from "../../../lib/japan-date";
import {
  getItsFacilityCatalog,
  resolveFacilityId,
} from "../../../lib/its-facilities";
import { getRequestUser, unauthorizedResponse } from "../../../lib/request-user";

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "予期しないエラーが発生しました";
  return message.includes("no such table") ? "保存先の準備が完了していません" : message;
}

export async function GET(request: Request) {
  const user = getRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const db = getDb();
    // 初期版で作られた本人の条件を、最初のログイン時に安全に引き継ぐ。
    await db
      .update(watches)
      .set({ ownerId: user.userId })
      .where(
        and(eq(watches.ownerId, "local-preview"), eq(watches.email, user.email))
      );

    const rows = await db
      .select()
      .from(watches)
      .where(eq(watches.ownerId, user.userId))
      .orderBy(desc(watches.createdAt), desc(watches.id));
    return Response.json({ watches: rows });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = getRequestUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const payload = (await request.json()) as {
      facility?: string;
      checkIn?: string;
      nights?: number;
      guests?: number;
      email?: string;
    };

    const facility = payload.facility?.trim() ?? "";
    const checkIn = payload.checkIn?.trim() ?? "";
    const email = payload.email?.trim() ?? "";
    const nights = Number(payload.nights);
    const guests = Number(payload.guests);

    const facilityId = resolveFacilityId(facility);
    const catalog = await getItsFacilityCatalog();
    const selectedFacility = catalog.facilities.find(
      (item) => item.id === facilityId
    );

    if (!facilityId || !selectedFacility) {
      return Response.json({ error: "施設を選択してください" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
      return Response.json({ error: "宿泊日を入力してください" }, { status: 400 });
    }
    if (checkIn < japanToday()) {
      return Response.json({ error: "宿泊日は今日以降を選択してください" }, { status: 400 });
    }
    if (![1, 2].includes(nights) || !Number.isInteger(guests) || guests < 1 || guests > 6) {
      return Response.json({ error: "宿泊条件を確認してください" }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "正しいメールアドレスを入力してください" }, { status: 400 });
    }

    const db = getDb();
    const [watch] = await db
      .insert(watches)
      .values({
        ownerId: user.userId,
        facility: facilityId,
        facilityLabel: selectedFacility.label,
        checkIn,
        nights,
        guests,
        email,
      })
      .returning();
    return Response.json({ watch }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
