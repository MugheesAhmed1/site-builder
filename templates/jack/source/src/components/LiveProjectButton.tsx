import { fill, useXP } from '../xp';

interface LiveProjectButtonProps {
  onClick?: () => void;
  className?: string;
}

export function LiveProjectButton({ onClick, className = '' }: LiveProjectButtonProps) {
  const data = useXP();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border-2 border-[var(--c-text)] text-[var(--c-text)] font-medium uppercase tracking-widest px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-200 hover:bg-[var(--c-text)]/10 focus-visible:outline-2 focus-visible:outline-[var(--c-text)] focus-visible:outline-offset-4 ${className}`}
    >
      {fill(data.buttons?.project, data)}
    </button>
  );
}
