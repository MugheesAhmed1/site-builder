// Small WebGL helpers for the living scenes: shader programs, buffers and 4x4 matrices.
// Original code, no libraries. Matrices are column-major Float32Arrays, as WebGL expects.

export function program(gl, vs, fs) {
  const make = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("shader: " + log);
    }
    return sh;
  };
  const p = gl.createProgram();
  const a = make(gl.VERTEX_SHADER, vs);
  const b = make(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, a);
  gl.attachShader(p, b);
  gl.linkProgram(p);
  gl.deleteShader(a);
  gl.deleteShader(b);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(p));
  const uniforms = {};
  const attribs = {};
  const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) {
    const info = gl.getActiveUniform(p, i);
    const name = info.name.replace(/\[0\]$/, "");
    uniforms[name] = gl.getUniformLocation(p, name);
  }
  const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) {
    const info = gl.getActiveAttrib(p, i);
    attribs[info.name] = gl.getAttribLocation(p, info.name);
  }
  return { p, u: uniforms, a: attribs };
}

/** A vertex buffer with interleaved floats; layout is [[name, size], ...]. */
export function buffer(gl, data, layout, indices) {
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  let ib = null;
  if (indices) {
    ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }
  const stride = layout.reduce((n, l) => n + l[1], 0);
  return { vb, ib, layout, stride, count: indices ? indices.length : data.length / stride };
}

export function bind(gl, prog, buf) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf.vb);
  let off = 0;
  for (const [name, size] of buf.layout) {
    const loc = prog.a[name];
    if (loc !== undefined && loc >= 0) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, buf.stride * 4, off * 4);
    }
    off += size;
  }
  if (buf.ib) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.ib);
}

export function texture(gl, source, { repeat = false } = {}) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

// ---------------------------------------------------------------- matrices
export const mat4 = {
  identity() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) / (near - far);
    m[11] = -1;
    m[14] = (2 * far * near) / (near - far);
    return m;
  },
  lookAt(eye, at, up = [0, 1, 0]) {
    const z = norm(sub(eye, at));
    const x = norm(cross(up, z));
    const y = cross(z, x);
    const m = new Float32Array(16);
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2]; m[12] = -dot(x, eye);
    m[1] = y[0]; m[5] = y[1]; m[9] = y[2]; m[13] = -dot(y, eye);
    m[2] = z[0]; m[6] = z[1]; m[10] = z[2]; m[14] = -dot(z, eye);
    m[15] = 1;
    return m;
  },
  mul(a, b) {
    const m = new Float32Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) m[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return m;
  },
  /** Position, yaw (around y), pitch (around z, nose up), roll (around x) and scale. */
  pose(x, y, z, yaw = 0, pitch = 0, roll = 0, s = 1) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    // R = Ry(yaw) * Rz(pitch) * Rx(roll)
    const m = new Float32Array(16);
    m[0] = cy * cp * s; m[1] = sp * s; m[2] = -sy * cp * s;
    m[4] = (-cy * sp * cr + sy * sr) * s; m[5] = cp * cr * s; m[6] = (sy * sp * cr + cy * sr) * s;
    m[8] = (cy * sp * sr + sy * cr) * s; m[9] = -cp * sr * s; m[10] = (-sy * sp * sr + cy * cr) * s;
    m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
    return m;
  },
};

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function hexToRgb(hex, fb = [1, 1, 1]) {
  if (Array.isArray(hex)) return hex;
  if (typeof hex !== "string") return fb;
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return fb;
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
