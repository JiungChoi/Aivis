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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-0)' }}>

      {/* Inject keyframe animations */}
      <style>{ANIMATION_CSS}</style>

      {/* ── Header ── */}
      <div style={{
        height: 56,
        flexShrink: 0,
        borderBottom: '1px solid var(--border-1)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-1)',
      }}>
        <div>
          <div style={{
            color: 'var(--text-1)',
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: '-0.01em',
          }}>
            당신의 지식을 연결합니다
          </div>
          <div style={{
            color: 'var(--text-3)',
            fontSize: 11,
            marginTop: 2,
            letterSpacing: '0.01em',
          }}>
            AIVIS가 학습한 당신의 지식 네트워크
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <StatChip label="총 노드" value={totalNodes} color="var(--accent)" />
          <StatChip label="브랜치" value={branches.length} color="var(--text-2)" />
          <StatChip label="지식 영역" value={6} color="var(--text-2)" />
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
              {/* ── 노드 공통 blur filter (neutral blur) ── */}
              <filter id="node-blur" x="-70%" y="-70%" width="240%" height="240%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="center-blur" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="14" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="blur-center" x="-100%" y="-100%" width="300%" height="300%">
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
              <filter id="firefly-blur" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* ── 배경 ── */}
            <rect x={0} y={0} width={size.w} height={size.h} style={{ fill: 'var(--bg-0)' }} />

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
                  fill="white"
                  opacity={op}
                  style={{
                    animation: `star-twinkle ${dur}s ease-in-out ${del}s infinite`,
                    ['--star-base' as string]: op,
                  }}
                />
              );
            })}

            {/* ── Lines: center → branch nodes (firefly) ── */}
            {branchPositions.map(({ branch, x: bx, y: by }) => {
              const isHighlighted = hoveredId === branch.id || hoveredId?.startsWith(branch.id + '-');
              const pathId  = `path-center-${branch.id}`;
              const pathD   = curvePath(cx, cy, bx, by);
              return (
                <g key={`line-center-${branch.id}`}>
                  {/* Blur aura */}
                  <path d={pathD} fill="none"
                    strokeWidth={9}
                    strokeOpacity={isHighlighted ? 0.22 : 0.12}
                    filter="url(#line-blur)"
                    style={{ stroke: isHighlighted ? 'var(--accent)' : 'var(--border-2)', transition: 'stroke-opacity 0.25s ease' }}
                  />
                  {/* Main line */}
                  <path id={pathId} d={pathD} fill="none"
                    strokeWidth={isHighlighted ? 2.5 : 2}
                    strokeOpacity={isHighlighted ? 0.9 : 0.72}
                    strokeDasharray="6 4"
                    style={{
                      stroke: isHighlighted ? 'var(--accent)' : 'var(--border-2)',
                      animation: 'analytics-dash 1.8s linear infinite',
                      transition: 'stroke-opacity 0.25s ease, stroke-width 0.25s ease',
                    }}
                  />
                  {/* Firefly dots */}
                  <circle r="3" filter="url(#firefly-blur)" style={{ fill: 'var(--text-2)' }}>
                    <animateMotion dur="3s" repeatCount="indefinite" begin="0s"><mpath href={`#${pathId}`} /></animateMotion>
                  </circle>
                  <circle r="2" filter="url(#firefly-blur)" opacity="0.7" style={{ fill: 'var(--text-2)' }}>
                    <animateMotion dur="3.8s" repeatCount="indefinite" begin="1.2s"><mpath href={`#${pathId}`} /></animateMotion>
                  </circle>
                  <circle r="1.5" filter="url(#firefly-blur)" opacity="0.5" style={{ fill: 'var(--text-2)' }}>
                    <animateMotion dur="2.5s" repeatCount="indefinite" begin="2s"><mpath href={`#${pathId}`} /></animateMotion>
                  </circle>
                </g>
              );
            })}

            {/* ── Lines: branch → sub-nodes (firefly blur) ── */}
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
                    {/* Blur aura layer */}
                    <path
                      d={subPathD}
                      fill="none"
                      strokeWidth={5}
                      strokeOpacity={isHighlighted ? 0.10 : 0.05}
                      filter="url(#line-blur)"
                      style={{ stroke: isHighlighted ? 'var(--accent)' : 'var(--border-2)', transition: 'stroke-opacity 0.25s ease' }}
                    />
                    {/* Main line */}
                    <path
                      id={subPathId}
                      d={subPathD}
                      fill="none"
                      strokeWidth={isHighlighted ? 1.2 : 0.65}
                      strokeOpacity={isHighlighted ? 0.45 : 0.15}
                      strokeDasharray="4 5"
                      style={{
                        stroke: isHighlighted ? 'var(--accent)' : 'var(--border-2)',
                        animation: 'analytics-dash-dim 2.2s linear infinite',
                        transition: 'stroke-opacity 0.25s ease',
                      }}
                    />
                    {/* Firefly dot 1 */}
                    <circle r="2" filter="url(#firefly-blur)" opacity="0.8" style={{ fill: 'var(--text-2)' }}>
                      <animateMotion dur={`${2.2 + (node.id.charCodeAt(0) % 3) * 0.6}s`} repeatCount="indefinite" begin="0s">
                        <mpath href={`#${subPathId}`} />
                      </animateMotion>
                    </circle>
                    {/* Firefly dot 2 */}
                    <circle r="1.5" filter="url(#firefly-blur)" opacity="0.55" style={{ fill: 'var(--text-2)' }}>
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
                    {/* Blur halo */}
                    <rect x={-nw/2-6} y={-nh/2-6} width={nw+12} height={nh+12} rx={12}
                      fillOpacity={active ? 0.22 : 0.10}
                      style={{ fill: active ? 'var(--accent)' : 'var(--text-3)', transition: 'fill-opacity 0.2s ease' }}
                    />
                    {/* Body */}
                    <rect x={-nw/2} y={-nh/2} width={nw} height={nh} rx={8}
                      strokeWidth={active ? 1.5 : 1}
                      strokeOpacity={active ? 0.9 : 0.62}
                      filter="url(#node-blur)"
                      style={{ fill: 'var(--bg-2)', stroke: active ? 'var(--accent)' : 'var(--border-2)', transition: 'stroke-opacity 0.2s ease, stroke-width 0.2s ease' }}
                    />
                    {/* Label */}
                    <text
                      y={node.sublabel ? -5 : 4}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={active ? 600 : 400}
                      style={{ fill: active ? 'var(--text-1)' : 'var(--text-2)', pointerEvents: 'none', transition: 'fill 0.2s ease' }}
                    >{node.label}</text>
                    {/* Sublabel */}
                    {node.sublabel && (
                      <text y={10} textAnchor="middle"
                        fontSize={8.5}
                        style={{ fill: 'var(--text-3)', pointerEvents: 'none', opacity: 0.75 }}
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
                    {/* Blur halo */}
                    <rect x={-bw/2-10} y={-bh/2-10} width={bw+20} height={bh+20} rx={18}
                      fillOpacity={active ? 0.26 : 0.14}
                      style={{ fill: active ? 'var(--accent)' : 'var(--text-3)', transition: 'fill-opacity 0.25s ease' }}
                    />
                    {/* Body */}
                    <rect x={-bw/2} y={-bh/2} width={bw} height={bh} rx={11}
                      strokeWidth={active ? 2.5 : 2}
                      strokeOpacity={active ? 1 : 0.85}
                      filter="url(#node-blur)"
                      style={{ fill: 'var(--bg-2)', stroke: active ? 'var(--accent)' : 'var(--border-2)', transition: 'stroke-width 0.25s ease, stroke-opacity 0.25s ease' }}
                    />
                    {/* Label */}
                    <text y={4} textAnchor="middle"
                      fontSize={11} fontWeight={700} letterSpacing="0.01em"
                      style={{ fill: active ? 'var(--text-1)' : 'var(--text-2)', pointerEvents: 'none', transition: 'fill 0.25s ease' }}
                    >{branch.label}</text>
                  </g>
                );
              });
            })()}

            {/* ── Center node → 액센트 테두리 pill ── */}
            {/* 배경 글로우 */}
            <rect x={cx-98} y={cy-42} width={196} height={84} rx={22}
              fill="none" strokeWidth={14} strokeOpacity={0.1}
              filter="url(#center-blur)"
              style={{ stroke: 'var(--accent)' }}
            />
            {/* 펄스 링 */}
            <rect x={cx-90} y={cy-36} width={180} height={72} rx={18}
              fill="none" strokeWidth={1} strokeOpacity={0.25}
              style={{ stroke: 'var(--accent)' }}>
              <animate attributeName="stroke-opacity" values="0.25;0.04;0.25" dur="3s" repeatCount="indefinite" />
              <animate attributeName="x" values={`${cx-90};${cx-94};${cx-90}`} dur="3s" repeatCount="indefinite" />
              <animate attributeName="y" values={`${cy-36};${cy-40};${cy-36}`} dur="3s" repeatCount="indefinite" />
              <animate attributeName="width" values="180;188;180" dur="3s" repeatCount="indefinite" />
              <animate attributeName="height" values="72;80;72" dur="3s" repeatCount="indefinite" />
            </rect>
            {/* 본체 */}
            <rect x={cx-84} y={cy-31} width={168} height={62} rx={16}
              strokeWidth={2}
              style={{ fill: 'var(--bg-2)', stroke: 'var(--accent)' }}
            />
            {/* 이름 */}
            <text x={cx} y={cy-6} textAnchor="middle"
              fontSize={18} fontWeight={700} letterSpacing="-0.01em"
              style={{ fill: 'var(--text-1)' }}
            >{graph.centerLabel.split(' ')[0]}</text>
            {/* 역할 */}
            <text x={cx} y={cy+14} textAnchor="middle"
              fontSize={11} letterSpacing="0.05em"
              style={{ fill: 'var(--text-2)' }}
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
                borderRadius: 'var(--r-full)',
                background: 'var(--text-3)',
                flexShrink: 0,
              }} />
              <span style={{
                color: 'var(--text-3)',
                fontSize: 9,
                letterSpacing: '0.03em',
              }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* ── Click hint ── */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 20,
          color: 'var(--text-3)',
          fontSize: 9,
          letterSpacing: '0.04em',
        }}>
          노드를 클릭해 상세 정보 보기
        </div>
      </div>
    </div>
  );
}
