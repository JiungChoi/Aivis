import { useToastStore, type ToastKind } from '../../stores/toastStore';

// Status is conveyed only by the left dot color (no colored fill / glow).
const DOT_COLOR: Record<ToastKind, string> = {
  success: 'var(--ok)',
  error: 'var(--danger)',
  info: 'var(--accent)',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 99999,
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: 'auto', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            minWidth: 220, maxWidth: 360,
            padding: '10px 14px',
            borderRadius: 'var(--r-md)',
            background: 'var(--bg-3)',
            border: '1px solid var(--border-2)',
            boxShadow: 'var(--shadow-overlay)',
            animation: 'toast-in var(--dur-3) var(--ease) forwards',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: 'var(--r-full)', flexShrink: 0,
            background: DOT_COLOR[t.kind],
          }} />
          <span style={{ color: 'var(--text-1)', fontSize: 13, lineHeight: 1.4, fontWeight: 500 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
