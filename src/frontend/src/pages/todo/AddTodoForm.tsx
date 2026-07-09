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
      className="overflow-hidden mb-6"
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--r-md)',
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
            color: 'var(--text-1)', fontSize: 14, fontWeight: 500,
            caretColor: 'var(--accent)',
          }}
          className="placeholder-gray-700"
        />
      </div>

      <div style={{ height: 1, background: 'var(--border-1)', margin: '0 14px' }} />

      {/* Description */}
      <div style={{ padding: '8px 14px' }}>
        <input
          type="text"
          placeholder="메모 (선택사항)"
          value={newDesc}
          onChange={e => onDescChange(e.target.value)}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-3)', fontSize: 11, caretColor: 'var(--accent)',
          }}
          className="placeholder-gray-800"
        />
      </div>

      <div style={{ height: 1, background: 'var(--border-1)', margin: '0 14px' }} />

      {/* Priority pills + due date row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {(['low', 'normal', 'high'] as TodoPriority[]).map(p => (
            <button
              key={p}
              onClick={() => onPriorityChange(p)}
              style={{
                flex: 1, padding: '3px 0', borderRadius: 'var(--r-full)', fontSize: 10, fontWeight: 500,
                border: `1px solid ${newPriority === p ? PRIORITY_COLORS[p].border : 'var(--border-1)'}`,
                background: newPriority === p ? PRIORITY_COLORS[p].bg : 'transparent',
                color: newPriority === p ? PRIORITY_COLORS[p].text : 'var(--text-3)',
                cursor: 'pointer', transition: 'all var(--dur-1) var(--ease)',
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
            color: newDue ? 'var(--accent)' : 'var(--text-3)', fontSize: 10, colorScheme: 'dark',
          }}
        />
      </div>

      {/* Action bar */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 14px 12px',
        borderTop: '1px solid var(--border-1)',
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 10px', borderRadius: 'var(--r-sm)', fontSize: 11, cursor: 'pointer',
            border: '1px solid var(--border-1)',
            background: 'transparent', color: 'var(--text-2)',
          }}
        >
          취소
        </button>
        <button
          onClick={onAdd}
          disabled={!newTitle.trim() || adding}
          style={{
            flex: 1, padding: '6px', borderRadius: 'var(--r-sm)', fontSize: 11, fontWeight: 600,
            border: 'none',
            background: newTitle.trim() ? 'var(--accent)' : 'var(--accent-bg)',
            color: newTitle.trim() ? 'var(--on-accent)' : 'var(--text-3)',
            cursor: newTitle.trim() ? 'pointer' : 'default',
            transition: 'all var(--dur-2) var(--ease)',
          }}
        >
          {adding ? '추가 중...' : '추가'}
        </button>
      </div>
    </div>
  );
}
