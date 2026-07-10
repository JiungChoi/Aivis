import { useState, useEffect, useRef, useCallback } from 'react';
import WireframeGlobe from './WireframeGlobe';
import './holo.css';

// ── Waveform bars (canvas) ─────────────────────────────────────

const BAR_COUNT = 24;
const BAR_WIDTH = 4;
const BAR_GAP = 2;
const WAVEFORM_WIDTH = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

interface WaveformProps {
  isRecording: boolean;
  isSpeaking: boolean;
  containerWidth: number;
}

function WaveformBars({ isRecording, isSpeaking, containerWidth }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const isActive = isRecording || isSpeaking;

  const barParams = useRef(
    Array.from({ length: BAR_COUNT }, (_, i) => ({
      speed:     80 + Math.random() * 120,
      phase:     (i / BAR_COUNT) * Math.PI * 2 + Math.random() * Math.PI,
      amplitude: 0.55 + Math.random() * 0.45,
    })),
  );

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!isActive) return;

    const now = Date.now();
    const xStart = (W - WAVEFORM_WIDTH) / 2;

    for (let i = 0; i < BAR_COUNT; i++) {
      const p = barParams.current[i];
      const rawHeight = 4 + (Math.sin(now / p.speed + p.phase) * 0.5 + 0.5) * p.amplitude * 28;
      const barHeight = Math.max(4, rawHeight);
      const x = xStart + i * (BAR_WIDTH + BAR_GAP);
      const y = H - barHeight;

      const grad = ctx.createLinearGradient(x, y, x, H);
      if (isRecording) {
        grad.addColorStop(0, `rgba(255,60,60,0.9)`);
        grad.addColorStop(0.5, `rgba(255,120,60,0.7)`);
        grad.addColorStop(1, `rgba(255,60,60,0.2)`);
      } else {
        // Idle: accent-derived (var(--accent) #5E9EFF family)
        grad.addColorStop(0, `rgba(94,158,255,0.9)`);
        grad.addColorStop(0.5, `rgba(125,177,255,0.7)`);
        grad.addColorStop(1, `rgba(94,158,255,0.12)`);
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, BAR_WIDTH, barHeight, 2);
      ctx.fill();

      // Ambient floor glow, ~50% attenuated
      const glowGrad = ctx.createLinearGradient(x, H - 8, x, H);
      glowGrad.addColorStop(0, isRecording ? 'rgba(255,80,0,0.12)' : 'rgba(94,158,255,0.12)');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(x - 1, H - 8, BAR_WIDTH + 2, 8);
    }

    rafRef.current = requestAnimationFrame(drawFrame);
  }, [isActive, isRecording]);

  useEffect(() => {
    if (isActive) {
      rafRef.current = requestAnimationFrame(drawFrame);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, drawFrame]);

  return (
    <canvas
      ref={canvasRef}
      width={containerWidth}
      height={40}
      style={{
        display: 'block',
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Speech bubble ──────────────────────────────────────────────

function AivisSpeechBubble({ text, sidebarWidth, rightAligned }: {
  text: string; sidebarWidth: number; rightAligned?: boolean;
}) {
  const [displayed, setDisplayed] = useState('');
  // Accent-derived holo palette (var(--accent) / var(--accent-hover))
  const C  = '#5E9EFF';
  const C2 = '#7DB1FF';

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [text]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 410,
      ...(rightAligned ? { right: sidebarWidth + 12 } : { left: sidebarWidth + 12 }),
      zIndex: 60,
      maxWidth: 220,
      padding: '10px 13px',
      background: '#020d18',
      border: `1px solid ${C}60`,
      borderRadius: 10,
      boxShadow: `0 0 20px ${C}18, 0 4px 24px rgba(0,0,0,0.6)`,
      animation: 'bubble-pop-in 0.3s ease forwards',
      pointerEvents: 'none',
    }}>
      {/* Arrow pointing toward hologram */}
      {rightAligned ? (
        <div style={{
          position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)',
          width: 0, height: 0,
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          borderLeft: `8px solid ${C}60`,
        }} />
      ) : (
        <div style={{
          position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
          width: 0, height: 0,
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          borderRight: `8px solid ${C}60`,
        }} />
      )}
      <div style={{ color: C2, fontSize: 10, fontWeight: 700, marginBottom: 4,
        letterSpacing: 1, textShadow: `0 0 8px ${C}80` }}>
        AIVIS
      </div>
      <p style={{ color: '#cfe0ff', fontSize: 11, lineHeight: 1.5, margin: 0 }}>
        {displayed}
        {displayed.length < text.length && <span style={{ color: C, opacity: 0.8 }}>|</span>}
      </p>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────

type HoloJarvisProps = {
  centerX?: number;
  scale?: number;
  bottomOffset?: number;
  sidebarWidth?: number;
  isRecording?: boolean;
  isSpeaking?: boolean;
  /** When true, renders with position:absolute inside parent instead of position:fixed */
  contained?: boolean;
};

export default function HoloJarvis({
  centerX = 28,
  scale = 0.55,
  bottomOffset = 52,
  sidebarWidth = 64,
  isRecording = false,
  isSpeaking = false,
  contained = false,
}: HoloJarvisProps) {
  const [speech, setSpeech] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 250, h: 160 });
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const [waveformWidth, setWaveformWidth] = useState(250);

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail.text;
      setSpeech(text);
      clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => setSpeech(null), 12_000);
    };
    window.addEventListener('aivis:speech', handler);
    return () => { window.removeEventListener('aivis:speech', handler); clearTimeout(dismissTimer); };
  }, []);

  // Track globe container size
  useEffect(() => {
    const el = globeContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      if (entry) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: Math.max(width, 80), h: Math.max(height, 80) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Track waveform width
  useEffect(() => {
    const el = waveformContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setWaveformWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (contained) {
    return (
      <>
        {speech && <AivisSpeechBubble text={speech} sidebarWidth={sidebarWidth} rightAligned />}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', pointerEvents: 'none',
        }}>
          {/* Globe area — fills available space */}
          <div
            ref={globeContainerRef}
            style={{ flex: 1, width: '100%', overflow: 'hidden' }}
          >
            <WireframeGlobe
              w={containerSize.w}
              h={containerSize.h}
              isRecording={isRecording}
              isSpeaking={isSpeaking}
            />
          </div>

          {/* Waveform area */}
          <div
            ref={waveformContainerRef}
            style={{
              width: '100%', height: 44, flexShrink: 0,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <WaveformBars isRecording={isRecording} isSpeaking={isSpeaking} containerWidth={waveformWidth} />
          </div>
        </div>
      </>
    );
  }

  // Default: fixed positioning (used by NavBar globe)
  const DW = 320 * scale;
  const DH = 320 * scale;

  return (
    <>
      {speech && <AivisSpeechBubble text={speech} sidebarWidth={sidebarWidth} />}
      <div style={{
        position: 'fixed',
        bottom: bottomOffset,
        left: centerX,
        transform: 'translateX(-50%)',
        width: DW,
        height: DH + 44,
        pointerEvents: 'none',
        zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ width: DW, height: DH, flexShrink: 0, overflow: 'hidden' }}>
          <WireframeGlobe
            w={DW}
            h={DH}
            isRecording={isRecording}
            isSpeaking={isSpeaking}
          />
        </div>
        <div
          ref={waveformContainerRef}
          style={{
            width: '100%', height: 44, flexShrink: 0,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <WaveformBars isRecording={isRecording} isSpeaking={isSpeaking} containerWidth={DW} />
        </div>
      </div>
    </>
  );
}
