import { useState, useEffect, useRef, useCallback } from 'react';

// ── Wireframe Globe (canvas) ───────────────────────────────────

function WireframeGlobe({ w, h, isRecording, isSpeaking }: {
  w: number; h: number; isRecording: boolean; isSpeaking: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const cx = w / 2;
    const cy = h / 2;
    const BASE_R = Math.min(w, h) * 0.36;
    const TILT_X = 0.32;
    const LAT = 9;
    const LON = 12;
    const SEGS = 72;

    let rotY = 0;
    let rafId: number;
    let t = 0;

    // Floating orbit particles
    const orbits = Array.from({ length: 6 }, (_, i) => ({
      theta: (i / 6) * Math.PI * 2,
      phi: Math.PI * (0.25 + (i % 3) * 0.25),
      speed: 0.007 + (i % 3) * 0.005,
      orbitR: BASE_R * (1.08 + (i % 2) * 0.18),
      size: 1.4 + (i % 3) * 0.6,
    }));

    function rotYFn(x: number, y: number, z: number): [number, number, number] {
      const c = Math.cos(rotY); const s = Math.sin(rotY);
      return [x * c + z * s, y, -x * s + z * c];
    }
    function rotXFn(x: number, y: number, z: number): [number, number, number] {
      const c = Math.cos(TILT_X); const s = Math.sin(TILT_X);
      return [x, y * c - z * s, y * s + z * c];
    }
    function xform(x0: number, y0: number, z0: number): [number, number, number] {
      const [x1, y1, z1] = rotYFn(x0, y0, z0);
      return rotXFn(x1, y1, z1);
    }
    function proj(rx: number, ry: number): [number, number] {
      return [cx + rx, cy - ry];
    }

    function drawCircleSegs(
      pts3D: Array<[number, number, number]>,
      r: number,
      brightAlpha: number,
      dimAlpha: number,
      lw: number,
      mc: [number, number, number],
    ) {
      for (let s = 0; s < pts3D.length - 1; s++) {
        const [rx0, ry0, rz0] = xform(...pts3D[s]);
        const [rx1, ry1, rz1] = xform(...pts3D[s + 1]);
        const avgZ = (rz0 + rz1) / 2;
        const depth = (avgZ / r + 1) / 2; // 0=back, 1=front
        const alpha = dimAlpha + (brightAlpha - dimAlpha) * depth;
        if (alpha < 0.006) continue;
        const [px0, py0] = proj(rx0, ry0);
        const [px1, py1] = proj(rx1, ry1);
        ctx.beginPath();
        ctx.moveTo(px0, py0);
        ctx.lineTo(px1, py1);
        ctx.strokeStyle = `rgba(${mc[0]},${mc[1]},${mc[2]},${alpha.toFixed(3)})`;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      t += 0.005;
      rotY += isSpeaking ? 0.006 : 0.003;

      const pulse = 1 + (isRecording ? 0.04 : 0.018) * Math.sin(t * (isRecording ? 3.5 : 1.8));
      const r = BASE_R * pulse;

      const mc: [number, number, number] = isRecording ? [255, 60, 40] : [10, 132, 255];
      const gc: [number, number, number] = isRecording ? [255, 140, 80] : [80, 200, 255];

      // Ambient outer glow
      const og = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.9);
      og.addColorStop(0, `rgba(${mc[0]},${mc[1]},${mc[2]},0.09)`);
      og.addColorStop(0.45, `rgba(${mc[0]},${mc[1]},${mc[2]},0.04)`);
      og.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
      ctx.fillStyle = og; ctx.fill();

      // Latitude lines
      for (let i = 0; i <= LAT; i++) {
        const lat = -Math.PI / 2 + (i / LAT) * Math.PI;
        const latR = r * Math.cos(lat);
        const latY = r * Math.sin(lat);
        const isEq = i === Math.floor(LAT / 2);
        const pts: Array<[number, number, number]> = Array.from({ length: SEGS + 1 }, (_, j) => {
          const lon = (j / SEGS) * Math.PI * 2;
          return [latR * Math.cos(lon), latY, latR * Math.sin(lon)];
        });
        drawCircleSegs(pts, r, isEq ? 0.72 : 0.38, isEq ? 0.14 : 0.06, isEq ? 1.1 : 0.65, mc);
      }

      // Longitude lines
      for (let i = 0; i < LON; i++) {
        const lon = (i / LON) * Math.PI * 2;
        const isPrime = i === 0;
        const pts: Array<[number, number, number]> = Array.from({ length: SEGS + 1 }, (_, j) => {
          const lat = -Math.PI / 2 + (j / SEGS) * Math.PI;
          const lr = r * Math.cos(lat);
          return [lr * Math.cos(lon), r * Math.sin(lat), lr * Math.sin(lon)];
        });
        drawCircleSegs(pts, r, isPrime ? 0.65 : 0.32, isPrime ? 0.10 : 0.05, isPrime ? 0.9 : 0.58, mc);
      }

      // Grid intersection glow dots (front hemisphere only)
      for (let i = 0; i <= LAT; i++) {
        for (let j = 0; j < LON; j++) {
          const lat = -Math.PI / 2 + (i / LAT) * Math.PI;
          const lon = (j / LON) * Math.PI * 2;
          const lr = r * Math.cos(lat);
          const [rx, ry, rz] = xform(lr * Math.cos(lon), r * Math.sin(lat), lr * Math.sin(lon));
          if (rz < r * 0.05) continue;
          const depth = rz / r;
          const [px, py] = proj(rx, ry);
          ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${gc[0]},${gc[1]},${gc[2]},${(depth * 0.88).toFixed(3)})`;
          ctx.fill();
        }
      }

      // Orbit particles
      for (const orb of orbits) {
        orb.theta += orb.speed;
        const ox = orb.orbitR * Math.sin(orb.phi) * Math.cos(orb.theta);
        const oy = orb.orbitR * Math.cos(orb.phi);
        const oz = orb.orbitR * Math.sin(orb.phi) * Math.sin(orb.theta);
        const [rx, ry, rz] = xform(ox, oy, oz);
        const depth = (rz / orb.orbitR + 1) / 2;
        const [px, py] = proj(rx, ry);
        const grd = ctx.createRadialGradient(px, py, 0, px, py, orb.size * 5);
        grd.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},${(depth * 0.85).toFixed(3)})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(px, py, orb.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, orb.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${gc[0]},${gc[1]},${gc[2]},${depth.toFixed(3)})`;
        ctx.fill();
      }

      // Core glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.38);
      cg.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},0.22)`);
      cg.addColorStop(0.55, `rgba(${mc[0]},${mc[1]},${mc[2]},0.10)`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [w, h, isRecording, isSpeaking]);

  return <canvas ref={canvasRef} width={w} height={h} style={{ display: 'block' }} />;
}

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
        grad.addColorStop(0, `rgba(6,182,212,0.95)`);
        grad.addColorStop(0.5, `rgba(59,130,246,0.75)`);
        grad.addColorStop(1, `rgba(6,182,212,0.15)`);
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, BAR_WIDTH, barHeight, 2);
      ctx.fill();

      const glowGrad = ctx.createLinearGradient(x, H - 8, x, H);
      glowGrad.addColorStop(0, isRecording ? 'rgba(255,80,0,0.25)' : 'rgba(6,182,212,0.25)');
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
  const C  = '#00cfff';
  const C2 = '#4af4ff';

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
      boxShadow: `0 0 20px ${C}30, 0 4px 24px rgba(0,0,0,0.6)`,
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
        letterSpacing: 1, textShadow: `0 0 8px ${C}` }}>
        AIVIS
      </div>
      <p style={{ color: '#c0f0ff', fontSize: 11, lineHeight: 1.5, margin: 0 }}>
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
