import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** Skeleton block: white 5% bg, opacity pulse 1.6s (no sliding sheen). */
export function Skeleton({ width = '100%', height = 12, radius, className = '', style }: SkeletonProps) {
  return (
    <div
      className={`ui-skeleton ${className}`.trim()}
      style={{ width, height, ...(radius != null ? { borderRadius: radius } : null), ...style }}
    />
  );
}

export default Skeleton;
