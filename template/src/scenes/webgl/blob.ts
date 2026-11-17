import { Color, Group, IcosahedronGeometry, Mesh, ShaderMaterial, Vector3 } from "three";
import { clamp, freshTaps, hueOf, lerp, num, str, type Frame } from "../frame";
import {anchor3, host, type Init3D, type Kit } from "./core";

// blob3d: a living drop of liquid, silk, glass or chrome. The surface is displaced by noise
// in the vertex shader and shaded with a fresnel sheen, so it costs one draw per drop. Beat
// keys as in the 2D liquid engine: merge (satellite drops join the main one), hue, flow
// (speed), scale. The surface bulges toward the cursor; a tap sends a ripple across it.

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERT = /* glsl */ `
uniform float uTime, uAmp, uFreq, uRipple, uRippleT;
uniform vec3 uPull;
varying vec3 vN; varying vec3 vView; varying float vD;
${NOISE}
float field(vec3 p){
  float d = snoise(p*uFreq + vec3(0.0, uTime*0.35, uTime*0.2))*uAmp;
  d += snoise(p*uFreq*2.3 - uTime*0.25)*uAmp*0.35;
  d += max(0.0, dot(normalize(p), uPull))*0.18*length(uPull);
  d += uRipple*sin(length(p.xy)*9.0 - uRippleT*10.0)*0.06;
  return d;
}
void main(){
  vec3 p = position; vec3 n = normalize(normal);
  float d = field(p);
  vec3 t = normalize(cross(n, vec3(0.0,1.0,0.0)+vec3(0.0001)));
  vec3 b = normalize(cross(n, t));
  float e = 0.02;
  vec3 pa = p + t*e; vec3 pb = p + b*e;
  vec3 q = p + n*d;
  vec3 qa = pa + normalize(pa)*field(pa);
  vec3 qb = pb + normalize(pb)*field(pb);
  vec3 nn = normalize(cross(qa-q, qb-q));
  if (dot(nn, n) < 0.0) nn = -nn;
  vec4 mv = modelViewMatrix*vec4(q,1.0);
  vN = normalize(normalMatrix*nn); vView = normalize(-mv.xyz); vD = d;
  gl_Position = projectionMatrix*mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uA, uB, uC; uniform float uMat, uAlpha;
varying vec3 vN; varying vec3 vView; varying float vD;
void main(){
  vec3 n = normalize(vN);
  float fr = pow(1.0 - max(dot(n, vView), 0.0), 2.2);
  vec3 L = normalize(vec3(0.5, 0.8, 0.6));
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), vView), 0.0), 40.0);
  vec3 base = mix(uA, uB, clamp(vD*2.5 + 0.5 + n.y*0.25, 0.0, 1.0));
  vec3 c;
  if (uMat < 0.5) c = base*(0.35 + 0.75*diff) + uC*fr*0.9 + spec*0.6;            // liquid
  else if (uMat < 1.5) c = mix(base, uC, 0.5 + 0.5*sin(n.x*6.0 + n.y*4.0))*(0.5+0.6*diff) + spec*0.25; // silk
  else if (uMat < 2.5) c = mix(base*0.25, uC, fr) + spec*0.9;                   // glass
  else c = mix(vec3(0.08), vec3(0.95), 0.5 + 0.5*n.y)*(0.3+0.8*diff) + uC*fr*0.6 + spec; // chrome
  float a = uMat > 1.5 && uMat < 2.5 ? clamp(0.35 + fr*0.8, 0.0, 1.0) : 1.0;
  gl_FragColor = vec4(c, a*uAlpha);
}`;

function hsl(h: number, s: number, l: number) {
  return new Color().setHSL((((h % 360) + 360) % 360) / 360, s, l, "srgb");
}

export const blob3d = host({ fov: 35 }, (k: Kit, init: Init3D) => {
  const { scene, camera, renderer } = k;
  const mat = ["liquid", "silk", "glass", "chrome", "fluid"].indexOf(str(init.params, "material", "liquid"));
  const make = (detail: number) =>
    new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.25 },
        uFreq: { value: 1.2 },
        uRipple: { value: 0 },
        uRippleT: { value: 0 },
        uPull: { value: new Vector3() },
        uA: { value: new Color() },
        uB: { value: new Color() },
        uC: { value: new Color() },
        uMat: { value: mat === 4 ? 0 : Math.max(0, mat) },
        uAlpha: { value: 1 },
      },
      defines: { DETAIL: detail },
    });
  const main = new Mesh(new IcosahedronGeometry(1, init.mobile ? 32 : 64), make(1));
  const group = new Group();
  group.add(main);
  const drops = [0, 1, 2].map(() => {
    const m = new Mesh(new IcosahedronGeometry(1, 16), make(0));
    group.add(m);
    return m;
  });
  scene.add(group);
  let flowT = 0;
  let ripple = -9;
  let lastTap = -1;
  const pull = new Vector3();
  return {
    frame(f: Frame) {
      const merge = clamp(num(f.beat, "merge", 0.3));
      const flow = num(f.beat, "flow", 0.5);
      const hue = hueOf(f.pal.accent) + num(f.beat, "hue", 0);
      const a = anchor3(k, f);
      const s = a.s * 0.36 * num(f.beat, "scale", 1);
      flowT += f.dt * (0.4 + flow * 1.2) * (f.reduced ? 0 : 1);
      const tap = freshTaps(f, 1400).pop();
      if (tap && tap.t !== lastTap) (lastTap = tap.t), (ripple = f.t);
      pull.lerp(f.pointer ? new Vector3(f.nx, -f.ny, 0.4) : new Vector3(), 0.08);
      group.position.set(a.x, a.y, 0);
      const set = (m: Mesh, amp: number) => {
        const u = (m.material as ShaderMaterial).uniforms;
        u.uTime.value = flowT;
        u.uAmp.value = amp;
        u.uPull.value.copy(pull);
        u.uRipple.value = Math.max(0, 1 - (f.t - ripple) / 1.4);
        u.uRippleT.value = f.t - ripple;
        u.uA.value.copy(hsl(hue, 0.75, 0.5));
        u.uB.value.copy(hsl(hue + 50, 0.8, 0.62));
        u.uC.value.copy(hsl(hue - 40, 0.9, 0.75));
      };
      main.scale.setScalar(s * (1 + merge * 0.25));
      main.rotation.y = flowT * 0.2;
      set(main, lerp(0.32, 0.12, merge));
      drops.forEach((d, i) => {
        const ang = flowT * (0.5 + i * 0.2) + i * 2.1;
        const r = s * lerp(1.9, 0.2, merge);
        d.position.set(Math.cos(ang) * r, Math.sin(ang * 1.3) * r * 0.6, Math.sin(ang) * r * 0.5);
        d.scale.setScalar(s * 0.32 * (1 - merge * 0.9) + 0.001);
        d.visible = merge < 0.97;
        set(d, 0.18);
      });
      renderer.render(scene, camera);
    }
  };
});
