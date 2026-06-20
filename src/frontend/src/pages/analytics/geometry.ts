import type { KnowledgeBranch, KnowledgeNode } from '../../services/knowledgeService';

// ── Math helpers ──────────────────────────────────────────────────────────────

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Convert angle (0 = right, clockwise) to x,y offset
export function polarToXY(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

// Smooth cubic Bezier with perpendicular bulge — organic mind-map feel
export function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector (rotate -90°)
  const perpX = -dy / len;
  const perpY = dx / len;
  // Bulge magnitude: 10% of line length
  const bulge = len * 0.10;
  // Two control points at 1/3 and 2/3 along the line, offset perpendicular
  const cp1x = x1 + dx * 0.33 + perpX * bulge;
  const cp1y = y1 + dy * 0.33 + perpY * bulge;
  const cp2x = x1 + dx * 0.67 + perpX * bulge;
  const cp2y = y1 + dy * 0.67 + perpY * bulge;
  return `M ${x1} ${y1} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x2} ${y2}`;
}

// ── Sub-node spread layout ────────────────────────────────────────────────────

export interface SubNodePosition {
  node: KnowledgeNode;
  x: number;
  y: number;
}

export function computeSubNodePositions(
  branch: KnowledgeBranch,
  branchX: number,
  branchY: number,
  branchAngleDeg: number,
  subDistance: number,
): SubNodePosition[] {
  const count = branch.nodes.length;
  if (count === 0) return [];

  // Wider spread + alternating radial stagger to prevent label overlap
  const spreadDeg = count <= 1 ? 0 : count <= 2 ? 65 : count <= 3 ? 105 : count <= 4 ? 135 : 160;
  return branch.nodes.map((node, i) => {
    const frac = count === 1 ? 0 : i / (count - 1) - 0.5;
    const angleDeg = branchAngleDeg + frac * spreadDeg;
    // Alternate radii: even indices stay near, odd push out 22% — avoids same-arc collisions
    const stagger = count >= 3 ? (i % 2 === 0 ? 1.0 : 1.22) : 1.0;
    const r = subDistance * stagger;
    const rad = degToRad(angleDeg);
    return {
      node,
      x: branchX + Math.cos(rad) * r,
      y: branchY + Math.sin(rad) * r,
    };
  });
}
