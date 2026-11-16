export interface MotionPrimitive {
  id: string;
  label: string;
  note: string;
  moods: string[];
  uniforms: Record<string, number | string>;
  frag: string;
}
export const MOTION_PRIMITIVES: MotionPrimitive[];
