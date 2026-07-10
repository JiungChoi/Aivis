// Category chrome — dark-premium tokens only.
// Categories are distinguished by their label text; chrome maps to state/neutral tokens
// (green->ok, yellow->warn) and stays neutral where no semantic color applies.
export const CATEGORY_BG: Record<string, { bg: string; border: string; text: string }> = {
  Meeting:    { bg: 'var(--accent-bg)', border: 'var(--accent-border)', text: 'var(--accent)' },
  Work:       { bg: 'var(--bg-3)',      border: 'var(--border-2)',      text: 'var(--text-2)' },
  CodeReview: { bg: 'var(--ok-bg)',     border: 'var(--ok-border)',     text: 'var(--ok)' },
  Rest:       { bg: 'var(--bg-3)',      border: 'var(--border-1)',      text: 'var(--text-3)' },
  Personal:   { bg: 'var(--warn-bg)',   border: 'var(--warn-border)',   text: 'var(--warn)' },
  Other:      { bg: 'var(--bg-3)',      border: 'var(--border-1)',      text: 'var(--text-3)' },
};
