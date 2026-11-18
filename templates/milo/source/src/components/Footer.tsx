import { fill, useXP } from '../xp';

export function Footer() {
  const data = useXP();
  const f = data.footer || {};
  return (
    <footer className="relative z-30 w-full bg-[var(--c-deep)] text-[var(--c-text)] border-t border-[var(--c-text)]/14 px-6 sm:px-12 lg:px-20 py-10 sm:py-14">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em]">
        <span className="font-bold tracking-[0.16em] text-[var(--c-text)]">{fill(f.left, data)}</span>
        <span className="text-center text-[var(--c-text)]/55">{fill(f.middle, data)}</span>
        <span className="text-[var(--c-text)]/55 tabular-nums">{fill(f.right, data)}</span>
      </div>
    </footer>
  );
}
