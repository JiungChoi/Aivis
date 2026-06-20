export function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 16px', borderRadius: 10,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      gap: 2,
    }}>
      <span style={{
        color,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        textShadow: `0 0 16px ${color}50`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>{value}</span>
      <span style={{
        color: 'rgba(235,235,245,0.25)',
        fontSize: 9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>{label}</span>
    </div>
  );
}
