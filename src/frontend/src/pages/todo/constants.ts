import type { TodoPriority } from '../../services/todoService';

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: '낮음',
  normal: '보통',
  high: '높음',
};

export const PRIORITY_COLORS: Record<TodoPriority, { bg: string; text: string; border: string }> = {
  low:    { bg: '#2c2c2e', text: '#6b7280', border: '#2a3a4a' },
  normal: { bg: '#1c1c1e', text: '#64b5ff', border: '#0062cc' },
  high:   { bg: '#2a0d0d', text: '#f87171', border: '#991b1b' },
};
