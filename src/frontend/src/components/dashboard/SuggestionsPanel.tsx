import { useState } from 'react';
import type { SuggestionItem } from '../../services/suggestionService';

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  높음: { bg: 'rgba(239,68,68,0.12)',  text: '#f87171' },
  보통: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  낮음: { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af' },
};

interface Props {
  suggestions: SuggestionItem[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSelect: (title: string) => void;
  onAddToSchedule: (title: string, index: number) => Promise<void>;
}

export function SuggestionsPanel({ suggestions, loading, error, onRetry, onSelect, onAddToSchedule }: Props) {
  const [addingId, setAddingId] = useState<number | null>(null);

  async function handleAddToSchedule(e: React.MouseEvent, title: string, idx: number) {
    e.stopPropagation();
    if (addingId !== null) return;
    setAddingId(idx);
    try {
      await onAddToSchedule(title, idx);
    } catch { /* no-op */ }
    finally { setAddingId(null); }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{
          color: 'rgba(235,235,245,0.35)',
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: '0.05em',
          textTransform: 'uppercase' as const,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>AI 작업 제안</span>
        <span style={{ fontSize: 9, background: 'rgba(10,132,255,0.15)', color: '#64b5ff', padding: '1px 6px', borderRadius: 99 }}>AI</span>
      </div>

      {error ? (
        <div className="text-center py-4">
          <div className="text-[10px] mb-2" style={{ color: '#f87171' }}>AI 제안을 불러오지 못했습니다.</div>
          <button onClick={onRetry} className="text-[10px] underline" style={{ color: '#64b5ff' }}>재시도</button>
        </div>
      ) : loading || suggestions.length === 0 ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg p-2.5 animate-pulse" style={{ background: '#1c1c1e' }}>
              <div className="h-2.5 rounded w-3/4 mb-1.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-2 rounded w-1/2" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => {
            const p = PRIORITY_COLORS[s.priority] ?? PRIORITY_COLORS['낮음'];
            return (
              <div
                key={i}
                className="rounded-lg cursor-pointer group relative"
                style={{
                  background: '#1c1c1e',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '8px 10px',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(10,132,255,0.2)'; (e.currentTarget as HTMLElement).style.background = '#242426'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.background = '#1c1c1e'; }}
                onClick={() => onSelect(s.title)}
              >
                <div className="flex items-start gap-0 pr-12">
                  <div className="flex-1 min-w-0">
                    <div style={{ color: 'rgba(235,235,245,0.88)', fontSize: 11, fontWeight: 500, lineHeight: 1.4 }}>{s.title}</div>
                    <div style={{ color: 'rgba(235,235,245,0.3)', fontSize: 9, marginTop: 3, lineHeight: 1.4 }}>{s.reason}</div>
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 9, padding: '1px 6px', borderRadius: 4, background: p.bg, color: p.text }}>
                      {s.priority}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleAddToSchedule(e, s.title, i)}
                  title="오늘 일정에 추가 (드래그도 가능)"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/aivis-suggestion', JSON.stringify({ title: s.title, index: i }));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: 'rgba(10,132,255,0.12)',
                    border: '1px solid rgba(10,132,255,0.3)',
                    borderRadius: 5,
                    padding: '2px 7px',
                    fontSize: 9,
                    color: '#64b5ff',
                    cursor: addingId === i ? 'default' : 'grab',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {addingId === i ? '...' : '+ 일정'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
