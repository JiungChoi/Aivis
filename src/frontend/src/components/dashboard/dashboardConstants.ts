// Shared constants for the dashboard timeline & news column.

/** Pixel height of one 30-minute timeline slot. */
export const SLOT_H = 28;

/** Per-category colors for schedule blocks on the timeline. */
export const CATEGORY_BG: Record<string, { bg: string; border: string; text: string }> = {
  Meeting:    { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)', text: '#c4b5fd' },
  Work:       { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  text: 'rgba(100,181,255,0.85)' },
  CodeReview: { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  text: '#6ee7b7' },
  Rest:       { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
  Personal:   { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',   text: '#fcd34d' },
  Other:      { bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.25)', text: '#9ca3af' },
};

// ── 뉴스 탭 ──────────────────────────────────────────────────
export type NewsTab = '전체' | '경영·경제' | 'AI·에이전트' | '기술' | '글로벌';
export const NEWS_TABS: NewsTab[] = ['전체', '경영·경제', 'AI·에이전트', '기술', '글로벌'];

// ── 태그 색상 (뉴스) ─────────────────────────────────────────
export const TAG_COLORS: Record<string, string> = {
  미팅:    'bg-violet-500/20 text-violet-300',
  작업:    'bg-blue-500/20 text-blue-300',
  코드리뷰: 'bg-emerald-500/20 text-emerald-300',
  휴식:    'bg-gray-500/20 text-gray-500',
  개인:    'bg-amber-500/20 text-amber-300',
  기타:    'bg-gray-500/20 text-gray-400',
  AI:      'bg-blue-500/20 text-blue-300',
  경제:    'bg-amber-500/20 text-amber-300',
  경영:    'bg-orange-500/20 text-orange-300',
  에이전트: 'bg-violet-500/20 text-violet-300',
  기술:    'bg-emerald-500/20 text-emerald-300',
  글로벌:  'bg-rose-500/20 text-rose-300',
};
