export function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 16px', borderRadius: 'var(--r-md)',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-1)',
      gap: 2,
    }}>
      <span className="tabular" style={{
        color,
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.01em',
      }}>{value}</span>
      <span style={{
        color: 'var(--text-3)',
        fontSize: 9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>{label}</span>
    </div>
  );
}
