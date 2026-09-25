"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Hotel,
  Loader2,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  ShieldCheck,
  LogOut,
  UserRound,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";

const OFFICIAL_CALENDAR_URL =
  "https://as.its-kenpo.or.jp/apply/empty_calendar?s=PUV6TjMwRFpwWlNaMUpIZDlrSGR3MVda";
const AUTO_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const RESULT_REFRESH_INTERVAL_MS = 60 * 1000;

type Facility = {
  value: string;
  label: string;
  category: string;
  applicationUrl?: string | null;
};

const defaultFacilities: Facility[] = [
  { value: "758", label: "トスラブ箱根ビオーレ", category: "直営保養施設" },
  { value: "759", label: "トスラブ箱根和奏林", category: "直営保養施設" },
  { value: "761", label: "トスラブ館山ルアーナ", category: "直営保養施設" },
];

const legacyFacilityIds: Record<string, string> = {
  viole: "758",
  wasorin: "759",
  luana: "761",
};

type Status = "waiting" | "available" | "limited" | "full" | "error";

type Watch = {
  id: number;
  facility: string;
  facilityLabel: string | null;
  checkIn: string;
  nights: number;
  guests: number;
  email: string;
  status: Status;
  active: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
};

const statusMeta: Record<Status, { label: string; dot: string; badge: string }> = {
  waiting: {
    label: "未確認",
    dot: "bg-sky-400",
    badge: "border-sky-200 bg-sky-50 text-sky-800",
  },
  available: {
    label: "空きあり",
    dot: "bg-emerald-500",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  limited: {
    label: "残りわずか",
    dot: "bg-orange-500",
    badge: "border-orange-200 bg-orange-50 text-orange-800",
  },
  full: {
    label: "空きなし",
    dot: "bg-slate-400",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
  },
  error: {
    label: "確認エラー",
    dot: "bg-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-800",
  },
};

function formatDate(value: string) {
  if (!value) return "日付未設定";
  const date = new Date(`${value}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function facilityMeta(
  value: string,
  facilities: Facility[],
  savedLabel?: string | null
) {
  const normalized = legacyFacilityIds[value] ?? value;
  const current = facilities.find((facility) => facility.value === normalized);
  if (current) return { ...current, removed: false };

  return {
    value: normalized,
    label: savedLabel ?? "公式一覧から削除された施設",
    category: "公式一覧から削除済み・削除できます",
    applicationUrl: null,
    removed: true,
  };
}

function officialFacilityUrl(facility: Facility) {
  if (!facility.applicationUrl) return OFFICIAL_CALENDAR_URL;

  try {
    const url = new URL(facility.applicationUrl);
    if (
      url.origin !== "https://as.its-kenpo.or.jp" ||
      url.pathname !== "/apply/empty_new"
    ) {
      return OFFICIAL_CALENDAR_URL;
    }
    return url.toString();
  } catch {
    return OFFICIAL_CALENDAR_URL;
  }
}

export function Dashboard({
  currentUser,
  today,
}: {
  currentUser: { email: string; displayName: string };
  today: string;
}) {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>(defaultFacilities);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Watch | null>(null);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [autoChecking, setAutoChecking] = useState(false);
  const [nextAutoCheckAt, setNextAutoCheckAt] = useState<Date | null>(null);
  const [facility, setFacility] = useState("758");
  const [checkIn, setCheckIn] = useState(today);
  const [nights, setNights] = useState("1");
  const [guests, setGuests] = useState("2");
  const [email, setEmail] = useState(currentUser.email);

  const loadWatches = useCallback(async (silent = false) => {
    try {
      const response = await fetch("/api/watches", { cache: "no-store" });
      const data = (await response.json()) as { watches?: Watch[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "読み込みに失敗しました");
      setWatches(data.watches ?? []);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "読み込みに失敗しました");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadFacilities = useCallback(async () => {
    try {
      const response = await fetch("/api/facilities", { cache: "no-store" });
      const data = (await response.json()) as {
        facilities?: Facility[];
        error?: string;
      };
      if (!response.ok || !data.facilities?.length) {
        throw new Error(data.error ?? "施設一覧の読み込みに失敗しました");
      }
      setFacilities(data.facilities);
      setFacility((current) =>
        data.facilities!.some((item) => item.value === current)
          ? current
          : data.facilities![0].value
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "施設一覧の読み込みに失敗しました"
      );
    }
  }, []);

  useEffect(() => {
    void loadWatches();
    void loadFacilities();
  }, [loadFacilities, loadWatches]);

  // 定期実行が保存した結果を、開いている画面にも反映する。ここではITSへ再照会しない。
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void loadWatches(true);
    };
    const intervalId = window.setInterval(refreshIfVisible, RESULT_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [loadWatches]);

  const activeCount = useMemo(
    () => watches.filter((watch) => watch.active).length,
    [watches]
  );

  const autoCheckActiveWatches = useCallback(async () => {
    setAutoChecking(true);
    try {
      const response = await fetch("/api/watches/check-active", {
        method: "POST",
      });
      const data = (await response.json()) as {
        watches?: Watch[];
        checkedCount?: number;
        errorCount?: number;
        error?: string;
      };
      if (!response.ok || !data.watches) {
        throw new Error(data.error ?? "自動確認に失敗しました");
      }

      const updates = new Map(data.watches.map((watch) => [watch.id, watch]));
      setWatches((current) =>
        current.map((watch) => updates.get(watch.id) ?? watch)
      );

      const availableCount = data.watches.filter(
        (watch) => watch.status === "available" || watch.status === "limited"
      ).length;
      if ((data.checkedCount ?? 0) > 0 && availableCount > 0) {
        toast.success(`空きのある条件が${availableCount}件見つかりました`);
      } else if ((data.errorCount ?? 0) > 0) {
        toast.error(`${data.errorCount}件の自動確認に失敗しました`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "自動確認に失敗しました");
    } finally {
      setAutoChecking(false);
      setNextAutoCheckAt(new Date(Date.now() + AUTO_CHECK_INTERVAL_MS));
    }
  }, []);

  useEffect(() => {
    if (loading || activeCount === 0) {
      setNextAutoCheckAt(null);
      return;
    }

    setNextAutoCheckAt(new Date(Date.now() + AUTO_CHECK_INTERVAL_MS));
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void autoCheckActiveWatches();
      }
    }, AUTO_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [activeCount, autoCheckActiveWatches, loading]);

  async function addWatch() {
    if (!checkIn || !email.trim()) {
      toast.error("宿泊日と通知先メールを入力してください");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/watches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          facility,
          checkIn,
          nights: Number(nights),
          guests: Number(guests),
          email: email.trim(),
        }),
      });
      const data = (await response.json()) as { watch?: Watch; error?: string };
      if (!response.ok || !data.watch) {
        throw new Error(data.error ?? "登録に失敗しました");
      }
      setWatches((current) => [data.watch!, ...current]);
      setDialogOpen(false);
      toast.success("監視条件を登録しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWatch(watch: Watch) {
    const next = !watch.active;
    setWatches((current) =>
      current.map((item) => (item.id === watch.id ? { ...item, active: next } : item))
    );
    try {
      const response = await fetch(`/api/watches/${watch.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!response.ok) throw new Error("更新に失敗しました");
      toast.success(next ? "監視を再開しました" : "監視を一時停止しました");
    } catch {
      setWatches((current) =>
        current.map((item) =>
          item.id === watch.id ? { ...item, active: watch.active } : item
        )
      );
      toast.error("更新に失敗しました");
    }
  }

  async function deleteWatch() {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/watches/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("削除に失敗しました");
      setWatches((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("監視条件を削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  async function checkWatch(watch: Watch) {
    setCheckingId(watch.id);
    try {
      const response = await fetch(`/api/watches/${watch.id}/check`, {
        method: "POST",
      });
      const data = (await response.json()) as { watch?: Watch; error?: string };
      if (!response.ok || !data.watch) {
        throw new Error(data.error ?? "空室確認に失敗しました");
      }
      setWatches((current) =>
        current.map((item) => (item.id === watch.id ? data.watch! : item))
      );
      const result = statusMeta[data.watch.status];
      toast.success(`確認しました：${result.label}`);
    } catch (error) {
      setWatches((current) =>
        current.map((item) =>
          item.id === watch.id
            ? { ...item, status: "error", lastCheckedAt: new Date().toISOString() }
            : item
        )
      );
      toast.error(error instanceof Error ? error.message : "空室確認に失敗しました");
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7f7] text-[#17343b]">
      <Toaster richColors position="top-center" />
      <header className="sticky top-0 z-40 border-b border-[#dce7e8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="メニューを開く"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="grid size-9 place-items-center rounded-xl bg-[#0b7d73] text-white shadow-sm">
              <Hotel className="size-5" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-[#17343b]">ITS 空室ウォッチ</p>
              <p className="text-xs text-slate-500">保養施設の空きを見逃さない</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden h-10 rounded-xl px-3 sm:flex">
                  <ShieldCheck className="size-4 text-emerald-700" />
                  <span className="max-w-44 truncate text-sm">{currentUser.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#17343b]">
                    <UserRound className="size-4" /> {currentUser.displayName}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{currentUser.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <a href="/signout-with-chatgpt?return_to=/" target="_top">
                    <LogOut /> ログアウト
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setDialogOpen(true)}
              className="rounded-xl bg-[#0b7d73] px-4 shadow-sm hover:bg-[#096c64]"
            >
              <Plus />
              <span className="hidden sm:inline">監視条件を追加</span>
              <span className="sm:hidden">追加</span>
            </Button>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="メニューを閉じる"
            className="absolute inset-0 bg-slate-950/30"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative h-full w-[280px] bg-[#123b43] p-5 text-white shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-semibold">メニュー</span>
              <button onClick={() => setMobileNavOpen(false)} className="rounded-lg p-2 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      <div className="mx-auto grid max-w-[1480px] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-64px)] border-r border-[#dce7e8] bg-[#123b43] px-4 py-7 text-white lg:block">
          <NavContent />
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-semibold text-[#0b7d73]">DASHBOARD</p>
                <h1 className="text-3xl font-bold tracking-tight text-[#17343b] sm:text-4xl">空室監視</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  泊まりたい施設と日付を登録。空きが出たら通知するための条件をまとめて管理します。
                </p>
              </div>
              <Button
                variant="outline"
                className="self-start rounded-xl border-[#cfdedf] bg-white sm:self-auto"
                onClick={() => {
                  setLoading(true);
                  void loadWatches();
                }}
                disabled={loading}
              >
                <RefreshCw className={loading ? "animate-spin" : ""} />
                再読み込み
              </Button>
            </div>

            <section className="mb-7 grid gap-4 sm:grid-cols-3">
              <SummaryCard icon={BellRing} label="監視中" value={`${activeCount}件`} tone="teal" />
              <SummaryCard icon={CalendarDays} label="登録済み" value={`${watches.length}件`} tone="blue" />
              <SummaryCard icon={CheckCircle2} label="空きあり" value={`${watches.filter((w) => w.status === "available" || w.status === "limited").length}件`} tone="green" />
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#dce7e8] bg-white shadow-[0_12px_35px_rgba(23,52,59,0.05)]">
              <div className="flex flex-col gap-3 border-b border-[#e3ebec] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-lg font-bold">監視リスト</h2>
                  <p className="mt-1 text-sm text-slate-500">条件はいつでも停止・削除できます</p>
                </div>
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#b9ddd9] bg-[#edf8f7] px-3 py-1.5 text-xs font-medium text-[#17665f]">
                  {autoChecking ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Clock3 className="size-3.5" />
                  )}
                  {activeCount === 0
                    ? "監視条件を登録すると自動確認を開始"
                    : nextAutoCheckAt
                      ? `画面表示中は15分ごとに確認・次回 ${new Intl.DateTimeFormat("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(nextAutoCheckAt)}`
                      : "画面表示中は15分ごとに確認"}
                </div>
              </div>

              {loading ? (
                <LoadingState />
              ) : watches.length === 0 ? (
                <EmptyState onAdd={() => setDialogOpen(true)} />
              ) : (
                <div className="divide-y divide-[#e6eeee]">
                  {watches.map((watch) => (
                    <WatchRow
                      key={watch.id}
                      watch={watch}
                      facilities={facilities}
                      onToggle={() => void toggleWatch(watch)}
                      onCheck={() => void checkWatch(watch)}
                      checking={checkingId === watch.id}
                      onDelete={() => setDeleteTarget(watch)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[#dce7e8] bg-[#eaf6f4] p-5 sm:p-6">
                <div className="flex gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0b7d73] text-white">
                    <CircleAlert className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#174b50]">自動監視について</h2>
                    <p className="mt-2 text-sm leading-6 text-[#42666a]">
                      画面を閉じていても15分ごとに空室を確認し、新たな空きが見つかったらメールでお知らせします。施設一覧はITS公式と同期し、空きがある施設の申込画面へ進めます。日付・泊数・人数は公式画面で選択してください。
                    </p>
                  </div>
                </div>
              </div>
              <a
                href={OFFICIAL_CALENDAR_URL}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-[#dce7e8] bg-white p-5 transition hover:border-[#7cbdb7] hover:shadow-md sm:p-6"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Official</p>
                  <p className="mt-2 font-bold">ITS公式の空き状況を見る</p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-[#f1f7f7] text-[#0b7d73] transition group-hover:translate-x-0.5">
                  <ExternalLink className="size-4" />
                </span>
              </a>
            </section>
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-[#d7e4e5] sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#17343b]">監視条件を追加</DialogTitle>
            <DialogDescription>
              空きを待ちたい施設と宿泊条件を登録します。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label htmlFor="facility">施設</Label>
              <Select value={facility} onValueChange={setFacility}>
                <SelectTrigger id="facility" className="h-11 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                ITS公式の施設一覧と30分ごとに同期します（現在{facilities.length}施設）
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="check-in">宿泊日</Label>
                <Input
                  id="check-in"
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nights">宿泊数</Label>
                <Select value={nights} onValueChange={setNights}>
                  <SelectTrigger id="nights" className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1泊</SelectItem>
                    <SelectItem value="2">2泊</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="guests">利用人数</Label>
                <Select value={guests} onValueChange={setGuests}>
                  <SelectTrigger id="guests" className="h-11 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}名
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">通知先メール</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              空きが見つかったときだけメールで通知します。満室に戻ったあと再び空きが出た場合は、もう一度通知します。
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
              キャンセル
            </Button>
            <Button
              onClick={() => void addWatch()}
              disabled={saving}
              className="rounded-xl bg-[#0b7d73] hover:bg-[#096c64]"
            >
              {saving && <Loader2 className="animate-spin" />}
              登録する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>この監視条件を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${facilityMeta(deleteTarget.facility, facilities, deleteTarget.facilityLabel).label}・${formatDate(deleteTarget.checkIn)}`
                : ""}
              の登録が削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deleteWatch()} className="rounded-xl bg-rose-600 hover:bg-rose-700">
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NavContent() {
  return (
    <nav aria-label="メインメニュー" className="space-y-7">
      <div>
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-100/60">Menu</p>
        <a href="#" className="flex items-center gap-3 rounded-xl bg-white/12 px-3 py-3 text-sm font-semibold">
          <Bell className="size-4" /> 空室監視
        </a>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="size-4 text-teal-200" /> 自動監視 稼働中
        </div>
        <p className="text-xs leading-5 text-teal-50/70">15分ごとに空室を確認。画面を閉じていても、新たな空きはメールでお知らせします。</p>
      </div>
    </nav>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BellRing;
  label: string;
  value: string;
  tone: "teal" | "blue" | "green";
}) {
  const tones = {
    teal: "bg-[#e4f4f2] text-[#0b7d73]",
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#dce7e8] bg-white p-5 shadow-[0_8px_24px_rgba(23,52,59,0.04)]">
      <div className={`grid size-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-[#17343b]">{value}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <Loader2 className="mx-auto size-7 animate-spin text-[#0b7d73]" />
        <p className="mt-3 text-sm text-slate-500">監視条件を読み込んでいます</p>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="grid min-h-[330px] place-items-center px-5 py-12 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#e8f5f3] text-[#0b7d73]">
          <BellRing className="size-7" />
        </div>
        <h3 className="mt-5 text-lg font-bold">まだ監視条件がありません</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          まずは泊まりたい施設と宿泊日を1件登録してみましょう。
        </p>
        <Button onClick={onAdd} className="mt-5 rounded-xl bg-[#0b7d73] hover:bg-[#096c64]">
          <Plus /> 最初の条件を追加
        </Button>
      </div>
    </div>
  );
}

function WatchRow({
  watch,
  facilities,
  onToggle,
  onCheck,
  checking,
  onDelete,
}: {
  watch: Watch;
  facilities: Facility[];
  onToggle: () => void;
  onCheck: () => void;
  checking: boolean;
  onDelete: () => void;
}) {
  const facility = facilityMeta(
    watch.facility,
    facilities,
    watch.facilityLabel
  );
  const status = statusMeta[watch.status] ?? statusMeta.waiting;
  const canApply =
    (watch.status === "available" || watch.status === "limited") &&
    !facility.removed;
  return (
    <article className={`px-5 py-5 transition sm:px-6 ${watch.active ? "" : "bg-slate-50/70 opacity-70"}`}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#edf6f5] text-[#0b7d73]">
            <Hotel className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-bold text-[#17343b]">{facility.label}</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.badge}`}>
                <span className={`size-1.5 rounded-full ${status.dot}`} /> {status.label}
              </span>
            </div>
            <p className={`mt-1 text-sm ${facility.removed ? "font-medium text-rose-600" : "text-slate-500"}`}>
              {facility.category}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
              <span className="flex items-center gap-2"><CalendarDays className="size-4 text-slate-400" />{formatDate(watch.checkIn)}</span>
              <span>{watch.nights}泊</span>
              <span>{watch.guests}名</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {watch.lastCheckedAt
                ? `最終確認：${new Intl.DateTimeFormat("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(watch.lastCheckedAt))}`
                : "まだ空室確認していません"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 xl:border-0 xl:pt-0">
          <div className="mr-auto flex items-center gap-2 xl:mr-2">
            <Switch
              checked={watch.active && !facility.removed}
              onCheckedChange={onToggle}
              disabled={facility.removed}
              aria-label="監視のオン・オフ"
            />
            <span className="text-sm text-slate-600">
              {facility.removed ? "公式対象外" : watch.active ? "監視中" : "停止中"}
            </span>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-[#75b8b2] text-[#0b6b64] hover:bg-[#edf8f7]"
            onClick={onCheck}
            disabled={checking || !watch.active || facility.removed}
          >
            {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {checking ? "確認中" : "今すぐ確認"}
          </Button>
          {canApply ? (
              <Button asChild className="min-w-36 rounded-xl bg-[#0b7d73] hover:bg-[#096c64]">
                <a
                  href={officialFacilityUrl(facility)}
                  target="_blank"
                  rel="noreferrer"
                  title={`${facility.label}のITS公式申込画面を開く`}
                >
                  <ExternalLink /> ITSで申し込む
                </a>
              </Button>
          ) : (
            <Button disabled className="min-w-36 rounded-xl">
              <ExternalLink /> ITSで申し込む
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl" aria-label="その他の操作">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="text-rose-600 focus:text-rose-700">
                <Trash2 /> 削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
