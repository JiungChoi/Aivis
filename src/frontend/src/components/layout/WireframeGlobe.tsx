import { useEffect, useRef } from 'react';

// ── Wireframe Globe (canvas) ───────────────────────────────────

export default function WireframeGlobe({ w, h, isRecording, isSpeaking }: {
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
    let hudRot = 0;   // outer HUD ring rotation (clockwise)
    let hudRot2 = 0;  // counter-rotating bracket ring

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
      hudRot += isSpeaking ? 0.012 : 0.006;
      hudRot2 -= isSpeaking ? 0.009 : 0.004;

      const pulse = 1 + (isRecording ? 0.04 : 0.018) * Math.sin(t * (isRecording ? 3.5 : 1.8));
      const r = BASE_R * pulse;

      // Idle colours accent-derived (var(--accent) #5E9EFF / var(--accent-hover) #7DB1FF)
      const mc: [number, number, number] = isRecording ? [255, 60, 40] : [94, 158, 255];
      const gc: [number, number, number] = isRecording ? [255, 140, 80] : [125, 177, 255];

      // Ambient outer glow (~50% attenuated)
      const og = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.9);
      og.addColorStop(0, `rgba(${mc[0]},${mc[1]},${mc[2]},0.045)`);
      og.addColorStop(0.45, `rgba(${mc[0]},${mc[1]},${mc[2]},0.02)`);
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

      // ── J.A.R.V.I.S. HUD overlay (screen-space, concentric holo rings) ──
      const strokeMC = (a: number) => `rgba(${mc[0]},${mc[1]},${mc[2]},${a.toFixed(3)})`;
      const strokeGC = (a: number) => `rgba(${gc[0]},${gc[1]},${gc[2]},${a.toFixed(3)})`;
      // Largest radius that still fits inside the canvas (keeps HUD from clipping)
      const lim = Math.min(cx, cy) - 4;

      // Outer segmented ring — rotating clockwise, dashed arc blocks
      const ringR = Math.max(r * 1.12, lim * 0.74);
      const segCount = 16;
      for (let i = 0; i < segCount; i++) {
        const a0 = hudRot + (i / segCount) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2 / segCount) * 0.62; // gap between segments
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, a0, a1);
        ctx.strokeStyle = strokeMC(i % 4 === 0 ? 0.55 : 0.22);
        ctx.lineWidth = i % 4 === 0 ? 2 : 1;
        ctx.stroke();
      }

      // Tick-mark ring — fixed radial graduations
      const tickR = lim * 0.84;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const major = i % 5 === 0;
        const len = major ? 7 : 3;
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(cx + ca * tickR, cy + sa * tickR);
        ctx.lineTo(cx + ca * (tickR + len), cy + sa * (tickR + len));
        ctx.strokeStyle = strokeMC(major ? 0.4 : 0.16);
        ctx.lineWidth = major ? 1.4 : 0.8;
        ctx.stroke();
      }

      // Counter-rotating quarter-arc brackets
      const brR = lim * 0.93;
      for (let i = 0; i < 4; i++) {
        const a0 = hudRot2 + i * (Math.PI / 2) + 0.18;
        const a1 = a0 + Math.PI / 2 - 0.36;
        ctx.beginPath();
        ctx.arc(cx, cy, brR, a0, a1);
        ctx.strokeStyle = strokeGC(0.45);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        // end caps
        [a0, a1].forEach(ea => {
          const ca = Math.cos(ea), sa = Math.sin(ea);
          ctx.beginPath();
          ctx.moveTo(cx + ca * (brR - 4), cy + sa * (brR - 4));
          ctx.lineTo(cx + ca * (brR + 4), cy + sa * (brR + 4));
          ctx.strokeStyle = strokeGC(0.5);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        });
      }

      // Thin inner halo ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.06, 0, Math.PI * 2);
      ctx.strokeStyle = strokeMC(0.18);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Corner reticle brackets (HUD frame)
      const frame = lim * 0.99;
      const corner = lim * 0.30;
      ctx.strokeStyle = strokeGC(0.3);
      ctx.lineWidth = 1.2;
      ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).forEach(([sx, sy]) => {
        const px = cx + sx * frame, py = cy + sy * frame;
        ctx.beginPath();
        ctx.moveTo(px - sx * corner, py);
        ctx.lineTo(px, py);
        ctx.lineTo(px, py - sy * corner);
        ctx.stroke();
      });

      // ── Arc-reactor core ──
      const reactorPulse = 0.7 + 0.3 * Math.sin(t * (isRecording ? 5 : 2.4));
      // segmented reactor ring (triangular wedges)
      const reactorR = r * 0.26;
      const wedges = 8;
      for (let i = 0; i < wedges; i++) {
        const a0 = -hudRot * 1.5 + (i / wedges) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2 / wedges) * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, reactorR, a0, a1);
        ctx.closePath();
        ctx.fillStyle = strokeGC(0.10 * reactorPulse);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, reactorR, 0, Math.PI * 2);
      ctx.strokeStyle = strokeGC(0.55 * reactorPulse);
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Core glow (reactor center, ~50% attenuated)
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.42);
      cg.addColorStop(0, strokeGC(0.28 * reactorPulse));
      cg.addColorStop(0.3, strokeGC(0.11 * reactorPulse));
      cg.addColorStop(0.6, strokeMC(0.05));
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();
      // hot center dot
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.05 * reactorPulse + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(0.7 * reactorPulse).toFixed(3)})`;
      ctx.fill();

      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [w, h, isRecording, isSpeaking]);

  return <canvas ref={canvasRef} width={w} height={h} style={{ display: 'block' }} />;
}
