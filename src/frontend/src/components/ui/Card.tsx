import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: ReactNode;
}

/** Surface card: bg-2 + border-1 + r10, no shadow. `interactive` adds hover border. */
export function Card({ interactive = false, className = '', children, ...rest }: CardProps) {
  const cls = `ui-card ${interactive ? 'ui-card-interactive' : ''} ${className}`.trim();
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export default Card;
