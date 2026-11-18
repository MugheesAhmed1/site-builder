import * as THREE from 'three';

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') {
    cachedSoftwareGl = false;
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererStr = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    cachedSoftwareGl = false;
  }

  return cachedSoftwareGl;
}

export const MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Pre-allocated math helpers for zero GC inside useFrame loops
export const TEMP_VEC3_A = new THREE.Vector3();
export const TEMP_VEC3_B = new THREE.Vector3();
export const TEMP_COLOR_A = new THREE.Color();
export const TEMP_COLOR_B = new THREE.Color();
