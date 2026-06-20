import { useState, useEffect, useRef } from 'react';
import { knowledgeService } from '../services/knowledgeService';
import { useConversationStore } from '../stores/conversationStore';
import { polarToXY, curvePath, computeSubNodePositions } from './analytics/geometry';
import { StatChip } from './analytics/StatChip';
import { DetailCard } from './analytics/DetailCard';
import { ANIMATION_CSS } from './analytics/constants';
import type { SelectedItem } from './analytics/types';

export default function AnalyticsPage() {
  const [graph, setGraph] = useState(() => knowledgeService.getGraph());
  const branches = graph.branches;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  const sendMessage = useConversationStore(state => state.sendMessage);

  function handleChatAboutItem(item: SelectedItem) {
    const topic = item.node
      ? `${item.branch.label} 분야의 "${item.node.label}"`
      : `"${item.branch.label}"`;
    sendMessage(`${topic}에 대해 더 깊이 이야기해줘. 어떻게 발전시킬 수 있을까?`);
    setSelectedItem(null);
  }
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });

  // Load dynamic data (real memories/notes) merged into static graph
  useEffect(() => {
    knowledgeService.getGraphWithDynamicData().then(setGraph).catch(() => {});
  }, []);

  // Re-load when Settings profile changes (same-tab event)
  useEffect(() => {
    function handleProfileUpdate() {
      knowledgeService.getGraphWithDynamicData().then(setGraph).catch(() => {});
    }
    window.addEventListener('aivis:profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('aivis:profile-updated', handleProfileUpdate);
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

  // Layout constants — keep all nodes within half the smaller dimension
  const baseRadius = Math.min(size.w, size.h) / 2;
  const branchDistance = baseRadius * 0.52;
  const subDistance = branchDistance + baseRadius * 0.38;

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
              {/* ── 성운 그라디언트 (Nebula) ── */}
              <radialGradient id="nebula-purple" cx="20%" cy="25%" r="60%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nebula-cyan" cx="75%" cy="18%" r="55%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.13" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nebula-amber" cx="82%" cy="78%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.11" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nebula-pink" cx="12%" cy="80%" r="45%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.11" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nebula-center" cx="50%" cy="50%" r="35%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>

              {/* ── 노드 공통 glow filter ── */}
              <filter id="node-glow" x="-70%" y="-70%" width="240%" height="240%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="center-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="14" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-center" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="20" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="line-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
              <filter id="firefly-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* ── 우주 배경 ── */}
            <rect x={0} y={0} width={size.w} height={size.h} fill="#000005" />

            {/* 성운 블롭 (Nebula blobs) */}
            <ellipse cx={size.w * 0.18} cy={size.h * 0.22} rx={size.w * 0.38} ry={size.h * 0.32} fill="url(#nebula-purple)" />
            <ellipse cx={size.w * 0.78} cy={size.h * 0.15} rx={size.w * 0.34} ry={size.h * 0.30} fill="url(#nebula-cyan)" />
            <ellipse cx={size.w * 0.85} cy={size.h * 0.82} rx={size.w * 0.30} ry={size.h * 0.26} fill="url(#nebula-amber)" />
            <ellipse cx={size.w * 0.10} cy={size.h * 0.82} rx={size.w * 0.28} ry={size.h * 0.24} fill="url(#nebula-pink)" />
            {/* Center blue glow */}
            <ellipse cx={cx} cy={cy} rx={size.w * 0.22} ry={size.h * 0.22} fill="url(#nebula-center)" />

            {/* 별 필드 (Star field: 280개, 크기/밝기 다양) */}
            {Array.from({ length: 280 }, (_, i) => {
              const px  = (Math.sin(i * 2.39 + 0.5) * 0.5 + 0.5) * size.w;
              const py  = (Math.cos(i * 3.71 + 1.2) * 0.5 + 0.5) * size.h;
              const big = i % 28 === 0;
              const med = i % 9 === 0;
              const r   = big ? 1.5 : med ? 1.0 : 0.5;
              const op  = big ? 0.85 : med ? (0.3 + (i % 5) * 0.08) : (0.1 + (i % 7) * 0.04);
              const dur = 2.5 + (i % 6) * 0.7;
              const del = (i % 12) * 0.4;
              return (
                <circle
                  key={`star-${i}`}
                  cx={px} cy={py} r={r}
                  fill={i % 20 === 0 ? '#b9d4ff' : i % 17 === 0 ? '#ffeedd' : 'white'}
                  opacity={op}
                  style={{
                    animation: `star-twinkle ${dur}s ease-in-out ${del}s infinite`,
                    ['--star-base' as string]: op,
                  }}
                />
              );
            })}

            {/* ── Lines: center → branch nodes (gradient + firefly) ── */}
            {branchPositions.map(({ branch, x: bx, y: by }) => {
              const isHighlighted = hoveredId === branch.id || hoveredId?.startsWith(branch.id + '-');
              const pathId  = `path-center-${branch.id}`;
              const gradId  = `line-grad-${branch.id}`;
              const pathD   = curvePath(cx, cy, bx, by);
              return (
                <g key={`line-center-${branch.id}`}>
                  {/* Per-line gradient: center blue → branch color */}
                  <defs>
                    <linearGradient id={gradId} x1={cx} y1={cy} x2={bx} y2={by} gradientUnits="userSpaceOnUse">
                      <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.9" />
                      <stop offset="100%" stopColor={branch.color} stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  {/* Glow aura */}
                  <path d={pathD} fill="none"
                    stroke={branch.color} strokeWidth={9}
                    strokeOpacity={isHighlighted ? 0.22 : 0.12}
                    filter="url(#line-blur)"
                    style={{ transition: 'stroke-opacity 0.25s ease' }}
                  />
                  {/* Main gradient line */}
                  <path id={pathId} d={pathD} fill="none"
                    stroke={`url(#${gradId})`}
                    strokeWidth={isHighlighted ? 2.5 : 2}
                    strokeOpacity={isHighlighted ? 0.9 : 0.72}
                    strokeDasharray="6 4"
                    style={{
                      animation: 'analytics-dash 1.8s linear infinite',
                      transition: 'stroke-opacity 0.25s ease, stroke-width 0.25s ease',
                    }}
                  />
                  {/* Firefly dots */}
                  <circle r="3" fill={branch.color} filter="url(#firefly-glow)">
                    <animateMotion dur="3s" repeatCount="indefinite" begin="0s"><mpath href={`#${pathId}`} /></animateMotion>
                  </circle>
                  <circle r="2" fill={branch.color} filter="url(#firefly-glow)" opacity="0.7">
                    <animateMotion dur="3.8s" repeatCount="indefinite" begin="1.2s"><mpath href={`#${pathId}`} /></animateMotion>
                  </circle>
                  <circle r="1.5" fill={branch.color} filter="url(#firefly-glow)" opacity="0.5">
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin="2s"><mpath href={`#${pathId}`} /></animateMotion>
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

            {/* ── Sub-nodes → 작은 둥근 사각형 ── */}
            {branchPositions.map(({ branch, x: bx, y: by }) => {
              const subPositions = computeSubNodePositions(
                branch, bx, by, branch.angle, subDistance - branchDistance,
              );
              return subPositions.map(({ node, x: sx, y: sy }) => {
                const isHovered  = hoveredId === node.id;
                const isSelected = selectedItem?.node?.id === node.id;
                const active     = isHovered || isSelected;
                const nw         = Math.max(80, node.label.length * 9 + 20);
                const nh         = node.sublabel ? 42 : 28;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${sx} ${sy})`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(active ? null : { type: 'node', branch, node });
                    }}
                  >
                    {/* Glow halo */}
                    <rect x={-nw/2-6} y={-nh/2-6} width={nw+12} height={nh+12} rx={12}
                      fill={branch.color}
                      fillOpacity={active ? 0.22 : 0.10}
                      style={{ transition: 'fill-opacity 0.2s ease' }}
                    />
                    {/* Body */}
                    <rect x={-nw/2} y={-nh/2} width={nw} height={nh} rx={8}
                      fill="rgba(4,10,28,0.92)"
                      stroke={branch.color}
                      strokeWidth={active ? 1.5 : 1}
                      strokeOpacity={active ? 0.9 : 0.62}
                      filter="url(#node-glow)"
                      style={{ transition: 'stroke-opacity 0.2s ease, stroke-width 0.2s ease' }}
                    />
                    {/* Label */}
                    <text
                      y={node.sublabel ? -5 : 4}
                      textAnchor="middle"
                      fill={active ? 'white' : 'rgba(235,235,245,0.82)'}
                      fontSize={10}
                      fontWeight={active ? 600 : 400}
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', pointerEvents: 'none', transition: 'fill 0.2s ease' }}
                    >{node.label}</text>
                    {/* Sublabel */}
                    {node.sublabel && (
                      <text y={10} textAnchor="middle"
                        fill={branch.color} fontSize={8.5}
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', pointerEvents: 'none', opacity: 0.75 }}
                      >{node.sublabel}</text>
                    )}
                  </g>
                );
              });
            })}

            {/* ── Branch nodes → 중간 둥근 사각형 ── */}
            {(() => {
              return branchPositions.map(({ branch, x: bx, y: by }) => {
                const isHovered  = hoveredId === branch.id;
                const isSelected = selectedItem?.branch.id === branch.id && !selectedItem?.node;
                const active     = isHovered || isSelected;
                const bw         = Math.max(100, branch.label.length * 9.5 + 28);
                const bh         = 38;
                return (
                  <g
                    key={branch.id}
                    transform={`translate(${bx} ${by})`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(branch.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(active ? null : { type: 'branch', branch });
                    }}
                  >
                    {/* Glow halo */}
                    <rect x={-bw/2-10} y={-bh/2-10} width={bw+20} height={bh+20} rx={18}
                      fill={branch.color} fillOpacity={active ? 0.26 : 0.14}
                      style={{ transition: 'fill-opacity 0.25s ease' }}
                    />
                    {/* Body */}
                    <rect x={-bw/2} y={-bh/2} width={bw} height={bh} rx={11}
                      fill="rgba(4,10,28,0.94)"
                      stroke={branch.color}
                      strokeWidth={active ? 2.5 : 2}
                      strokeOpacity={active ? 1 : 0.85}
                      filter="url(#node-glow)"
                      style={{ transition: 'stroke-width 0.25s ease, stroke-opacity 0.25s ease' }}
                    />
                    {/* Label */}
                    <text y={4} textAnchor="middle"
                      fill={active ? 'white' : branch.color}
                      fontSize={11} fontWeight={700} letterSpacing="0.01em"
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif', pointerEvents: 'none', transition: 'fill 0.25s ease' }}
                    >{branch.label}</text>
                  </g>
                );
              });
            })()}

            {/* ── Center node → 파란 테두리 + 검푸른 배경 pill ── */}
            {/* 배경 글로우 */}
            <rect x={cx-98} y={cy-42} width={196} height={84} rx={22}
              fill="none" stroke="#3b82f6" strokeWidth={14} strokeOpacity={0.1}
              filter="url(#center-glow)"
            />
            {/* 펄스 링 */}
            <rect x={cx-90} y={cy-36} width={180} height={72} rx={18}
              fill="none" stroke="#60a5fa" strokeWidth={1} strokeOpacity={0.25}>
              <animate attributeName="stroke-opacity" values="0.25;0.04;0.25" dur="3s" repeatCount="indefinite" />
              <animate attributeName="x" values={`${cx-90};${cx-94};${cx-90}`} dur="3s" repeatCount="indefinite" />
              <animate attributeName="y" values={`${cy-36};${cy-40};${cy-36}`} dur="3s" repeatCount="indefinite" />
              <animate attributeName="width" values="180;188;180" dur="3s" repeatCount="indefinite" />
              <animate attributeName="height" values="72;80;72" dur="3s" repeatCount="indefinite" />
            </rect>
            {/* 본체 */}
            <rect x={cx-84} y={cy-31} width={168} height={62} rx={16}
              fill="rgba(2,8,28,0.94)" stroke="#3b82f6" strokeWidth={2}
            />
            {/* 이름 */}
            <text x={cx} y={cy-6} textAnchor="middle"
              fill="white" fontSize={18} fontWeight={700} letterSpacing="-0.03em"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >{graph.centerLabel.split(' ')[0]}</text>
            {/* 역할 */}
            <text x={cx} y={cy+14} textAnchor="middle"
              fill="#93c5fd" fontSize={11} letterSpacing="0.05em"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >{graph.centerLabel.split(' ').slice(1).join(' ') || graph.centerSublabel}</text>
          </svg>
        )}

        {/* ── Detail card overlay ── */}
        {selectedItem && (
          <DetailCard item={selectedItem} onClose={() => setSelectedItem(null)} onChat={handleChatAboutItem} />
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
