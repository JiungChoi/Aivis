import type { ScheduleCategory } from '../services/scheduleService';

export interface CategoryMeta {
  /** Label used in the time-analysis donut chart (distinct from the picker label). */
  chartLabel: string;
  /** Solid color used in the donut chart. */
  chartColor: string;
  /** Colors for a schedule block on the timeline. */
  block: { bg: string; border: string; text: string };
}

/** Single source of truth for schedule-category visuals (timeline + chart). */
export const CATEGORY_META: Record<ScheduleCategory, CategoryMeta> = {
  Meeting: {
    chartLabel: '미팅', chartColor: '#8b5cf6',
    block: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', text: '#c4b5fd' },
  },
  Work: {
    chartLabel: '집중 작업', chartColor: '#3b82f6',
    block: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', text: 'rgba(100,181,255,0.85)' },
  },
  CodeReview: {
    chartLabel: '코드리뷰', chartColor: '#10b981',
    block: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#6ee7b7' },
  },
  Rest: {
    chartLabel: '휴식', chartColor: '#374151',
    block: { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
  },
  Personal: {
    chartLabel: '개인', chartColor: '#f59e0b',
    block: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fcd34d' },
  },
  Other: {
    chartLabel: '기타', chartColor: '#6b7280',
    block: { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
  },
};

/** Timeline block colors by category, with an Other fallback. */
export function categoryBlock(category: string) {
  return (CATEGORY_META[category as ScheduleCategory] ?? CATEGORY_META.Other).block;
}
