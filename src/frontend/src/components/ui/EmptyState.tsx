import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Empty state: pad 48 0, title 14/500 text-2 + desc 13 text-3 + one secondary action. No emoji. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 360 }}>{description}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export default EmptyState;
