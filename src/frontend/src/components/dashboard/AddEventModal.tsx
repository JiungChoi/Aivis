import { useState, useEffect } from 'react';
import { type ScheduleCategory, SCHEDULE_CATEGORIES } from '../../services/scheduleService';

interface AddEventModalProps {
  startTime: string;
  endTime: string;
  onClose: () => void;
  onConfirm: (title: string, startTime: string, endTime: string, category: ScheduleCategory) => void;
}

export function AddEventModal({ startTime: initialStart, endTime: initialEnd, onClose, onConfirm }: AddEventModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [category, setCategory] = useState<ScheduleCategory>('Work');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    await onConfirm(title.trim(), startTime, endTime, category);
    setSubmitting(false);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 340,
          background: '#1c1c1e',
          borderRadius: 16,
          padding: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'rgba(235,235,245,0.5)', fontSize: 11, marginBottom: 4 }}>새 일정 추가</div>
          <input
            type="text"
            placeholder="일정 이름"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            autoFocus
            style={{
              width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)',
              outline: 'none', color: '#f1f5f9', fontSize: 16, fontWeight: 500,
              padding: '4px 0 8px', caretColor: 'var(--accent)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(235,235,245,0.4)', fontSize: 10, marginBottom: 4 }}>시작</div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, outline: 'none', color: 'var(--accent)', fontSize: 13,
                fontWeight: 500, padding: '6px 10px',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(235,235,245,0.4)', fontSize: 10, marginBottom: 4 }}>종료</div>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                width: '100%', background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, outline: 'none', color: 'var(--accent)', fontSize: 13,
                fontWeight: 500, padding: '6px 10px',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: 'rgba(235,235,245,0.4)', fontSize: 10, marginBottom: 8 }}>카테고리</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SCHEDULE_CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategory(value)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  border: `1px solid ${category === value ? 'var(--accent-border)' : 'rgba(255,255,255,0.08)'}`,
                  background: category === value ? 'var(--accent-bg)' : 'rgba(255,255,255,0.04)',
                  color: category === value ? 'var(--accent)' : 'rgba(235,235,245,0.4)',
                  transition: 'all 0.15s ease',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              border: 'none', background: 'transparent', color: 'rgba(235,235,245,0.4)',
            }}
          >취소</button>
          <button
            onClick={handleConfirm}
            disabled={!title.trim() || submitting}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: title.trim() ? 'pointer' : 'default',
              background: title.trim() ? 'var(--accent)' : 'var(--accent-bg)',
              color: title.trim() ? 'var(--on-accent)' : 'var(--text-3)',
              transition: 'background 0.15s ease',
            }}
          >{submitting ? '추가 중...' : '추가'}</button>
        </div>
      </div>
    </div>
  );
}
