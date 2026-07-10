import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface FieldWrap {
  label?: ReactNode;
}

/** Text input: h36, bg-sunken, r6, accent focus ring. */
export function Input({ label, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & FieldWrap) {
  const input = <input className={`ui-field ${className}`.trim()} {...rest} />;
  if (!label) return input;
  return (
    <label style={{ display: 'block' }}>
      <span className="ui-label">{label}</span>
      {input}
    </label>
  );
}

/** Multiline input. */
export function Textarea({ label, className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrap) {
  const el = <textarea className={`ui-field ${className}`.trim()} {...rest} />;
  if (!label) return el;
  return (
    <label style={{ display: 'block' }}>
      <span className="ui-label">{label}</span>
      {el}
    </label>
  );
}

/** Native select styled as a field. */
export function Select({ label, className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldWrap) {
  const el = <select className={`ui-field ${className}`.trim()} {...rest}>{children}</select>;
  if (!label) return el;
  return (
    <label style={{ display: 'block' }}>
      <span className="ui-label">{label}</span>
      {el}
    </label>
  );
}

export default Input;
