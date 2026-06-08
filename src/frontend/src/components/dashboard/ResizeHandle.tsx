import { useRef } from 'react';

/** Vertical column drag handle that highlights on hover. */
export function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const lineRef = useRef<HTMLDivElement>(null);
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: 8,
        flexShrink: 0,
        cursor: 'col-resize',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
      onMouseEnter={() => { if (lineRef.current) lineRef.current.style.background = 'rgba(59,130,246,0.5)'; }}
      onMouseLeave={() => { if (lineRef.current) lineRef.current.style.background = 'rgba(255,255,255,0.05)'; }}
    >
      <div ref={lineRef} style={{ width: 1, background: 'rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }} />
    </div>
  );
}
