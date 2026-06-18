import { useState, useEffect } from 'react';
import { todoService, type TodoItem, type TodoPriority } from '../services/todoService';
import { toast } from '../stores/toastStore';

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  low: '낮음',
  normal: '보통',
  high: '높음',
};

const PRIORITY_COLORS: Record<TodoPriority, { bg: string; text: string; border: string }> = {
  low:    { bg: '#2c2c2e', text: '#6b7280', border: '#2a3a4a' },
  normal: { bg: '#1c1c1e', text: '#64b5ff', border: '#0062cc' },
  high:   { bg: '#2a0d0d', text: '#f87171', border: '#991b1b' },
};

function PriorityBadge({ priority }: { priority: TodoPriority }) {
  const c = PRIORITY_COLORS[priority];
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export default function TodoPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');

  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TodoPriority>('normal');
  const [newDue, setNewDue] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const data = await todoService.list();
      setTodos(data);
    } catch { /* stay stale */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const created = await todoService.create({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        dueDate: newDue || undefined,
      });
      setTodos(prev => [created, ...prev]);
      setNewTitle(''); setNewDesc(''); setNewPriority('normal'); setNewDue('');
      setShowForm(false);
      toast.success('할 일을 추가했습니다');
    } catch { toast.error('할 일을 추가하지 못했습니다'); }
    finally { setAdding(false); }
  }

  async function handleToggle(item: TodoItem) {
    try {
      const updated = await todoService.toggle(item);
      setTodos(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch { toast.error('상태를 변경하지 못했습니다'); }
  }

  async function handleDelete(id: string) {
    try {
      await todoService.remove(id);
      setTodos(prev => prev.filter(t => t.id !== id));
      toast.success('할 일을 삭제했습니다');
    } catch { toast.error('할 일을 삭제하지 못했습니다'); }
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.isCompleted;
    if (filter === 'done') return t.isCompleted;
    return true;
  });

  const doneCount = todos.filter(t => t.isCompleted).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#000000' }}>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-6 flex-shrink-0"
        style={{
          height: 52,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: '#000000',
          boxShadow: '0 1px 0 rgba(255,255,255,0.03), 0 4px 16px rgba(0,0,0,0.3)',
        }}>
        <div>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>할 일</div>
          <div style={{ color: 'rgba(235,235,245,0.25)', fontSize: 11, marginTop: 1 }}>
            {todos.length > 0 ? `${doneCount} / ${todos.length} 완료` : '오늘의 할 일을 추가해보세요'}
          </div>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          aria-label={showForm ? '할 일 추가 양식 닫기' : '할 일 추가 양식 열기'}
          aria-expanded={showForm}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showForm ? 'rgba(255,255,255,0.06)' : 'rgba(96,165,250,0.14)',
            border: `1px solid ${showForm ? 'rgba(255,255,255,0.08)' : 'rgba(96,165,250,0.3)'}`,
            color: showForm ? '#6b7280' : '#64b5ff',
            fontSize: 20, lineHeight: 1, cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {showForm ? '×' : '+'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6">

        {/* Apple-style add form */}
        {showForm && (
          <div
            className="rounded-2xl overflow-hidden mb-6"
            style={{
              background: '#1c1c1e',
              border: '1px solid rgba(96,165,250,0.18)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
              animation: 'bubble-pop-in 0.18s ease forwards',
            }}
          >
            {/* Title */}
            <div style={{ padding: '14px 14px 8px' }}>
              <input
                type="text"
                placeholder="무엇을 해야 하나요?"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdd()}
                autoFocus
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  color: '#f1f5f9', fontSize: 14, fontWeight: 500,
                  letterSpacing: 0.2, caretColor: '#64b5ff',
                }}
                className="placeholder-gray-700"
              />
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 14px' }} />

            {/* Description */}
            <div style={{ padding: '8px 14px' }}>
              <input
                type="text"
                placeholder="메모 (선택사항)"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  color: '#6b7280', fontSize: 11, caretColor: '#64b5ff',
                }}
                className="placeholder-gray-800"
              />
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 14px' }} />

            {/* Priority pills + due date row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}>
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                {(['low', 'normal', 'high'] as TodoPriority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    style={{
                      flex: 1, padding: '3px 0', borderRadius: 20, fontSize: 10, fontWeight: 500,
                      border: `1px solid ${newPriority === p ? PRIORITY_COLORS[p].border : 'rgba(255,255,255,0.07)'}`,
                      background: newPriority === p ? PRIORITY_COLORS[p].border + '33' : 'transparent',
                      color: newPriority === p ? PRIORITY_COLORS[p].text : '#4b5563',
                      cursor: 'pointer', transition: 'all 0.12s ease',
                    }}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: newDue ? '#64b5ff' : 'rgba(235,235,245,0.25)', fontSize: 10, colorScheme: 'dark',
                }}
              />
            </div>

            {/* Action bar */}
            <div style={{
              display: 'flex', gap: 6, padding: '8px 14px 12px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              <button
                onClick={() => { setShowForm(false); setNewTitle(''); setNewDesc(''); setNewPriority('normal'); setNewDue(''); }}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent', color: '#6b7280',
                }}
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={!newTitle.trim() || adding}
                style={{
                  flex: 1, padding: '6px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  border: 'none',
                  background: newTitle.trim() ? '#0a84ff' : 'rgba(37,99,235,0.18)',
                  color: newTitle.trim() ? '#fff' : 'rgba(235,235,245,0.25)',
                  cursor: newTitle.trim() ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >
                {adding ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {todos.length > 0 && (
          <div className="flex gap-1 mb-4">
            {(['all', 'active', 'done'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-[11px] px-3 py-1 rounded-lg transition-colors"
                style={filter === f
                  ? { background: '#2c2c2e', color: '#e2e8f0' }
                  : { color: '#4b5563' }
                }
              >
                {f === 'all' ? `전체 ${todos.length}` : f === 'active' ? `진행 중 ${todos.length - doneCount}` : `완료 ${doneCount}`}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="text-gray-600 text-[12px] text-center py-16">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          todos.length === 0 && filter === 'all' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 14, textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: 'rgba(10,132,255,0.06)',
                border: '1px solid rgba(96,165,250,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg style={{ width: 26, height: 26, color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div style={{ color: 'rgba(235,235,245,0.7)', fontSize: 14, fontWeight: 500 }}>할 일이 없어요</div>
                <div style={{ color: 'rgba(235,235,245,0.25)', fontSize: 11, marginTop: 5, lineHeight: 1.6 }}>
                  오늘 해야 할 일을 추가하거나<br />AI에게 작업 계획을 요청해보세요
                </div>
              </div>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  padding: '8px 20px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                  background: '#0a84ff', border: 'none', color: 'white',
                  cursor: 'pointer', transition: 'background 0.15s ease',
                  boxShadow: '0 4px 16px rgba(10,132,255,0.3)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0070d9'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0a84ff'; }}
              >+ 첫 번째 할 일 추가</button>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-3">
                <svg style={{ width: 16, height: 16, color: 'rgba(235,235,245,0.2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-gray-500 text-[13px]">
                {filter === 'done' ? '완료된 항목이 없어요' : '모두 완료했어요! 🎉'}
              </div>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {filtered.map(todo => (
              <div
                key={todo.id}
                className="flex items-start gap-3 rounded-xl px-4 py-3 group"
                style={{
                  background: todo.isCompleted
                    ? '#1c1c1e'
                    : '#1c1c1e',
                  border: `1px solid ${todo.isCompleted ? 'rgba(255,255,255,0.04)' : (PRIORITY_COLORS[todo.priority].border + '50')}`,
                  boxShadow: todo.isCompleted ? 'none' : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!todo.isCompleted) {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = todo.isCompleted ? 'none' : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)';
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(todo)}
                  className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={todo.isCompleted
                    ? { background: '#0062cc', borderColor: '#0062cc' }
                    : { borderColor: '#2a3a4a' }
                  }
                >
                  {todo.isCompleted && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[13px] font-medium ${todo.isCompleted ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                      {todo.title}
                    </span>
                    <PriorityBadge priority={todo.priority} />
                    {todo.dueDate && (
                      <span className="text-[9px] text-gray-600">
                        {new Date(todo.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {todo.description && (
                    <div className={`text-[11px] mt-0.5 ${todo.isCompleted ? 'text-gray-700' : 'text-gray-500'}`}>
                      {todo.description}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-700 hover:text-red-400 transition-all text-[10px] mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {todos.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-gray-600 text-[10px]">진행률</span>
              <span className="text-gray-500 text-[10px]">{Math.round((doneCount / todos.length) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2c2c2e', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(doneCount / todos.length) * 100}%`,
                  background: '#0a84ff',
                  boxShadow: '0 0 8px rgba(59,130,246,0.5)',
                }}
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
