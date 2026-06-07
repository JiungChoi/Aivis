import { useState, useEffect, useRef, useCallback } from 'react';
import type { CharacterDef } from './CharacterConfig';

type CharState = 'idle' | 'walking' | 'waving' | 'thinking' | 'talking';

// ── High-resolution character SVGs (viewBox 0 0 60 96) ─────────

interface PoseProps {
  primary: string; hair: string; skin: string;
  state: CharState; walkFrame: 0 | 1;
  uid: string; // for gradient ID namespacing
}

function MaleChar({ primary, hair, skin, state, uid }: PoseProps) {
  // Head-only floating orb — no body/arms/legs. State drives subtle accents only.
  const s = `${uid}-m`;
  const core = skin;
  const active = state === 'waving' || state === 'talking';

  return (
    <svg viewBox="0 0 72 72" width="72" height="72" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${s}-orb`} cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor={core}    stopOpacity="0.95" />
          <stop offset="30%"  stopColor={primary} stopOpacity="0.85" />
          <stop offset="70%"  stopColor={primary} stopOpacity="0.45" />
          <stop offset="100%" stopColor={primary} stopOpacity="0.04" />
        </radialGradient>
        <radialGradient id={`${s}-halo`} cx="50%" cy="50%">
          <stop offset="0%"   stopColor={primary} stopOpacity="0.24" />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer ambient halo */}
      <circle cx="36" cy="36" r="34" fill={`url(#${s}-halo)`} />

      {/* Orb head (larger, square male framing ring) */}
      <circle cx="36" cy="36" r="30" fill={primary} fillOpacity="0.05" />
      <circle cx="36" cy="36" r="23" fill={`url(#${s}-orb)`} />
      <circle cx="36" cy="36" r="23" fill="none" stroke={primary} strokeWidth="1.4" strokeOpacity={active ? 0.8 : 0.55} />
      <circle cx="36" cy="36" r="15" fill={primary} fillOpacity="0.2" />
      <circle cx="36" cy="36" r="9"  fill={core}    fillOpacity="0.28" />
      <circle cx="36" cy="36" r="4.5" fill={core}   fillOpacity="0.6" />
      <circle cx="36" cy="36" r="2"   fill={core}   fillOpacity="0.95" />
      <ellipse cx="27" cy="27" rx="6" ry="4" fill={core} fillOpacity="0.42" transform="rotate(-25,27,27)" />

      {/* Floating particles */}
      <circle cx="10" cy="14" r="1.8" fill={hair} fillOpacity="0.65">
        <animate attributeName="cy" values="14;8;14" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.65;0.1;0.65" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="62" cy="18" r="1.4" fill={primary} fillOpacity="0.6">
        <animate attributeName="cy" values="18;11;18" dur="2.0s" repeatCount="indefinite" begin="0.6s" />
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.0s" repeatCount="indefinite" begin="0.6s" />
      </circle>
      <circle cx="8" cy="44" r="1.2" fill={hair} fillOpacity="0.5">
        <animate attributeName="cx" values="8;3;8" dur="2.8s" repeatCount="indefinite" begin="1.2s" />
        <animate attributeName="opacity" values="0.5;0.08;0.5" dur="2.8s" repeatCount="indefinite" begin="1.2s" />
      </circle>
      <circle cx="64" cy="48" r="1.5" fill={primary} fillOpacity="0.55">
        <animate attributeName="cy" values="48;41;48" dur="2.2s" repeatCount="indefinite" begin="0.4s" />
        <animate attributeName="opacity" values="0.55;0.1;0.55" dur="2.2s" repeatCount="indefinite" begin="0.4s" />
      </circle>
    </svg>
  );
}

function FemaleChar({ primary, hair, skin, state, uid }: PoseProps) {
  // Head-only floating orb — feminine accent (softer, extra particle). No body.
  const s = `${uid}-f`;
  const core = skin;
  const active = state === 'waving' || state === 'talking';

  return (
    <svg viewBox="0 0 72 72" width="72" height="72" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`${s}-orb`} cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor={core}    stopOpacity="0.95" />
          <stop offset="30%"  stopColor={primary} stopOpacity="0.85" />
          <stop offset="70%"  stopColor={primary} stopOpacity="0.45" />
          <stop offset="100%" stopColor={primary} stopOpacity="0.04" />
        </radialGradient>
        <radialGradient id={`${s}-halo`} cx="50%" cy="50%">
          <stop offset="0%"   stopColor={primary} stopOpacity="0.24" />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer ambient halo */}
      <circle cx="36" cy="36" r="34" fill={`url(#${s}-halo)`} />

      {/* Orb head (slightly smaller + thinner ring = feminine) */}
      <circle cx="36" cy="36" r="29" fill={primary} fillOpacity="0.05" />
      <circle cx="36" cy="36" r="21" fill={`url(#${s}-orb)`} />
      <circle cx="36" cy="36" r="21" fill="none" stroke={primary} strokeWidth="1" strokeOpacity={active ? 0.78 : 0.55} />
      <circle cx="36" cy="36" r="14" fill={primary} fillOpacity="0.2" />
      <circle cx="36" cy="36" r="8.5" fill={core}   fillOpacity="0.28" />
      <circle cx="36" cy="36" r="4.2" fill={core}   fillOpacity="0.6" />
      <circle cx="36" cy="36" r="1.9" fill={core}   fillOpacity="0.95" />
      <ellipse cx="28" cy="28" rx="5.5" ry="3.6" fill={core} fillOpacity="0.42" transform="rotate(-25,28,28)" />

      {/* Floating particles (5 — slightly more ethereal) */}
      <circle cx="12" cy="12" r="1.6" fill={primary} fillOpacity="0.65">
        <animate attributeName="cy" values="12;6;12" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.65;0.1;0.65" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="16" r="1.3" fill={hair} fillOpacity="0.6">
        <animate attributeName="cy" values="16;9;16" dur="2.1s" repeatCount="indefinite" begin="0.7s" />
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.1s" repeatCount="indefinite" begin="0.7s" />
      </circle>
      <circle cx="8" cy="42" r="1.1" fill={hair} fillOpacity="0.5">
        <animate attributeName="cx" values="8;3;8" dur="3.0s" repeatCount="indefinite" begin="1.4s" />
        <animate attributeName="opacity" values="0.5;0.06;0.5" dur="3.0s" repeatCount="indefinite" begin="1.4s" />
      </circle>
      <circle cx="64" cy="46" r="1.4" fill={primary} fillOpacity="0.5">
        <animate attributeName="cy" values="46;39;46" dur="2.3s" repeatCount="indefinite" begin="0.5s" />
        <animate attributeName="opacity" values="0.5;0.08;0.5" dur="2.3s" repeatCount="indefinite" begin="0.5s" />
      </circle>
      <circle cx="36" cy="6" r="1.2" fill={primary} fillOpacity="0.55">
        <animate attributeName="cy" values="6;0;6" dur="1.9s" repeatCount="indefinite" begin="0.9s" />
        <animate attributeName="opacity" values="0.55;0.08;0.55" dur="1.9s" repeatCount="indefinite" begin="0.9s" />
      </circle>
    </svg>
  );
}

// ── Speech bubble ─────────────────────────────────────────────

function SpeechBubble({
  text, accentColor, onDismiss,
}: { text: string; accentColor: string; onDismiss: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [out, setOut] = useState(false);

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [text]);

  function dismiss() { setOut(true); setTimeout(onDismiss, 250); }

  return (
    <div style={{
      animation: out ? 'bubble-pop-out 0.25s ease forwards' : 'bubble-pop-in 0.3s ease forwards',
      background: 'rgba(8, 16, 36, 0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: `1px solid ${accentColor}55`,
      borderRadius: 12,
      padding: '9px 12px',
      maxWidth: 210,
      minWidth: 150,
      position: 'relative',
      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${accentColor}18`,
      pointerEvents: 'auto',
    }}>
      <button onClick={dismiss} style={{
        position: 'absolute', top: 5, right: 8,
        background: 'none', border: 'none', color: '#4a5568',
        cursor: 'pointer', fontSize: 10, padding: 0,
      }}>✕</button>
      <p style={{ color: '#e2e8f0', fontSize: 11, lineHeight: 1.6, margin: 0, paddingRight: 14 }}>
        {displayed}
        {displayed.length < text.length && <span style={{ color: accentColor }}>|</span>}
      </p>
      <div style={{
        position: 'absolute', bottom: -8, left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: `8px solid ${accentColor}55`,
      }} />
    </div>
  );
}

// ── Compact always-on bubble ──────────────────────────────────

function IdleBubble({ name, role, stateLabel, accentColor }: {
  name: string; role: string; stateLabel: string | null; accentColor: string;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      animation: 'bubble-pop-in 0.3s ease forwards',
      marginBottom: 6,
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(6, 12, 28, 0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${accentColor}45`,
        borderRadius: 10,
        padding: '5px 10px',
        whiteSpace: 'nowrap',
        boxShadow: `0 4px 16px rgba(0,0,0,0.45), 0 0 0 1px ${accentColor}10`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: accentColor,
            animation: 'char-glow-pulse 2s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{ color: accentColor, fontSize: 10, fontWeight: 700 }}>{name}</span>
          <span style={{ color: '#374151', fontSize: 9 }}>·</span>
          <span style={{ color: '#6b7280', fontSize: 9 }}>{stateLabel ?? role}</span>
        </div>
      </div>
      <div style={{
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: `5px solid ${accentColor}45`,
      }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export interface FloatingCharacterProps {
  character: CharacterDef;
  suggestion: string | null;
  onDismissSuggestion: () => void;
  zone: { minX: number; maxX: number; minY: number; maxY: number };
}

export default function FloatingCharacter({
  character, suggestion, onDismissSuggestion, zone,
}: FloatingCharacterProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const svgFlipRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: zone.minX + Math.random() * (zone.maxX - zone.minX), y: zone.minY + Math.random() * (zone.maxY - zone.minY) });
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const wanderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPausedRef = useRef(false);
  const zoneRef = useRef(zone);

  zoneRef.current = zone;

  const [charState, setCharState] = useState<CharState>('idle');
  const [walkFrame, setWalkFrame] = useState<0 | 1>(0);
  const [hovered, setHovered] = useState(false);

  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { primaryColor, accentColor, glowColor, hairColor, skinColor, gender, name, role, id } = character;

  function setPosition(x: number, y: number, animated: boolean) {
    posRef.current = { x, y };
    if (elRef.current) {
      elRef.current.style.left = x + 'px';
      elRef.current.style.top = y + 'px';
      elRef.current.style.transition = animated
        ? 'left 8s ease-in-out, top 8s ease-in-out'
        : 'none';
    }
    if (svgFlipRef.current) {
      const facingLeft = x + 36 > window.innerWidth / 2;
      svgFlipRef.current.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }

  const scheduleNextWander = useCallback(() => {
    if (wanderTimerRef.current) clearTimeout(wanderTimerRef.current);
    const delay = 15000 + Math.random() * 10000;
    wanderTimerRef.current = setTimeout(() => {
      if (!isPausedRef.current) {
        const z = zoneRef.current;
        const newX = z.minX + Math.random() * (z.maxX - z.minX);
        const newY = z.minY + Math.random() * (z.maxY - z.minY);
        setPosition(newX, newY, true);
        setCharState('walking');
        setTimeout(() => setCharState(cur => cur === 'walking' ? 'idle' : cur), 9000);
      }
      scheduleNextWander();
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { x, y } = posRef.current;
    if (elRef.current) {
      elRef.current.style.left = x + 'px';
      elRef.current.style.top = y + 'px';
      elRef.current.style.transition = 'none';
    }
    if (svgFlipRef.current) {
      const facingLeft = x + 36 > window.innerWidth / 2;
      svgFlipRef.current.style.transform = facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
    }
    scheduleNextWander();
    return () => { if (wanderTimerRef.current) clearTimeout(wanderTimerRef.current); };
  }, [scheduleNextWander]);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    isDraggingRef.current = true;
    isPausedRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    if (elRef.current) elRef.current.style.cursor = 'grabbing';
    setPosition(posRef.current.x, posRef.current.y, false);

    function onMove(ev: MouseEvent) {
      if (!isDraggingRef.current) return;
      setPosition(ev.clientX - dragOffsetRef.current.x, ev.clientY - dragOffsetRef.current.y, false);
    }
    function onUp() {
      isDraggingRef.current = false;
      if (elRef.current) elRef.current.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setTimeout(() => { isPausedRef.current = false; }, 3000);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  useEffect(() => {
    if (charState !== 'walking') { setWalkFrame(0); return; }
    const id = setInterval(() => setWalkFrame(f => f === 0 ? 1 : 0), 280);
    return () => clearInterval(id);
  }, [charState]);

  useEffect(() => {
    if (suggestion) {
      setCharState('talking');
    } else if (charState === 'talking') {
      setCharState('idle');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion]);

  const scheduleAction = useCallback(() => {
    const delay = 18_000 + Math.random() * 22_000;
    actionTimerRef.current = setTimeout(() => {
      setCharState(cur => {
        if (cur === 'idle') {
          const next: CharState = Math.random() > 0.5 ? 'waving' : 'thinking';
          setTimeout(() => {
            setCharState(c => c === next ? 'idle' : c);
            scheduleAction();
          }, 2_800);
          return next;
        }
        scheduleAction();
        return cur;
      });
    }, delay);
  }, []);

  useEffect(() => {
    scheduleAction();
    return () => { if (actionTimerRef.current) clearTimeout(actionTimerRef.current); };
  }, [scheduleAction]);

  const bodyAnimation = (() => {
    switch (charState) {
      case 'walking':  return 'char-walk-bounce 0.56s ease-in-out infinite';
      case 'waving':   return 'char-bob 1.2s ease-in-out infinite';
      case 'thinking': return 'char-think-sway 2s ease-in-out infinite';
      case 'talking':  return 'char-talk-head 0.5s ease-in-out infinite';
      default:         return 'char-bob 3s ease-in-out infinite';
    }
  })();

  const stateLabel = charState === 'walking' ? '이동 중'
    : charState === 'waving' ? '인사'
    : charState === 'thinking' ? '생각 중'
    : charState === 'talking' ? '대화 중' : null;

  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Speech bubble (suggestion) or persistent idle bubble */}
      {suggestion
        ? (
          <div style={{ marginBottom: 8, pointerEvents: 'auto' }}>
            <SpeechBubble text={suggestion} accentColor={accentColor} onDismiss={onDismissSuggestion} />
          </div>
        )
        : (
          <IdleBubble name={name} role={role} stateLabel={stateLabel} accentColor={accentColor} />
        )
      }

      {/* Animation + interaction wrapper */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onMouseDown}
        style={{
          animation: bodyAnimation,
          cursor: 'grab',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Glow halo */}
          <div style={{
            position: 'absolute',
            width: hovered ? 90 : 74,
            height: hovered ? 90 : 74,
            borderRadius: '50%',
            background: glowColor,
            filter: `blur(${hovered ? 18 : 12}px)`,
            animation: 'char-glow-pulse 2.5s ease-in-out infinite',
            transform: 'translateY(16px)',
            opacity: hovered ? 1 : 0.55,
            transition: 'all 0.35s ease',
            zIndex: 0,
          }} />

          {/* Character SVG — floating head only (no body, no ground shadow) */}
          <div ref={svgFlipRef} style={{ position: 'relative', zIndex: 1, transition: 'transform 0.6s ease' }}>
            {gender === 'male'
              ? <MaleChar   primary={primaryColor} hair={hairColor} skin={skinColor} state={charState} walkFrame={walkFrame} uid={id} />
              : <FemaleChar primary={primaryColor} hair={hairColor} skin={skinColor} state={charState} walkFrame={walkFrame} uid={id} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Static preview (for settings UI) ─────────────────────────

export interface CharacterPreviewProps {
  gender: 'male' | 'female';
  primaryColor: string;
  hairColor: string;
  skinColor: string;
  glowColor?: string;
  uid?: string;
  scale?: number;
}

export function CharacterPreview({
  gender, primaryColor, hairColor, skinColor, glowColor, uid = 'preview', scale = 1,
}: CharacterPreviewProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      transform: `scale(${scale})`, transformOrigin: 'top center',
    }}>
      <div style={{ position: 'relative' }}>
        {glowColor && (
          <div style={{
            position: 'absolute', width: 70, height: 70, borderRadius: '50%',
            background: glowColor, filter: 'blur(14px)',
            top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            opacity: 0.6, animation: 'char-glow-pulse 2.5s ease-in-out infinite',
          }} />
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {gender === 'male'
            ? <MaleChar primary={primaryColor} hair={hairColor} skin={skinColor} state="idle" walkFrame={0} uid={uid} />
            : <FemaleChar primary={primaryColor} hair={hairColor} skin={skinColor} state="idle" walkFrame={0} uid={uid} />}
        </div>
      </div>
    </div>
  );
}
