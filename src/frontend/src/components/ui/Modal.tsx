import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}

/** Dark-premium modal: overlay + panel (bg-3 + border-2 + r12 + shadow-modal). ESC / overlay close. */
export function Modal({ open, onClose, title, children, width = 480, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'toast-in var(--dur-3) var(--ease) forwards',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: width,
          background: 'var(--bg-3)', border: '1px solid var(--border-2)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-modal)',
          animation: 'overlay-in var(--dur-3) var(--ease) forwards',
        }}
      >
        {title && (
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-1)', fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
            {title}
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
