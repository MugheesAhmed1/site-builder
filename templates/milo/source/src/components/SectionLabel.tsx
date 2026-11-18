interface SectionLabelProps {
  children: string;
  className?: string;
}

export function SectionLabel({ children, className = '' }: SectionLabelProps) {
  return (
    <span
      className={`inline-block text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] ${className}`}
    >
      {children}
    </span>
  );
}
