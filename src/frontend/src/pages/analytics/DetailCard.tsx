import type { SelectedItem } from './types';

export function DetailCard({
  item,
  onClose,
  onChat,
}: {
  item: SelectedItem;
  onClose: () => void;
  onChat: (item: SelectedItem) => void;
}) {
  const color = item.branch.color;
  const title = item.node ? item.node.label : item.branch.label;
  const sublabel = item.node?.sublabel;
  const nodeCount = item.branch.nodes.length;

  return (
    <div style={{
      position: 'absolute',
      right: 20,
      top: 60,
      background: 'rgba(14,14,16,0.97)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '18px 20px',
      width: 240,
      zIndex: 30,
      boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${color}12`,
    }}>
      {/* Header accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 20, right: 20, height: 2,
        background: `linear-gradient(90deg, ${color}, ${item.branch.gradientEnd})`,
        borderRadius: '0 0 2px 2px',
        opacity: 0.8,
      }} />

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          color: 'rgba(235,235,245,0.35)',
          fontSize: 10,
          transition: 'background 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.7)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.35)';
        }}
      >x</button>

      {/* Branch label */}
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color,
        marginBottom: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: 0.85,
      }}>{item.branch.label}</div>

      {/* Title */}
      <div style={{
        color: 'rgba(235,235,245,0.92)',
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.35,
        marginBottom: sublabel ? 6 : 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '-0.01em',
      }}>{title}</div>

      {/* Sublabel */}
      {sublabel && (
        <div style={{
          color: 'rgba(235,235,245,0.35)',
          fontSize: 11,
          marginBottom: 14,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>{sublabel}</div>
      )}

      {/* Separator */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {item.node && (
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            padding: '8px 10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              color,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>{Math.round(item.node.weight * 100)}%</div>
            <div style={{
              color: 'rgba(235,235,245,0.2)',
              fontSize: 9,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              marginTop: 2,
            }}>역량 수준</div>
          </div>
        )}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            color: item.branch.color,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>{nodeCount}</div>
          <div style={{
            color: 'rgba(235,235,245,0.2)',
            fontSize: 9,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            marginTop: 2,
          }}>연결 노드</div>
        </div>
      </div>

      {/* Chat CTA */}
      <button
        onClick={() => onChat(item)}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '8px',
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
          background: `linear-gradient(135deg, ${color}22, ${color}11)`,
          border: `1px solid ${color}44`,
          color,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${color}33, ${color}22)`;
          (e.currentTarget as HTMLElement).style.borderColor = `${color}77`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${color}22, ${color}11)`;
          (e.currentTarget as HTMLElement).style.borderColor = `${color}44`;
        }}
      >
        <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        이 주제로 대화하기
      </button>
    </div>
  );
}
