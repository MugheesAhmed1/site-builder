import { useState } from 'react';
import { Box } from '../icons';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  fallbackLabel?: string;
  transparentFallback?: boolean;
}

export function SafeImage({
  src,
  alt,
  className = '',
  loading = 'eager',
  fallbackLabel,
  transparentFallback = false,
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setHasError(false);
  }

  if (hasError || !src) {
    if (transparentFallback) {
      return null;
    }

    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--c-surface)] via-[var(--c-surface)] to-[var(--c-page)] border border-[var(--c-text)]/15 text-[var(--c-text)]/60 select-none ${className}`}
      >
        <Box className="w-7 h-7 opacity-50" />
        <span className="text-xs uppercase tracking-widest px-4 text-center">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
