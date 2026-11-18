// Extra line icons for this template. 24 × 24, stroke = currentColor.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number | string };
const S = ({ size = 20, children, ...rest }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);
export const Star = (p: P) => (
  <S {...p} fill="currentColor" stroke="none">
    <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
  </S>
);
export const Phone = (p: P) => (
  <S {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </S>
);
export const Mail = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </S>
);
export const Pin = (p: P) => (
  <S {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </S>
);
export const Clock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </S>
);
export const Plus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const Minus = (p: P) => (
  <S {...p}>
    <path d="M5 12h14" />
  </S>
);
export const Heart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <S {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" />
  </S>
);
export const Calendar = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </S>
);
export const Users = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.2 3.2 0 0 1 0 6.3M21 20a6 6 0 0 0-4-5.6" />
  </S>
);
export const Bed = (p: P) => (
  <S {...p}>
    <path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3" />
    <circle cx="7" cy="10.5" r="1.6" />
  </S>
);
export const Bath = (p: P) => (
  <S {...p}>
    <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2" />
  </S>
);
export const Area = (p: P) => (
  <S {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </S>
);
export const Spark = (p: P) => (
  <S {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  </S>
);
export const Shield = (p: P) => (
  <S {...p}>
    <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </S>
);
export const Flame = (p: P) => (
  <S {...p}>
    <path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-3.5-10C12 7 11 9 11 11c-1-1-1.5-2-1.5-3C7.5 9.5 6 12 6 15a6 6 0 0 0 6 6z" />
  </S>
);
