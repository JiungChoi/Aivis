import { useState } from 'react';

export type PageKey = 'dashboard' | 'schedule' | 'todo' | 'notes' | 'memory' | 'analytics' | 'settings';

function NavItem({
  active, disabled, expanded, label, badge, onClick, children,
}: {
  active?: boolean;
  disabled?: boolean;
  expanded: boolean;
  label: string;
  badge?: number;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={!expanded ? label : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        height: 38,
        borderRadius: 9,
        padding: expanded ? '0 10px' : '0',
        gap: expanded ? 9 : 0,
        justifyContent: expanded ? 'flex-start' : 'center',
        background: active
          ? 'linear-gradient(135deg, rgba(10,132,255,0.22) 0%, rgba(94,92,230,0.12) 100%)'
          : 'transparent',
        border: active ? '1px solid rgba(10,132,255,0.2)' : '1px solid transparent',
        color: active ? '#4da3ff' : disabled ? 'rgba(235,235,245,0.2)' : 'rgba(235,235,245,0.45)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
        outline: 'none',
        WebkitAppearance: 'none',
        boxShadow: active ? '0 2px 12px rgba(10,132,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
      } as React.CSSProperties}
      onMouseEnter={e => {
        if (!active && !disabled) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.75)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = disabled ? 'rgba(235,235,245,0.2)' : 'rgba(235,235,245,0.45)';
        }
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, flexShrink: 0 }}>
        {children}
      </span>
      {expanded && (
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, letterSpacing: '-0.1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
          {disabled && (
            <span style={{ fontSize: 9, color: 'rgba(235,235,245,0.25)', flexShrink: 0, letterSpacing: 0.2 }}>준비 중</span>
          )}
          {badge !== undefined && badge > 0 && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 99,
              background: 'linear-gradient(135deg, #0a84ff, #5e5ce6)',
              color: '#fff', fontWeight: 600, flexShrink: 0,
              boxShadow: '0 2px 6px rgba(10,132,255,0.4)',
            }}>
              {badge}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

interface Props {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export default function NavBar({ currentPage, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(true);
  const sidebarWidth = expanded ? 176 : 60;

  return (
    <nav
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        width: sidebarWidth,
        background: 'linear-gradient(180deg, rgba(14,14,22,0.98) 0%, rgba(10,10,16,0.98) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRight: '0.5px solid rgba(255,255,255,0.07)',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        boxShadow: '1px 0 0 rgba(255,255,255,0.02), 4px 0 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Subtle top-left glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: 180,
        background: 'radial-gradient(ellipse at 30% 0%, rgba(10,132,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Brand header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: expanded ? '18px 12px 15px' : '18px 0 15px',
        justifyContent: 'space-between',
        minHeight: 62,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(10,132,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            <svg style={{ width: 16, height: 16, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          {expanded && (
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, letterSpacing: '-0.4px', lineHeight: 1,
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>AIVIS</div>
              <div style={{ fontSize: 10, color: 'rgba(235,235,245,0.3)', marginTop: 2.5 }}>AI Assistant</div>
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          title={expanded ? '접기' : '펼치기'}
          style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(235,235,245,0.3)', cursor: 'pointer',
            opacity: expanded ? 1 : 0,
            pointerEvents: expanded ? 'auto' : 'none',
            transition: 'opacity 0.15s ease',
          }}
        >
          <svg style={{ width: 11, height: 11 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Top separator */}
      <div style={{
        height: '0.5px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent 100%)',
        margin: '0 12px 10px',
      }} />

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 8px', gap: 2 }}>

        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              width: '100%', height: 30, borderRadius: 7, marginBottom: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)', border: 'none',
              color: 'rgba(235,235,245,0.35)', cursor: 'pointer',
            }}
          >
            <svg style={{ width: 11, height: 11 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <NavItem active={currentPage === 'dashboard'} expanded={expanded} label="홈" onClick={() => onNavigate('dashboard')}>
          <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </NavItem>

        <NavItem active={currentPage === 'schedule'} expanded={expanded} label="일정" onClick={() => onNavigate('schedule')}>
          <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </NavItem>

        <NavItem active={currentPage === 'notes'} expanded={expanded} label="노트" onClick={() => onNavigate('notes')}>
          <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </NavItem>

        <div style={{
          height: '0.5px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
          margin: '5px 4px',
        }} />

        <NavItem active={currentPage === 'memory'} expanded={expanded} label="메모리" onClick={() => onNavigate('memory')}>
          <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </NavItem>

        <NavItem active={currentPage === 'analytics'} expanded={expanded} label="지식연결" onClick={() => onNavigate('analytics')}>
          <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </NavItem>

        <NavItem active={currentPage === 'todo'} expanded={expanded} label="할 일" onClick={() => onNavigate('todo')}>
          <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </NavItem>
      </div>

      {/* Bottom: Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '0 8px 14px', gap: 2 }}>
        <div style={{
          height: '0.5px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
          margin: '0 4px 8px',
        }} />
        <NavItem active={currentPage === 'settings'} expanded={expanded} label="설정" onClick={() => onNavigate('settings')}>
          <svg style={{ width: 15, height: 15 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </NavItem>
      </div>
    </nav>
  );
}
