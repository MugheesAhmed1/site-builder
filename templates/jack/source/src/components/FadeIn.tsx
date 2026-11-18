import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

type SupportedTag =
  | 'div'
  | 'section'
  | 'header'
  | 'nav'
  | 'article'
  | 'h1'
  | 'h2'
  | 'p'
  | 'span';

interface FadeInProps {
  children: React.ReactNode;
  as?: SupportedTag;
  delay?: number;
  duration?: number;
  x?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
}

const motionElements: Record<
  SupportedTag,
  React.ComponentType<HTMLMotionProps<SupportedTag>>
> = {
  div: motion.create('div') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  section: motion.create('section') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  header: motion.create('header') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  nav: motion.create('nav') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  article: motion.create('article') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  h1: motion.create('h1') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  h2: motion.create('h2') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  p: motion.create('p') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
  span: motion.create('span') as React.ComponentType<HTMLMotionProps<SupportedTag>>,
};

export function FadeIn({
  children,
  as = 'div',
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  className = '',
  style,
}: FadeInProps) {
  const Component = motionElements[as];

  return (
    <Component
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '50px', amount: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}
