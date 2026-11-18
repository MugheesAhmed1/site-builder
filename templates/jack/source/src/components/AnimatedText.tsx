import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';

interface AnimatedCharProps {
  char: string;
  progress: MotionValue<number>;
  range: [number, number];
}

function AnimatedChar({ char, progress, range }: AnimatedCharProps) {
  const opacity = useTransform(progress, range, [0.2, 1]);

  return (
    <span className="relative inline-block">
      <span className="opacity-20" aria-hidden="true">
        {char}
      </span>
      <motion.span style={{ opacity }} className="absolute inset-0">
        {char}
      </motion.span>
    </span>
  );
}

interface AnimatedTextProps {
  text: string;
  className?: string;
}

export function AnimatedText({ text, className = '' }: AnimatedTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2'],
  });

  const words = text.split(' ');
  const totalChars = text.length;
  let charCursor = 0;

  return (
    <p
      ref={containerRef}
      className={`text-[var(--c-text)] font-medium text-center leading-relaxed max-w-[560px] ${className}`}
      style={{ fontSize: 'clamp(1rem, 2vw, 1.35rem)' }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, wordIdx) => {
          const wordElement = (
            <span key={`word-${wordIdx}`} className="inline-block whitespace-nowrap">
              {word.split('').map((char, charIdx) => {
                const start = charCursor / totalChars;
                const end = (charCursor + 1) / totalChars;
                charCursor += 1;

                return (
                  <AnimatedChar
                    key={`char-${wordIdx}-${charIdx}`}
                    char={char}
                    progress={scrollYProgress}
                    range={[start, end]}
                  />
                );
              })}
            </span>
          );

          if (wordIdx < words.length - 1) {
            charCursor += 1;
            return (
              <span key={`wrap-${wordIdx}`}>
                {wordElement}{' '}
              </span>
            );
          }

          return wordElement;
        })}
      </span>
    </p>
  );
}
