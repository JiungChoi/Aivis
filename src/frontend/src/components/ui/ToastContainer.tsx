import { useToastStore, type ToastKind } from '../../stores/toastStore';

const KIND_STYLE: Record<ToastKind, { border: string; bg: string; icon: string; iconColor: string }> = {
  success: { border: 'rgba(52,211,153,0.45)', bg: 'rgba(6,40,30,0.92)', icon: 'M5 13l4 4L19 7', iconColor: '#34d399' },
  error:   { border: 'rgba(248,113,113,0.45)', bg: 'rgba(43,12,12,0.92)', icon: 'M6 18L18 6M6 6l12 12', iconColor: '#f87171' },
  info:    { border: 'rgba(10,132,255,0.45)', bg: 'rgba(8,20,40,0.92)', icon: 'M13 16h-1v-4h-1m1-4h.01', iconColor: '#64b5ff' },
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
      {toasts.map((t) => {
        const s = KIND_STYLE[t.kind];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              minWidth: 220, maxWidth: 360,
              padding: '10px 14px',
              borderRadius: 12,
              background: s.bg,
              border: `1px solid ${s.border}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              animation: 'toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <svg style={{ width: 16, height: 16, flexShrink: 0, color: s.iconColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d={s.icon} />
            </svg>
            <span style={{ color: '#e5e7eb', fontSize: 12.5, lineHeight: 1.4, fontWeight: 500 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
