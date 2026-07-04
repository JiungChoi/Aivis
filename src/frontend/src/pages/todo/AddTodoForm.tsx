import { type TodoPriority } from '../../services/todoService';
import { PRIORITY_COLORS, PRIORITY_LABELS } from './constants';

interface AddTodoFormProps {
  showForm: boolean;
  newTitle: string;
  newDesc: string;
  newPriority: TodoPriority;
  newDue: string;
  adding: boolean;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  onPriorityChange: (v: TodoPriority) => void;
  onDueChange: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export function AddTodoForm({
  showForm, newTitle, newDesc, newPriority, newDue, adding,
  onTitleChange, onDescChange, onPriorityChange, onDueChange, onAdd, onCancel,
}: AddTodoFormProps) {
  if (!showForm) return null;

  return (
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
          onChange={e => onTitleChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onAdd()}
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
          onChange={e => onDescChange(e.target.value)}
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
              onClick={() => onPriorityChange(p)}
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
          onChange={e => onDueChange(e.target.value)}
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
          onClick={onCancel}
          style={{
            padding: '6px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: '#6b7280',
          }}
        >
          취소
        </button>
        <button
          onClick={onAdd}
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
  );
}
