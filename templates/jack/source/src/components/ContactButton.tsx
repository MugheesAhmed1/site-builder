import { fill, useXP } from '../xp';

interface ContactButtonProps {
  onClick?: () => void;
  className?: string;
}

export function ContactButton({ onClick, className = '' }: ContactButtonProps) {
  const data = useXP();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full text-[var(--c-buttonText)] font-medium uppercase tracking-widest px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base whitespace-nowrap shrink-0 cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ${className}`}
      style={{
        background:
          'linear-gradient(123deg, var(--c-grad1) 7%, var(--c-grad2) 37%, var(--c-grad3) 72%, var(--c-grad4) 100%)',
        boxShadow:
          '0px 4px 4px color-mix(in srgb, var(--c-grad2) 25%, transparent), 4px 4px 12px var(--c-grad3) inset',
        outline: '2px solid var(--c-buttonText)',
        outlineOffset: '-3px',
      }}
    >
      {fill(data.buttons?.contact, data)}
    </button>
  );
}
