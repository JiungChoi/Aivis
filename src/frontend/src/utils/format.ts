// Shared display formatters.

/** Time-of-day greeting in Korean. */
export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return '좋은 아침입니다';
  if (h < 18) return '좋은 오후입니다';
  return '좋은 저녁입니다';
}

/** Long Korean date, e.g. "2026년 6월 8일 월요일". */
export function dateStr(now = new Date()): string {
  return now.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}
