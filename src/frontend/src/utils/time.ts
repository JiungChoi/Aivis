// Shared time helpers — single source of truth for HH:MM ↔ minutes and date keys.

/** "HH:MM" → minutes since midnight. */
export function toMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** minutes since midnight → "HH:MM" (wraps at 24h). */
export function minsToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Local-timezone calendar day, "YYYY-MM-DD" (correct for the user's day). */
export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * UTC calendar day, "YYYY-MM-DD".
 * NOTE: differs from todayKey() in non-UTC zones (e.g. early-morning KST returns
 * the previous day). Kept only to preserve existing call-site behavior; prefer
 * todayKey() for new code. See refactoring-plan A2 follow-up.
 */
export function todayISO(d = new Date()): string {
  return d.toISOString().split('T')[0];
}
