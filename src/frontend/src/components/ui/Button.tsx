import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

/** Dark-premium button. Variants: primary / secondary / ghost / danger. */
export function Button({ variant = 'secondary', size = 'md', className = '', children, ...rest }: ButtonProps) {
  const cls = `ui-btn ui-btn-${size} ui-btn-${variant} ${className}`.trim();
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export default Button;
