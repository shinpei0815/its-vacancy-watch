export type ItsFacility = {
  id: string;
  label: string;
  category: string;
  applicationUrl?: string;
};

export type ItsFacilityCatalog = {
  facilities: ItsFacility[];
  source: "official" | "fallback";
  syncedAt: string;
};

export const ITS_CALENDAR_PAGE_URL =
  "https://as.its-kenpo.or.jp/apply/empty_calendar?s=PWdqTjMwRFpwWlNaMUpIZDlrSGR3MVda";

export const ITS_REQUEST_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/javascript;q=0.9,*/*;q=0.8",
  "accept-language": "ja,en-US;q=0.9,en;q=0.8",
  "user-agent": "ITS-Vacancy-Watch/0.2 (personal low-frequency checker)",
};

const legacyFacilityIds: Record<string, string> = {
  viole: "758",
  wasorin: "759",
  luana: "761",
};

const fallbackApplicationTokens: Record<string, string> = {
  "758": "PWdUTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "759": "PWtUTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "761": "PUVqTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "762": "PUlqTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "763": "PU1qTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "764": "PVFqTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "765": "PVVqTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "766": "PVlqTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "768": "PWdqTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "769": "PWtqTjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "770": "PUF6TjMwRFpwWlNaMUpIZDlrSGR3MVda",
  "819": "PWtUTTQwRFpwWlNaMUpIZDlrSGR3MVda",
  "820": "PUFqTTQwRFpwWlNaMUpIZDlrSGR3MVda",
  "973": "PU16TjUwRFpwWlNaMUpIZDlrSGR3MVda",
  "974": "PVF6TjUwRFpwWlNaMUpIZDlrSGR3MVda",
  "1107": "M0FUTXgwRFpwWlNaMUpIZDlrSGR3MVda",
  "1586": "MmdUTngwRFpwWlNaMUpIZDlrSGR3MVda",
  "1587": "M2dUTngwRFpwWlNaMUpIZDlrSGR3MVda",
  "1775": "MWN6TngwRFpwWlNaMUpIZDlrSGR3MVda",
  "2339": "NU16TXkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2340": "d1F6TXkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2341": "eFF6TXkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2342": "eVF6TXkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2343": "elF6TXkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2592": "eWtUTnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2593": "emtUTnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "900": "PUFETTUwRFpwWlNaMUpIZDlrSGR3MVda",
  "1215": "MUVqTXgwRFpwWlNaMUpIZDlrSGR3MVda",
  "1216": "MkVqTXgwRFpwWlNaMUpIZDlrSGR3MVda",
  "1830": "d01ET3gwRFpwWlNaMUpIZDlrSGR3MVda",
  "2096": "MmtETXkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2412": "eUVETnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2413": "ekVETnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2414": "MEVETnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2416": "MkVETnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2417": "M0VETnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2630": "d01qTnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2631": "eE1qTnkwRFpwWlNaMUpIZDlrSGR3MVda",
  "2632": "eU1qTnkwRFpwWlNaMUpIZDlrSGR3MVda",
};

const fallbackFacilityBase: ItsFacility[] = [
  { id: "758", label: "トスラブ箱根ビオーレ", category: "直営保養施設" },
  { id: "759", label: "トスラブ箱根和奏林", category: "直営保養施設" },
  { id: "761", label: "トスラブ館山ルアーナ", category: "直営保養施設" },
  { id: "762", label: "草津温泉 ホテルヴィレッジ", category: "通年保養施設" },
  { id: "763", label: "ホテルハーヴェスト那須", category: "通年保養施設" },
  { id: "764", label: "ホテルハーヴェスト斑尾", category: "通年保養施設" },
  { id: "765", label: "ブルーベリーヒル勝浦", category: "通年保養施設" },
  { id: "766", label: "ホテルハーヴェスト伊東", category: "通年保養施設" },
  { id: "768", label: "ホテル琵琶レイクオーツカ", category: "通年保養施設" },
  { id: "769", label: "ホテル日航プリンセス京都", category: "通年保養施設" },
  { id: "770", label: "ホテルハーヴェスト南紀田辺", category: "通年保養施設" },
  { id: "819", label: "ホテルハーヴェスト旧軽井沢", category: "通年保養施設" },
  { id: "820", label: "ホテルハーヴェスト京都鷹峯", category: "通年保養施設" },
  { id: "973", label: "日光千姫物語", category: "通年保養施設" },
  { id: "974", label: "ホテルハーヴェスト有馬六彩", category: "通年保養施設" },
  { id: "1107", label: "伊香保温泉 ホテル天坊", category: "通年保養施設" },
  { id: "1586", label: "ラビスタ富士河口湖", category: "通年保養施設" },
  { id: "1587", label: "リソルの森", category: "通年保養施設" },
  { id: "1775", label: "ホテルハーヴェスト浜名湖", category: "通年保養施設" },
  { id: "2339", label: "鳴子温泉 湯元 吉祥", category: "通年保養施設" },
  { id: "2340", label: "ホテルオークラ東京ベイ", category: "通年保養施設" },
  { id: "2341", label: "熱海後楽園ホテル", category: "通年保養施設" },
  { id: "2342", label: "ラビスタ横須賀観音崎テラス", category: "通年保養施設" },
  { id: "2343", label: "ゆふいん山水館", category: "通年保養施設" },
  { id: "2592", label: "ラビスタ熱海テラス", category: "通年保養施設" },
  { id: "2593", label: "ホテルハーヴェスト鬼怒川", category: "通年保養施設" },
  { id: "900", label: "鎌倉パークホテル", category: "夏季保養施設" },
  { id: "1215", label: "蓼科東急ホテル", category: "夏季保養施設" },
  { id: "1216", label: "NASPAニューオータニ", category: "夏季保養施設" },
  { id: "1830", label: "定山渓 ゆらく草庵", category: "夏季保養施設" },
  { id: "2096", label: "NAGU 勝浦", category: "夏季保養施設" },
  { id: "2412", label: "プレジャーリゾート伊豆赤沢温泉 赤沢温泉ホテル", category: "夏季保養施設" },
  { id: "2413", label: "軽井沢マリオットホテル", category: "夏季保養施設" },
  { id: "2414", label: "高山グリーンホテル", category: "夏季保養施設" },
  { id: "2416", label: "アオアヲナルトリゾート", category: "夏季保養施設" },
  { id: "2417", label: "ホテル日航アリビラ", category: "夏季保養施設" },
  { id: "2630", label: "グランドメルキュール伊勢志摩", category: "夏季保養施設" },
  { id: "2631", label: "スパリゾートハワイアンズモノリスタワー", category: "夏季保養施設" },
  { id: "2632", label: "フルーツパーク富士屋ホテル", category: "夏季保養施設" },
];

export const fallbackFacilities: ItsFacility[] = fallbackFacilityBase.map(
  (facility) => ({
    ...facility,
    applicationUrl: fallbackApplicationTokens[facility.id]
      ? `https://as.its-kenpo.or.jp/apply/empty_new?s=${fallbackApplicationTokens[facility.id]}`
      : undefined,
  })
);

const fallbackById = new Map(fallbackFacilities.map((facility) => [facility.id, facility]));
const CACHE_MS = 30 * 60 * 1000;
let cache: { expiresAt: number; catalog: ItsFacilityCatalog } | null = null;

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseItsFacilities(body: string) {
  const facilities: ItsFacility[] = [];
  const seen = new Set<string>();
  const linkPattern =
    /<li\b[^>]*data-href=["']([^"']+)["'][^>]*>[\s\S]*?<a\b[^>]*onclick=["']showTab\(this,\s*['"]as_(\d+)['"]\)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;

  for (const match of body.matchAll(linkPattern)) {
    const applicationUrl = match[1];
    const id = match[2];
    const label = decodeHtml(match[3]);
    if (!id || !label || seen.has(id)) continue;

    let safeApplicationUrl: string | undefined;
    try {
      const parsedUrl = new URL(applicationUrl);
      if (
        parsedUrl.origin === "https://as.its-kenpo.or.jp" &&
        parsedUrl.pathname === "/apply/empty_new" &&
        parsedUrl.searchParams.has("s")
      ) {
        safeApplicationUrl = parsedUrl.toString();
      }
    } catch {
      // 公式申込URLが取得できない場合も、施設自体は監視対象として残す。
    }

    seen.add(id);
    facilities.push({
      id,
      label,
      category: fallbackById.get(id)?.category ?? "保養施設",
      ...(safeApplicationUrl ? { applicationUrl: safeApplicationUrl } : {}),
    });
  }

  return facilities;
}

export function resolveFacilityId(value: string) {
  const normalized = legacyFacilityIds[value] ?? value;
  return /^\d+$/.test(normalized) ? normalized : null;
}

export class ItsFacilityRemovedError extends Error {
  constructor() {
    super("この施設はITS公式の対象一覧から削除されています。監視条件を削除してください");
    this.name = "ItsFacilityRemovedError";
  }
}

export async function getItsFacilityCatalog(): Promise<ItsFacilityCatalog> {
  if (cache && cache.expiresAt > Date.now()) return cache.catalog;

  let catalog: ItsFacilityCatalog;
  try {
    const response = await fetch(ITS_CALENDAR_PAGE_URL, {
      headers: ITS_REQUEST_HEADERS,
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`ITS facility page returned ${response.status}`);

    const facilities = parseItsFacilities(await response.text());
    if (facilities.length < 3) throw new Error("ITS facility list could not be parsed");

    catalog = {
      facilities,
      source: "official",
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("Using fallback ITS facility list", error);
    catalog = {
      facilities: fallbackFacilities,
      source: "fallback",
      syncedAt: new Date().toISOString(),
    };
  }

  cache = { catalog, expiresAt: Date.now() + CACHE_MS };
  return catalog;
}
