import type { TodoPriority } from '../../services/todoService';

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: '낮음',
  normal: '보통',
  high: '높음',
};

export const PRIORITY_COLORS: Record<TodoPriority, { bg: string; text: string; border: string }> = {
  low:    { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-3)', border: 'var(--border-1)' },
  normal: { bg: 'var(--accent-bg)',       text: 'var(--accent)', border: 'var(--accent-border)' },
  high:   { bg: 'var(--danger-bg)',       text: 'var(--danger)', border: 'var(--danger-border)' },
};
