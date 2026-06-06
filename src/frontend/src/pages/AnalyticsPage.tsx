import { useState, useEffect, useRef } from 'react';
import { knowledgeService, type KnowledgeBranch, type KnowledgeNode } from '../services/knowledgeService';

// ── Math helpers ──────────────────────────────────────────────────────────────

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Convert angle (0 = right, clockwise) to x,y offset
function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

// Curved bezier path that arcs slightly outward from center
function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  // Control point: midpoint pushed toward the midpoint between (x1,y1) and (x2,y2)
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Push control point slightly away from the midpoint center (0,0 relative to svg center)
  const cx = mx * 1.05;
  const cy = my * 1.05;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

// ── Sub-node spread layout ────────────────────────────────────────────────────

interface SubNodePosition {
  node: KnowledgeNode;
  x: number;
  y: number;
}

function computeSubNodePositions(
  branch: KnowledgeBranch,
  branchX: number,
  branchY: number,
  branchAngleDeg: number,
  subDistance: number,
): SubNodePosition[] {
  const count = branch.nodes.length;
  if (count === 0) return [];

  // Wide enough spread so nodes don't overlap (each needs ~60px clearance at subDistance)
  const spreadDeg = count <= 1 ? 0 : count <= 2 ? 55 : count <= 3 ? 90 : count <= 4 ? 120 : 150;
  return branch.nodes.map((node, i) => {
    const frac = count === 1 ? 0 : i / (count - 1) - 0.5;
    const angleDeg = branchAngleDeg + frac * spreadDeg;
    const rad = degToRad(angleDeg);
    return {
      node,
      x: branchX + Math.cos(rad) * subDistance,
      y: branchY + Math.sin(rad) * subDistance,
    };
  });
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
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

// ── Detail card (absolute positioned) ────────────────────────────────────────

interface SelectedItem {
  type: 'branch' | 'node';
  branch: KnowledgeBranch;
  node?: KnowledgeNode;
}

function DetailCard({
  item,
  onClose,
}: {
  item: SelectedItem;
  onClose: () => void;
}) {
  const color = item.branch.color;
  const title = item.node ? item.node.label : item.branch.label;
  const sublabel = item.node?.sublabel;
  const nodeCount = item.branch.nodes.length;

  return (
    <div style={{
      position: 'absolute',
      right: 20,
      top: 60,
      background: 'rgba(14,14,16,0.97)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '18px 20px',
      width: 240,
      zIndex: 30,
      boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), 0 0 40px ${color}12`,
    }}>
      {/* Header accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 20, right: 20, height: 2,
        background: `linear-gradient(90deg, ${color}, ${item.branch.gradientEnd})`,
        borderRadius: '0 0 2px 2px',
        opacity: 0.8,
      }} />

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 20, height: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          color: 'rgba(235,235,245,0.35)',
          fontSize: 10,
          transition: 'background 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.7)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLElement).style.color = 'rgba(235,235,245,0.35)';
        }}
      >x</button>

      {/* Branch label */}
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color,
        marginBottom: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: 0.85,
      }}>{item.branch.label}</div>

      {/* Title */}
      <div style={{
        color: 'rgba(235,235,245,0.92)',
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.35,
        marginBottom: sublabel ? 6 : 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '-0.01em',
      }}>{title}</div>

      {/* Sublabel */}
      {sublabel && (
        <div style={{
          color: 'rgba(235,235,245,0.35)',
          fontSize: 11,
          marginBottom: 14,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>{sublabel}</div>
      )}

      {/* Separator */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {item.node && (
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            padding: '8px 10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              color,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>{Math.round(item.node.weight * 100)}%</div>
            <div style={{
              color: 'rgba(235,235,245,0.2)',
              fontSize: 9,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              marginTop: 2,
            }}>역량 수준</div>
          </div>
        )}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          padding: '8px 10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            color: item.branch.color,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>{nodeCount}</div>
          <div style={{
            color: 'rgba(235,235,245,0.2)',
            fontSize: 9,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            marginTop: 2,
          }}>연결 노드</div>
        </div>
      </div>
    </div>
  );
}

// ── CSS animations injected via style tag ─────────────────────────────────────

const ANIMATION_CSS = `
@keyframes analytics-dash {
  to { stroke-dashoffset: -20; }
}
@keyframes analytics-dash-dim {
  to { stroke-dashoffset: -14; }
}
@keyframes analytics-pulse-ring {
  0%   { r: 62; stroke-opacity: 0.22; }
  50%  { r: 76; stroke-opacity: 0.06; }
  100% { r: 62; stroke-opacity: 0.22; }
}
@keyframes analytics-spin {
  to { transform: rotate(360deg); }
}
`;

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [graph, setGraph] = useState(() => knowledgeService.getGraph());
  const branches = graph.branches;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });

  // Load dynamic data (real memories/notes) merged into static graph
  useEffect(() => {
    knowledgeService.getGraphWithDynamicData().then(setGraph).catch(() => {});
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const cx = size.w / 2;
  const cy = size.h / 2;

  // Layout constants — scale with the smaller dimension
  const baseRadius = Math.min(size.w, size.h);
  const branchDistance = baseRadius * 0.30;
  const subDistance = baseRadius * 0.54;

  // Compute branch and sub-node positions
  const branchPositions = branches.map((branch) => {
    const { x, y } = polarToXY(branch.angle, branchDistance);
    return { branch, x: cx + x, y: cy + y };
  });

  const totalNodes = branches.reduce((acc, b) => acc + b.nodes.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000000' }}>

      {/* Inject keyframe animations */}
      <style>{ANIMATION_CSS}</style>

      {/* ── Header ── */}
      <div style={{
        height: 56,
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#000000',
      }}>
        <div>
          <div style={{
            color: 'white',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '-0.02em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            당신의 지식을 연결합니다
          </div>
          <div style={{
            color: 'rgba(235,235,245,0.28)',
            fontSize: 11,
            marginTop: 2,
            letterSpacing: '0.01em',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            AIVIS가 학습한 당신의 지식 네트워크
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatChip label="총 노드" value={totalNodes} color="#0a84ff" />
          <StatChip label="브랜치" value={branches.length} color="#8b5cf6" />
          <StatChip label="지식 영역" value={6} color="#06b6d4" />
        </div>
      </div>

      {/* ── SVG canvas ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
        onClick={() => setSelectedItem(null)}
      >
        {size.w > 0 && (
          <svg
            width="100%"
            height="100%"
            style={{ display: 'block' }}
          >
            <defs>
              {/* ── Background radial gradient ── */}
              <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(10,132,255,0.04)" />
                <stop offset="70%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>

              {/* ── Center node radial gradient ── */}
              <radialGradient id="center-radial" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="rgba(10,132,255,0.92)" />
                <stop offset="60%" stopColor="rgba(6,182,212,0.55)" />
                <stop offset="100%" stopColor="rgba(6,182,212,0.18)" />
              </radialGradient>

              {/* ── Per-branch linear gradients ── */}
              {branches.map((b) => (
                <linearGradient
                  key={`grad-${b.id}`}
                  id={`grad-${b.id}`}
                  x1="0%" y1="0%" x2="100%" y2="100%"
                >
                  <stop offset="0%" stopColor={b.color} />
                  <stop offset="100%" stopColor={b.gradientEnd} />
                </linearGradient>
              ))}

              {/* ── Per-branch glow filters (strong) ── */}
              {branches.map((b) => (
                <filter
                  key={`glow-strong-${b.id}`}
                  id={`glow-strong-${b.id}`}
                  x="-60%" y="-60%"
                  width="220%" height="220%"
                >
                  <feGaussianBlur stdDeviation="8" result="blur1" />
                  <feGaussianBlur stdDeviation="3" result="blur2" in="SourceGraphic" />
                  <feMerge>
                    <feMergeNode in="blur1" />
                    <feMergeNode in="blur2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}

              {/* ── Per-branch glow filters (soft, for sub-nodes) ── */}
              {branches.map((b) => (
                <filter
                  key={`glow-soft-${b.id}`}
                  id={`glow-soft-${b.id}`}
                  x="-50%" y="-50%"
                  width="200%" height="200%"
                >
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}

              {/* ── Center glow filter ── */}
              <filter id="glow-center" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="12" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* ── Dot grid pattern ── */}
              <pattern id="dot-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="16" cy="16" r="0.6" fill="rgba(255,255,255,0.035)" />
              </pattern>

              {/* ── Firefly line glow filters ── */}
              <filter id="line-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
              <filter id="firefly-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* ── Background layers ── */}
            <rect x={0} y={0} width={size.w} height={size.h} fill="#000000" />
            <rect x={0} y={0} width={size.w} height={size.h} fill="url(#bg-glow)" />
            <rect x={0} y={0} width={size.w} height={size.h} fill="url(#dot-grid)" />

            {/* Faint star field */}
            {Array.from({ length: 60 }, (_, i) => {
              const px = (Math.sin(i * 2.39 + 0.5) * 0.5 + 0.5) * size.w;
              const py = (Math.cos(i * 3.71 + 1.2) * 0.5 + 0.5) * size.h;
              return (
                <circle
                  key={`star-${i}`}
                  cx={px}
                  cy={py}
                  r={i % 11 === 0 ? 1.2 : 0.55}
                  fill="white"
                  opacity={0.03 + (i % 5) * 0.018}
                />
              );
            })}

            {/* ── Lines: center → branch nodes (firefly glow) ── */}
            {branchPositions.map(({ branch, x: bx, y: by }) => {
              const isHighlighted = hoveredId === branch.id || hoveredId?.startsWith(branch.id + '-');
              const pathId = `path-center-${branch.id}`;
              const pathD = curvePath(cx, cy, bx, by);
              return (
                <g key={`line-center-${branch.id}`}>
                  {/* Glow aura layer */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={branch.color}
                    strokeWidth={7}
                    strokeOpacity={isHighlighted ? 0.14 : 0.08}
                    filter="url(#line-blur)"
                    style={{ transition: 'stroke-opacity 0.25s ease' }}
                  />
                  {/* Main line */}
                  <path
                    id={pathId}
                    d={pathD}
                    fill="none"
                    stroke={branch.color}
                    strokeWidth={isHighlighted ? 1.8 : 1.5}
                    strokeOpacity={isHighlighted ? 0.65 : 0.5}
                    strokeDasharray="6 4"
                    style={{
                      animation: 'analytics-dash 1.8s linear infinite',
                      transition: 'stroke-opacity 0.25s ease, stroke-width 0.25s ease',
                    }}
                  />
                  {/* Firefly dot 1 */}
                  <circle r="3" fill={branch.color} filter="url(#firefly-glow)">
                    <animateMotion dur="3s" repeatCount="indefinite" begin="0s">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                  {/* Firefly dot 2 */}
                  <circle r="2" fill={branch.color} filter="url(#firefly-glow)" opacity="0.7">
                    <animateMotion dur="3.8s" repeatCount="indefinite" begin="1.2s">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                  {/* Firefly dot 3 */}
                  <circle r="1.5" fill={branch.color} filter="url(#firefly-glow)" opacity="0.5">
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin="2s">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}

            {/* ── Lines: branch → sub-nodes (firefly glow) ── */}
            {branchPositions.map(({ branch, x: bx, y: by }) => {
              const subPositions = computeSubNodePositions(
                branch, bx, by, branch.angle, subDistance - branchDistance,
              );
              return subPositions.map(({ node, x: sx, y: sy }) => {
                const isHighlighted = hoveredId === node.id || hoveredId === branch.id;
                const subPathId = `path-branch-${node.id}`;
                const subPathD = curvePath(bx, by, sx, sy);
                return (
                  <g key={`line-branch-${node.id}`}>
                    {/* Glow aura layer */}
                    <path
                      d={subPathD}
                      fill="none"
                      stroke={branch.color}
                      strokeWidth={5}
                      strokeOpacity={isHighlighted ? 0.10 : 0.05}
                      filter="url(#line-blur)"
                      style={{ transition: 'stroke-opacity 0.25s ease' }}
                    />
                    {/* Main line */}
                    <path
                      id={subPathId}
                      d={subPathD}
                      fill="none"
                      stroke={branch.color}
                      strokeWidth={isHighlighted ? 1.2 : 0.65}
                      strokeOpacity={isHighlighted ? 0.45 : 0.15}
                      strokeDasharray="4 5"
                      style={{
                        animation: 'analytics-dash-dim 2.2s linear infinite',
                        transition: 'stroke-opacity 0.25s ease',
                      }}
                    />
                    {/* Firefly dot 1 */}
                    <circle r="2" fill={branch.color} filter="url(#firefly-glow)" opacity="0.8">
                      <animateMotion dur={`${2.2 + (node.id.charCodeAt(0) % 3) * 0.6}s`} repeatCount="indefinite" begin="0s">
                        <mpath href={`#${subPathId}`} />
                      </animateMotion>
                    </circle>
                    {/* Firefly dot 2 */}
                    <circle r="1.5" fill={branch.color} filter="url(#firefly-glow)" opacity="0.55">
                      <animateMotion dur={`${3.0 + (node.id.charCodeAt(0) % 4) * 0.5}s`} repeatCount="indefinite" begin="1s">
                        <mpath href={`#${subPathId}`} />
                      </animateMotion>
                    </circle>
                  </g>
                );
              });
            })}

            {/* ── Sub-nodes — rounded rect, text inside ── */}
            {branchPositions.map(({ branch, x: bx, y: by }) => {
              const subPositions = computeSubNodePositions(
                branch, bx, by, branch.angle, subDistance - branchDistance,
              );
              return subPositions.map(({ node, x: sx, y: sy }) => {
                const isHovered = hoveredId === node.id;
                const isSelected = selectedItem?.node?.id === node.id;
                const label = node.label.length > 10 ? `${node.label.slice(0, 10)}…` : node.label;
                const nw = 68;
                const nh = 24;
                const scale = isHovered || isSelected ? 1.1 : 1.0;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${sx} ${sy}) scale(${scale})`}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(isSelected ? null : { type: 'node', branch, node });
                    }}
                  >
                    {/* Soft glow halo */}
                    <rect
                      x={-nw / 2 - 8} y={-nh / 2 - 8}
                      width={nw + 16} height={nh + 16} rx={10}
                      fill={branch.color}
                      opacity={isHovered || isSelected ? 0.18 : 0.06}
                      style={{ transition: 'opacity 0.2s ease' }}
                    />
                    {/* Main body — rounded rect, no stroke */}
                    <rect
                      x={-nw / 2} y={-nh / 2}
                      width={nw} height={nh} rx={6}
                      fill={branch.color}
                      fillOpacity={isHovered || isSelected ? 0.38 : 0.18}
                      filter={isHovered || isSelected ? `url(#glow-soft-${branch.id})` : undefined}
                      style={{ transition: 'fill-opacity 0.2s ease' }}
                    />
                    {/* Text inside */}
                    <text
                      y={0} dy="0.35em"
                      textAnchor="middle"
                      fill={isHovered || isSelected ? 'white' : 'rgba(235,235,245,0.72)'}
                      fontSize={9.5}
                      fontWeight={isHovered || isSelected ? 600 : 400}
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        pointerEvents: 'none',
                        transition: 'fill 0.2s ease',
                      }}
                    >
                      {label}
                    </text>
                  </g>
                );
              });
            })}

            {/* ── Branch nodes ── */}
            {branchPositions.map(({ branch, x: bx, y: by }) => {
              const isHovered = hoveredId === branch.id;
              const isSelected = selectedItem?.branch.id === branch.id && !selectedItem?.node;
              const bw = Math.max(90, branch.label.length * 12 + 20);
              const bh = 34;
              const scale = isHovered || isSelected ? 1.12 : 1.0;

              return (
                <g
                  key={branch.id}
                  transform={`translate(${bx} ${by}) scale(${scale})`}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                  onMouseEnter={() => setHoveredId(branch.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(
                      isSelected ? null : { type: 'branch', branch },
                    );
                  }}
                >
                  {/* Ambient glow background */}
                  <rect
                    x={-(bw / 2 + 18)} y={-(bh / 2 + 18)}
                    width={bw + 36} height={bh + 36}
                    rx={16}
                    fill={branch.color}
                    opacity={isHovered || isSelected ? 0.14 : 0.05}
                    style={{ transition: 'opacity 0.2s ease' }}
                  />
                  {/* Main body */}
                  <rect
                    x={-bw / 2} y={-bh / 2}
                    width={bw} height={bh}
                    rx={10}
                    fill={`url(#grad-${branch.id})`}
                    fillOpacity={isHovered || isSelected ? 0.42 : 0.22}
                    filter={isHovered || isSelected ? `url(#glow-strong-${branch.id})` : `url(#glow-soft-${branch.id})`}
                    style={{ transition: 'fill-opacity 0.2s ease' }}
                  />
                  {/* Specular highlight */}
                  <ellipse
                    cx={-bw * 0.18} cy={-bh * 0.22}
                    rx={bw * 0.2} ry={bh * 0.22}
                    fill="white"
                    opacity={isHovered ? 0.18 : 0.07}
                    style={{ transition: 'opacity 0.2s ease' }}
                  />
                  {/* Label */}
                  <text
                    y={0}
                    dy="0.35em"
                    textAnchor="middle"
                    fill={isHovered || isSelected ? 'white' : 'rgba(235,235,245,0.88)'}
                    fontSize={isHovered || isSelected ? 11.5 : 10.5}
                    fontWeight={700}
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      pointerEvents: 'none',
                      transition: 'fill 0.2s ease, font-size 0.2s ease',
                    }}
                  >
                    {branch.label}
                  </text>
                </g>
              );
            })}

            {/* ── Center node ── */}
            {/* Outer animated pulse ring */}
            <circle
              cx={cx} cy={cy} r={68}
              fill="none"
              stroke="#0a84ff"
              strokeWidth={1}
              strokeOpacity={0.18}
            >
              <animate attributeName="r" values="62;78;62" dur="4.5s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.18;0.04;0.18" dur="4.5s" repeatCount="indefinite" />
            </circle>
            {/* Second pulse ring */}
            <circle
              cx={cx} cy={cy} r={58}
              fill="none"
              stroke="#06b6d4"
              strokeWidth={0.7}
              strokeOpacity={0.25}
            >
              <animate attributeName="r" values="54;66;54" dur="3.8s" repeatCount="indefinite" begin="0.8s" />
              <animate attributeName="stroke-opacity" values="0.25;0.06;0.25" dur="3.8s" repeatCount="indefinite" begin="0.8s" />
            </circle>
            {/* Static inner ring */}
            <circle
              cx={cx} cy={cy} r={60}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            {/* Main center body */}
            <circle
              cx={cx} cy={cy} r={56}
              fill="url(#center-radial)"
              stroke="#06b6d4"
              strokeWidth={2}
              strokeOpacity={0.7}
              filter="url(#glow-center)"
            />
            {/* Specular ellipse */}
            <ellipse
              cx={cx - 14}
              cy={cy - 14}
              rx={18}
              ry={11}
              fill="white"
              opacity={0.12}
              transform={`rotate(-30 ${cx - 14} ${cy - 14})`}
            />
            {/* Center label */}
            <text
              x={cx}
              y={cy - 7}
              textAnchor="middle"
              fill="white"
              fontSize={13}
              fontWeight={700}
              letterSpacing="-0.02em"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {graph.centerLabel}
            </text>
            <text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              fill="rgba(100,181,255,0.75)"
              fontSize={8}
              letterSpacing="0.08em"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {graph.centerSublabel.toUpperCase()}
            </text>
          </svg>
        )}

        {/* ── Detail card overlay ── */}
        {selectedItem && (
          <DetailCard item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}

        {/* ── Branch legend (bottom-left) ── */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          maxWidth: 420,
        }}>
          {branches.map((b) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: b.color,
                boxShadow: `0 0 7px ${b.color}90`,
                flexShrink: 0,
              }} />
              <span style={{
                color: 'rgba(235,235,245,0.22)',
                fontSize: 9,
                letterSpacing: '0.03em',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* ── Click hint ── */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 20,
          color: 'rgba(235,235,245,0.12)',
          fontSize: 9,
          letterSpacing: '0.04em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          노드를 클릭해 상세 정보 보기
        </div>
      </div>
    </div>
  );
}
