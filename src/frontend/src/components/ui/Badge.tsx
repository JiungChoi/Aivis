import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

/** Status badge: h20, r999, 11px. Status tones use *-bg + colored text. */
export function Badge({ tone = 'neutral', className = '', children, ...rest }: BadgeProps) {
  const cls = `ui-badge ui-badge-${tone} ${className}`.trim();
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

export default Badge;
