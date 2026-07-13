import type React from 'react';

export type MarkdownVariant = 'default' | 'compact';

// ── Inline markdown (bold, italic, inline code) ────────────────
export function InlineText({ text, variant = 'default' }: { text: string; variant?: MarkdownVariant }) {
  const compact = variant === 'compact';
  const parts = text.split(
    compact ? /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/ : /(\*\*[^*]+\*\*|`[^`\n]+`|\*[^*]+\*)/,
  );
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
          return (
            <strong key={i} style={compact
              ? { fontWeight: 600 }
              : { color: 'var(--text-1)', fontWeight: 600 }
            }>{part.slice(2, -2)}</strong>
          );
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
          return (
            <code key={i} style={compact ? {
              background: 'rgba(0,0,0,0.35)', borderRadius: 'var(--r-sm)',
              padding: '1px 4px', fontSize: '0.88em',
              fontFamily: 'ui-monospace, monospace', color: 'var(--accent)',
            } : {
              background: 'var(--bg-sunken)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)',
              padding: '1px 5px', fontSize: '0.9em', color: 'var(--accent)', fontFamily: 'ui-monospace, monospace',
            }}>{part.slice(1, -1)}</code>
          );
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
          return <em key={i} style={{ color: 'var(--text-2)' }}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Block markdown renderer ────────────────────────────────────
export function RenderMarkdown({ text, variant = 'default' }: { text: string; variant?: MarkdownVariant }) {
  const compact = variant === 'compact';
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
        <pre key={nodes.length} style={compact ? {
          background: 'rgba(0,0,0,0.35)', borderRadius: 'var(--r-sm)', padding: '8px 10px',
          fontSize: 11, color: 'var(--accent)', overflowX: 'auto',
          fontFamily: 'ui-monospace, monospace', lineHeight: 1.55, margin: '3px 0',
        } : {
          background: 'var(--bg-sunken)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)',
          padding: '10px 12px', fontSize: 11, color: 'var(--accent)', overflowX: 'auto',
          fontFamily: 'ui-monospace, monospace', lineHeight: 1.6, margin: '4px 0',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
    } else if (line.startsWith('### ')) {
      nodes.push(
        <div key={nodes.length} style={compact
          ? { fontWeight: 600, color: 'var(--text-1)', fontSize: 12, marginTop: 5 }
          : { color: 'var(--text-1)', fontWeight: 600, fontSize: 12, marginTop: 10 }
        }>
          <InlineText text={line.slice(4)} variant={variant} />
        </div>,
      );
    } else if (line.startsWith('## ')) {
      nodes.push(
        <div key={nodes.length} style={compact
          ? { fontWeight: 600, color: 'var(--text-1)', fontSize: 12, marginTop: 5 }
          : { color: 'var(--text-1)', fontWeight: 600, fontSize: 13, marginTop: 12 }
        }>
          <InlineText text={line.slice(3)} variant={variant} />
        </div>,
      );
    } else if (!compact && line.startsWith('# ')) {
      nodes.push(
        <div key={nodes.length} style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: 15, marginTop: 14 }}>
          <InlineText text={line.slice(2)} />
        </div>,
      );
    } else if (/^[-*] /.test(line)) {
      nodes.push(
        <div key={nodes.length} style={compact
          ? { display: 'flex', gap: 5, alignItems: 'flex-start' }
          : { display: 'flex', gap: 6, alignItems: 'flex-start', marginLeft: 4 }
        }>
          <span style={compact
            ? { color: 'var(--accent)', fontSize: 11, marginTop: 2, flexShrink: 0 }
            : { color: 'var(--accent)', fontSize: 11, marginTop: 3, flexShrink: 0 }
          }>•</span>
          <span style={compact ? undefined : { color: 'var(--text-1)', fontSize: 12, lineHeight: 1.65 }}>
            <InlineText text={line.slice(2)} variant={variant} />
          </span>
        </div>,
      );
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1] ?? '1';
      nodes.push(
        <div key={nodes.length} style={compact
          ? { display: 'flex', gap: 5, alignItems: 'flex-start' }
          : { display: 'flex', gap: 6, alignItems: 'flex-start', marginLeft: 4 }
        }>
          <span style={compact
            ? { color: 'var(--accent)', fontSize: 11, marginTop: 2, flexShrink: 0, minWidth: 12 }
            : { color: 'var(--accent)', fontSize: 11, marginTop: 3, flexShrink: 0, minWidth: 14 }
          }>{num}.</span>
          <span style={compact ? undefined : { color: 'var(--text-1)', fontSize: 12, lineHeight: 1.65 }}>
            <InlineText text={line.slice(num.length + 2)} variant={variant} />
          </span>
        </div>,
      );
    } else if (line.trim() === '') {
      if (compact) {
        if (nodes.length > 0) nodes.push(<div key={nodes.length} style={{ height: 4 }} />);
      } else {
        nodes.push(<div key={nodes.length} style={{ height: 5 }} />);
      }
    } else if (!compact && (line.startsWith('---') || line.startsWith('==='))) {
      nodes.push(<div key={nodes.length} style={{ height: 1, background: 'var(--border-1)', margin: '8px 0' }} />);
    } else {
      nodes.push(
        compact
          ? <div key={nodes.length}><InlineText text={line} variant={variant} /></div>
          : (
            <div key={nodes.length} style={{ color: 'var(--text-1)', fontSize: 12, lineHeight: 1.7 }}>
              <InlineText text={line} />
            </div>
          ),
      );
    }
    i++;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 1.5 : 1 }}>{nodes}</div>;
}
