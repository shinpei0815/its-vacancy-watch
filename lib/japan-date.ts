const JAPAN_OFFSET_MS = 9 * 60 * 60 * 1000;

export function japanToday() {
  return new Date(Date.now() + JAPAN_OFFSET_MS).toISOString().slice(0, 10);
}
