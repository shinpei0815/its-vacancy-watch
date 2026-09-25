import {
  getItsFacilityCatalog,
  ITS_CALENDAR_PAGE_URL,
  ITS_REQUEST_HEADERS,
  ItsFacilityRemovedError,
  resolveFacilityId,
} from "./its-facilities";

export type AvailabilityStatus = "available" | "limited" | "full";

const statusByIcon: Record<string, AvailabilityStatus> = {
  "○": "available",
  "◯": "available",
  "△": "limited",
  "☓": "full",
  "×": "full",
  "✕": "full",
};

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function normalizeCalendarScript(value: string) {
  return value
    .replaceAll("\\n", "\n")
    .replaceAll("\\r", "")
    .replaceAll('\\"', '"')
    .replaceAll("\\'", "'")
    .replaceAll("\\/", "/")
    .replaceAll("&times;", "×")
    .replaceAll("&#x25CB;", "○")
    .replaceAll("&#9675;", "○")
    .replaceAll("&#9651;", "△");
}

export function parseAvailabilityResponse(body: string, checkIn: string) {
  const normalized = normalizeCalendarScript(body);
  const dateIndex = normalized.indexOf(`data-join-time="${checkIn}"`);

  if (dateIndex < 0) {
    throw new Error("指定日の空室情報が見つかりませんでした");
  }

  const dateCell = normalized.slice(dateIndex, dateIndex + 1400);
  const iconMatch = dateCell.match(/class=["']icon["'][^>]*>\s*([^<\s]+)\s*</);
  const icon = iconMatch?.[1]?.trim() ?? "";
  const status = statusByIcon[icon];

  if (!status) {
    throw new Error("ITSの空室表示を読み取れませんでした");
  }

  return { status, icon };
}

function getCookieHeader(headers: Headers) {
  const compatibleHeaders = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = compatibleHeaders.getSetCookie?.() ?? [];
  const values =
    setCookies.length > 0
      ? setCookies
      : [headers.get("set-cookie")].filter((value): value is string => Boolean(value));

  return values
    .map((value) => value.split(";", 1)[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

export async function checkItsAvailability(
  facility: string,
  checkIn: string,
  nights: number
) {
  const serviceId = resolveFacilityId(facility);
  if (!serviceId) throw new Error("未対応の施設です");

  const catalog = await getItsFacilityCatalog();
  if (
    catalog.source === "official" &&
    !catalog.facilities.some((item) => item.id === serviceId)
  ) {
    throw new ItsFacilityRemovedError();
  }

  const params = new URLSearchParams({
    s_c: "1",
    join_date: monthStart(checkIn),
    apply_service_id: serviceId,
    night_count: String(nights),
  });

  const calendarPage = await fetch(ITS_CALENDAR_PAGE_URL, {
    method: "GET",
    headers: ITS_REQUEST_HEADERS,
    redirect: "follow",
    cache: "no-store",
  });

  if (!calendarPage.ok) {
    throw new Error(`ITS公式ページの取得に失敗しました (${calendarPage.status})`);
  }

  // Rails側のセッションを確立してから、同じセッションで月別データを取得する。
  const cookie = getCookieHeader(calendarPage.headers);
  await calendarPage.text();

  const response = await fetch(
    `https://as.its-kenpo.or.jp/apply/calendar3?${params.toString()}`,
    {
      method: "GET",
      headers: {
        ...ITS_REQUEST_HEADERS,
        accept: "text/javascript, application/javascript, */*;q=0.8",
        "x-requested-with": "XMLHttpRequest",
        referer: ITS_CALENDAR_PAGE_URL,
        ...(cookie ? { cookie } : {}),
      },
      redirect: "follow",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`ITS空室ページの取得に失敗しました (${response.status})`);
  }

  const body = await response.text();
  return parseAvailabilityResponse(body, checkIn);
}
