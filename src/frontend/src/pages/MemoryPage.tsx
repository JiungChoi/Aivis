import { useState, useEffect } from 'react';
import { memoryService, type MemoryItem } from '../services/memoryService';
import { toast } from '../stores/toastStore';

// Neutral chrome for all source badges (single-accent design system)
const SOURCE_BADGE_STYLE = { background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', borderRadius: 'var(--r-full)' } as const;

const SOURCE_LABELS: Record<string, string> = {
  conversation: 'AI가 배운 것',
  manual:       '내가 알려준 것',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MemoryItem | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const load = () => {
    setLoading(true);
    setError(false);
    memoryService.list()
      .then(data => { setMemories(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(load, []);

  const filtered = memories.filter(m =>
    m.key.toLowerCase().includes(search.toLowerCase()) ||
    m.value.toLowerCase().includes(search.toLowerCase())
  );

  function selectMemory(m: MemoryItem) {
    setSelected(m);
    setEditKey(m.key);
    setEditValue(m.value);
    setShowAddForm(false);
  }

  async function handleSave() {
    if (!selected || !editKey.trim() || !editValue.trim()) return;
    setSaving(true);
    try {
      const updated = await memoryService.upsert({ key: editKey.trim(), value: editValue.trim(), source: 'manual' });
      setMemories(prev => prev.map(m => m.key === editKey.trim() ? updated : m));
      setSelected(updated);
      toast.success('기억을 저장했습니다');
    } catch {
      toast.error('기억을 저장하지 못했습니다');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await memoryService.remove(id);
      setMemories(prev => prev.filter(m => m.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success('기억을 삭제했습니다');
    } catch {
      toast.error('기억을 삭제하지 못했습니다');
    }
  }

  async function handleAdd() {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      const created = await memoryService.upsert({ key: newKey.trim(), value: newValue.trim(), source: 'manual' });
      setMemories(prev => {
        const exists = prev.findIndex(m => m.key === created.key);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = created;
          return next;
        }
        return [created, ...prev];
      });
      setNewKey('');
      setNewValue('');
      setShowAddForm(false);
      setSelected(created);
      setEditKey(created.key);
      setEditValue(created.value);
      toast.success('기억을 추가했습니다');
    } catch {
      toast.error('기억을 추가하지 못했습니다');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: 'var(--bg-0)' }}>
      {/* ── 좌측: 메모리 목록 ── */}
      <div className="flex flex-col w-80 flex-shrink-0 overflow-hidden" style={{ borderRight: '1px solid var(--border-1)' }}>
        {/* 헤더 */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>AI 기억</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>비서가 나에 대해 알고 있는 것들</div>
            </div>
            <button
              onClick={() => { setShowAddForm(v => !v); setSelected(null); }}
              style={{
                width: 24, height: 24, borderRadius: 'var(--r-full)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: showAddForm ? 'rgba(255,255,255,0.06)' : 'var(--accent-bg)',
                border: `1px solid ${showAddForm ? 'var(--border-2)' : 'var(--accent-border)'}`,
                color: showAddForm ? 'var(--text-3)' : 'var(--accent)',
                fontSize: 16, lineHeight: 1, cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              {showAddForm ? '×' : '+'}
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, color: 'var(--text-3)', pointerEvents: 'none' }}
              fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-[11px] focus:outline-none placeholder-gray-700"
              style={{
                background: 'var(--bg-sunken)', border: '1px solid var(--border-1)',
                color: 'var(--text-1)', padding: '7px 10px 7px 27px', borderRadius: 'var(--r-sm)',
              }}
            />
          </div>
        </div>

        {/* Apple-style 추가 폼 */}
        {showAddForm && (
          <div
            className="mx-3 mb-3 overflow-hidden flex-shrink-0"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 'var(--r-md)',
              animation: 'bubble-pop-in 0.18s ease forwards',
            }}
          >
            <div style={{ padding: '11px 12px 7px' }}>
              <input
                type="text"
                placeholder="주제 (예: 좋아하는 음식)"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                autoFocus
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-1)', fontSize: 12, fontWeight: 500, caretColor: 'var(--accent)',
                }}
                className="placeholder-gray-700"
              />
            </div>
            <div style={{ height: 1, background: 'var(--border-1)', margin: '0 12px' }} />
            <div style={{ padding: '7px 12px 7px' }}>
              <textarea
                placeholder="내용을 입력하세요"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                rows={2}
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text-2)', fontSize: 11, resize: 'none', caretColor: 'var(--accent)',
                }}
                className="placeholder-gray-800"
              />
            </div>
            <div style={{
              display: 'flex', gap: 5, padding: '6px 12px 10px',
              borderTop: '1px solid var(--border-1)',
            }}>
              <button
                onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue(''); }}
                style={{
                  padding: '5px 9px', borderRadius: 'var(--r-sm)', fontSize: 10, cursor: 'pointer',
                  border: '1px solid var(--border-2)',
                  background: 'transparent', color: 'var(--text-2)',
                }}
              >
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={!newKey.trim() || !newValue.trim() || saving}
                style={{
                  flex: 1, padding: '5px', borderRadius: 'var(--r-sm)', fontSize: 10, fontWeight: 600,
                  border: 'none',
                  background: (newKey.trim() && newValue.trim()) ? 'var(--accent)' : 'var(--accent-bg)',
                  color: (newKey.trim() && newValue.trim()) ? 'var(--on-accent)' : 'var(--text-3)',
                  cursor: (newKey.trim() && newValue.trim()) ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >
                {saving ? '저장 중...' : '알려주기'}
              </button>
            </div>
          </div>
        )}

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 animate-pulse" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)' }}>
                <div className="h-2.5 rounded w-1/2 mb-2" style={{ background: 'var(--bg-3)' }} />
                <div className="h-2 rounded w-3/4" style={{ background: 'var(--bg-3)' }} />
              </div>
            ))
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-[11px] mb-2" style={{ color: 'var(--danger)' }}>메모리를 불러오지 못했습니다.</div>
              <button onClick={load} className="text-[11px] underline text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]">재시도</button>
            </div>
          ) : filtered.length === 0 ? (
            search ? (
              <div className="text-[11px] text-center py-8" style={{ color: 'var(--text-3)' }}>검색 결과가 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 16px', gap: 12, textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--r-md)',
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg style={{ width: 24, height: 24, color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <div style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>아직 기억이 없어요</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 4, lineHeight: 1.6 }}>
                    AI와 대화하면 중요한 정보가<br />자동으로 저장됩니다
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddForm(true); setSelected(null); }}
                  style={{
                    padding: '6px 16px', borderRadius: 'var(--r-sm)', fontSize: 10, fontWeight: 500,
                    background: 'var(--bg-2)', border: '1px solid var(--border-1)',
                    color: 'var(--text-1)', cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'; }}
                >직접 알려주기</button>
              </div>
            )
          ) : (
            filtered.map(m => (
              <div
                key={m.id}
                onClick={() => selectMemory(m)}
                className="p-3 cursor-pointer"
                style={{
                  background: selected?.id === m.id ? 'var(--bg-3)' : 'var(--bg-2)',
                  border: selected?.id === m.id ? '1px solid var(--accent-border)' : '1px solid var(--border-1)',
                  borderRadius: 'var(--r-md)',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (selected?.id !== m.id) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-3)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
                  }
                }}
                onMouseLeave={e => {
                  if (selected?.id !== m.id) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-1)';
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text-1)' }}>{m.key}</div>
                    <div className="text-[10px] mt-0.5 line-clamp-2 leading-snug" style={{ color: 'var(--text-2)' }}>{m.value}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(m.id); }}
                    className="flex-shrink-0 transition-colors text-[10px] text-[color:var(--text-3)] hover:text-[color:var(--danger)]"
                  >✕</button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] px-1.5 py-0.5" style={SOURCE_BADGE_STYLE}>
                    {SOURCE_LABELS[m.source] ?? m.source}
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{formatDate(m.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 통계 */}
        {!loading && !error && (
          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
            <div className="flex gap-3">
              <div className="text-center">
                <div className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{memories.length}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>총 기억</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{memories.filter(m => m.source === 'conversation').length}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>AI 자동</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{memories.filter(m => m.source === 'manual').length}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-3)' }}>수동 입력</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 우측: 상세 뷰 ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-lg">
              <div className="text-[10px] mb-4 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
                <span className="text-[9px] px-1.5 py-0.5" style={SOURCE_BADGE_STYLE}>
                  {SOURCE_LABELS[selected.source] ?? selected.source}
                </span>
                <span>저장: {formatDate(selected.createdAt)}</span>
                <span>수정: {formatDate(selected.updatedAt)}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: 'var(--text-3)' }}>주제</label>
                  <input
                    type="text"
                    value={editKey}
                    onChange={e => setEditKey(e.target.value)}
                    className="w-full text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-border)]"
                    style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-1)', color: 'var(--text-1)', borderRadius: 'var(--r-sm)' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: 'var(--text-3)' }}>내용</label>
                  <textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    rows={6}
                    className="w-full text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-border)] resize-none leading-relaxed"
                    style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-1)', color: 'var(--text-1)', borderRadius: 'var(--r-sm)' }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !editKey.trim() || !editValue.trim()}
                    className="px-4 py-1.5 rounded-[var(--r-sm)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[color:var(--on-accent)] text-[11px] font-medium transition-colors"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="px-4 py-1.5 rounded-[var(--r-sm)] bg-[var(--danger-bg)] hover:bg-[var(--danger-border)] text-[color:var(--danger)] text-[11px] font-medium transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--r-md)',
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg style={{ width: 24, height: 24, color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 500 }}>항목을 선택하세요</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4 }}>클릭하면 내용을 수정하거나 삭제할 수 있습니다</div>
              <div style={{
                marginTop: 16, padding: '8px 14px', borderRadius: 'var(--r-sm)',
                background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                color: 'var(--text-3)', fontSize: 10, lineHeight: 1.6,
              }}>
                AI와 대화하면 자동으로 중요한 정보를 기억합니다
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
