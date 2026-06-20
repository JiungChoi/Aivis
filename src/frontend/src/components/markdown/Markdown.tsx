import type React from 'react';

// ── Inline markdown (bold, italic, inline code) ────────────────
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`\n]+`|\*[^*]+\*)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
          return <strong key={i} style={{ color: '#e2e8f0', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
          return (
            <code key={i} style={{
              background: '#0a0a0a', border: '1px solid rgba(84,84,88,0.35)', borderRadius: 4,
              padding: '1px 5px', fontSize: '0.9em', color: 'rgba(100,181,255,0.85)', fontFamily: 'monospace',
            }}>{part.slice(1, -1)}</code>
          );
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
          return <em key={i} style={{ color: '#9ca3af' }}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Block markdown renderer ────────────────────────────────────
export function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={nodes.length} style={{
          background: '#0a0a0a', border: '1px solid rgba(84,84,88,0.35)', borderRadius: 8,
          padding: '10px 12px', fontSize: 11, color: 'rgba(100,181,255,0.85)', overflowX: 'auto',
          fontFamily: 'monospace', lineHeight: 1.6, margin: '4px 0',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
    } else if (line.startsWith('### ')) {
      nodes.push(
        <div key={nodes.length} style={{ color: '#c4b5fd', fontWeight: 600, fontSize: 12, marginTop: 10 }}>
          <InlineText text={line.slice(4)} />
        </div>,
      );
    } else if (line.startsWith('## ')) {
      nodes.push(
        <div key={nodes.length} style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginTop: 12 }}>
          <InlineText text={line.slice(3)} />
        </div>,
      );
    } else if (line.startsWith('# ')) {
      nodes.push(
        <div key={nodes.length} style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 14 }}>
          <InlineText text={line.slice(2)} />
        </div>,
      );
    } else if (/^[-*] /.test(line)) {
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginLeft: 4 }}>
          <span style={{ color: '#0a84ff', fontSize: 11, marginTop: 3, flexShrink: 0 }}>•</span>
          <span style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.65 }}>
            <InlineText text={line.slice(2)} />
          </span>
        </div>,
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1] ?? '1';
      nodes.push(
        <div key={nodes.length} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginLeft: 4 }}>
          <span style={{ color: '#64b5ff', fontSize: 11, marginTop: 3, flexShrink: 0, minWidth: 14 }}>{num}.</span>
          <span style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.65 }}>
            <InlineText text={line.slice(num.length + 2)} />
          </span>
        </div>,
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={nodes.length} style={{ height: 5 }} />);
    } else if (line.startsWith('---') || line.startsWith('===')) {
      nodes.push(<div key={nodes.length} style={{ height: 1, background: '#2c2c2e', margin: '8px 0' }} />);
    } else {
      nodes.push(
        <div key={nodes.length} style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.7 }}>
          <InlineText text={line} />
        </div>,
      );
    }
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{nodes}</div>;
}
