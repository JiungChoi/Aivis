import { useState } from 'react';
import { type ScheduleCategory, SCHEDULE_CATEGORIES } from '../../services/scheduleService';
import { CATEGORY_BG } from './constants';

interface AddModalProps {
  startTime: string; endTime: string;
  onConfirm: (data: { title: string; startTime: string; endTime: string; category: ScheduleCategory; description?: string }) => void;
  onClose: () => void;
}

export function AddEventModal({ startTime, endTime, onConfirm, onClose }: AddModalProps) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(startTime);
  const [end, setEnd]     = useState(endTime);
  const [cat, setCat]     = useState<ScheduleCategory>('Work');
  const [desc, setDesc]   = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: 320, borderRadius: 16, overflow: 'hidden',
          background: 'rgba(28,28,30,0.92)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: 'bubble-pop-in 0.18s ease forwards',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: 'rgba(235,235,245,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>새 일정</div>
          <input
            autoFocus
            type="text"
            placeholder="일정 제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && title.trim() && onConfirm({ title: title.trim(), startTime: start, endTime: end, category: cat, description: desc.trim() || undefined })}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: '#f1f5f9', fontSize: 15, fontWeight: 500, caretColor: '#64b5ff',
            }}
          />
        </div>

        {/* Times */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'rgba(235,235,245,0.3)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>시작</div>
            <input type="time" value={start} onChange={e => setStart(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#64b5ff', fontSize: 13, fontWeight: 600, colorScheme: 'dark' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'rgba(235,235,245,0.3)', marginBottom: 3, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>종료</div>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#64b5ff', fontSize: 13, fontWeight: 600, colorScheme: 'dark' }} />
          </div>
        </div>

        {/* Category */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {SCHEDULE_CATEGORIES.map(({ value, label }) => {
              const c = CATEGORY_BG[value];
              return (
                <button key={value} onClick={() => setCat(value)} style={{
                  padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
                  background: cat === value ? c.bg : 'transparent',
                  border: `1px solid ${cat === value ? c.border : 'rgba(255,255,255,0.07)'}`,
                  color: cat === value ? c.text : 'rgba(235,235,245,0.3)',
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <input type="text" placeholder="메모 (선택)"
            value={desc} onChange={e => setDesc(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#6b7280', fontSize: 11, caretColor: '#64b5ff' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px 14px' }}>
          <button onClick={onClose} style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#6b7280',
          }}>취소</button>
          <button
            onClick={() => title.trim() && onConfirm({ title: title.trim(), startTime: start, endTime: end, category: cat, description: desc.trim() || undefined })}
            disabled={!title.trim()}
            style={{
              flex: 1, padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'default',
              border: 'none', background: title.trim() ? '#0a84ff' : 'rgba(37,99,235,0.18)',
              color: title.trim() ? '#fff' : 'rgba(235,235,245,0.25)', transition: 'all 0.15s',
            }}
          >추가</button>
        </div>
      </div>
    </div>
  );
}
