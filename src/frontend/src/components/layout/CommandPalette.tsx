import { useState, useEffect, useRef, useMemo } from 'react';
import type { PageKey } from './NavBar';
import { memoryService, type MemoryItem } from '../../services/memoryService';
import { noteService, type NoteItem } from '../../services/noteService';
import { todoService, type TodoItem } from '../../services/todoService';
import { scheduleService, type ScheduleItem } from '../../services/scheduleService';
import { todayISO } from '../../utils/time';

type ResultType = 'memory' | 'note' | 'todo' | 'schedule' | 'page';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle?: string;
  page: PageKey;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageKey) => void;
}

const PAGE_TARGETS: Array<{ key: PageKey; label: string; description: string }> = [
  { key: 'dashboard', label: '대시보드', description: '오늘의 일정과 추천' },
  { key: 'schedule', label: '일정', description: '24시간 타임라인 관리' },
  { key: 'memory', label: 'AI 기억', description: '저장된 기억 보기/관리' },
  { key: 'notes', label: '노트', description: '노트 작성 및 검색' },
  { key: 'todo', label: '할 일', description: '할 일 목록 관리' },
  { key: 'analytics', label: '지식연결', description: '지식 네트워크 그래프' },
  { key: 'settings', label: '설정', description: '프로필 및 환경 설정' },
];

const TYPE_LABELS: Record<ResultType, string> = {
  memory: '기억', note: '노트', todo: '할 일', schedule: '일정', page: '페이지',
};

const TYPE_COLORS: Record<ResultType, string> = {
  memory: '#3b82f6', note: '#a855f7', todo: '#22d3ee', schedule: '#fb923c', page: '#9ca3af',
};

function ResultIcon({ type }: { type: ResultType }) {
  const color = TYPE_COLORS[type];
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      background: `${color}22`, border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color,
    }}>
      <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        {type === 'memory' && (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        )}
        {type === 'note' && (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        )}
        {type === 'todo' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        )}
        {type === 'schedule' && (
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        )}
        {type === 'page' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        )}
      </svg>
    </div>
  );
}

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);

    const today = todayISO();
    Promise.all([
      memoryService.list().catch(() => [] as MemoryItem[]),
      noteService.list(50).catch(() => [] as NoteItem[]),
      todoService.list().catch(() => [] as TodoItem[]),
      scheduleService.getByDate(today).catch(() => [] as ScheduleItem[]),
    ]).then(([m, n, td, sc]) => {
      setMemories(m); setNotes(n); setTodos(td); setSchedules(sc);
    });

    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    const list: SearchResult[] = [];

    if (!q) {
      PAGE_TARGETS.forEach(p => list.push({
        type: 'page', id: p.key, title: p.label, subtitle: p.description, page: p.key,
      }));
      return list;
    }

    PAGE_TARGETS.filter(p => p.label.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      .forEach(p => list.push({
        type: 'page', id: p.key, title: p.label, subtitle: p.description, page: p.key,
      }));

    memories.filter(m => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(m => list.push({
        type: 'memory', id: m.id, title: m.key, subtitle: m.value, page: 'memory',
      }));

    notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(n => list.push({
        type: 'note', id: n.id, title: n.title, subtitle: n.content.slice(0, 90), page: 'notes',
      }));

    todos.filter(t => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(t => list.push({
        type: 'todo', id: t.id, title: t.title, subtitle: t.description, page: 'todo',
      }));

    schedules.filter(s => s.title.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach(s => list.push({
        type: 'schedule', id: s.id, title: s.title,
        subtitle: `${s.startTime}${s.endTime ? ' ~ ' + s.endTime : ''}`,
        page: 'schedule',
      }));

    return list;
  }, [query, memories, notes, todos, schedules]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        onNavigate(results[activeIndex].page);
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, results, activeIndex, onClose, onNavigate]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 96,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560, maxWidth: '92vw',
          background: 'linear-gradient(180deg, #1a1a1f 0%, #15151a 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          boxShadow: '0 28px 96px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <svg style={{ width: 16, height: 16, color: '#6b7280', flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="검색 — 메모리, 노트, 할 일, 일정, 페이지..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'white', fontSize: 14, letterSpacing: '-0.01em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          />
          <span style={{
            fontSize: 9, color: '#6b7280', padding: '3px 7px',
            background: 'rgba(255,255,255,0.05)', borderRadius: 5,
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 440, overflowY: 'auto', padding: 6 }}>
          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280', fontSize: 12 }}>
              검색 결과가 없어요
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => { onNavigate(r.page); onClose(); }}
                onMouseEnter={() => setActiveIndex(i)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 9,
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: i === activeIndex ? 'rgba(10,132,255,0.16)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s ease',
                  marginBottom: 2,
                }}
              >
                <ResultIcon type={r.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: 'rgba(235,235,245,0.95)', fontSize: 13, fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}>{r.title}</div>
                  {r.subtitle && (
                    <div style={{
                      color: 'rgba(235,235,245,0.4)', fontSize: 11, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}>{r.subtitle}</div>
                  )}
                </div>
                <span style={{
                  fontSize: 9, color: TYPE_COLORS[r.type],
                  padding: '3px 8px', background: `${TYPE_COLORS[r.type]}1a`,
                  border: `1px solid ${TYPE_COLORS[r.type]}33`,
                  borderRadius: 5, letterSpacing: '0.04em', flexShrink: 0,
                }}>{TYPE_LABELS[r.type]}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', gap: 16, color: '#6b7280', fontSize: 10 }}>
            <span>↑↓ 탐색</span>
            <span>↵ 이동</span>
            <span>esc 닫기</span>
          </div>
          <span style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.05em' }}>AIVIS 전역 검색</span>
        </div>
      </div>
    </div>
  );
}
