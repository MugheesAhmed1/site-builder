export interface SceneControl {
  key: string;
  label: string;
  type: "range" | "toggle" | "color";
  min?: number;
  max?: number;
  step?: number;
  def: number | boolean | string;
}
export const KK_CONTROLS: Record<string, SceneControl[]>;
export const SHADER_CONTROLS: Record<string, SceneControl[]>;
export function kkDefaults(id: string): Record<string, number | boolean | string>;
export function sceneControls(s: { id: string; kk?: string } | null | undefined): SceneControl[];
