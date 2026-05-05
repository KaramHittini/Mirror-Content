"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle, Color } from "ogl";

const VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
varying vec2 vUv;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  float t = uTime * 0.15;
  vec2 uv = vUv;

  float noise1 = snoise(uv * 1.5 + vec2(t * 0.4, t * 0.2)) * uAmplitude;
  float noise2 = snoise(uv * 2.0 - vec2(t * 0.3, t * 0.5)) * uAmplitude * 0.7;
  float noise3 = snoise(uv * 3.0 + vec2(t * 0.2, -t * 0.3)) * uAmplitude * 0.4;

  float combined = noise1 + noise2 + noise3;

  float t1 = smoothstep(-1.0, 1.0, combined);
  float t2 = smoothstep(-0.5, 1.5, combined + 0.3);

  vec3 col = mix(uColorStops[0], uColorStops[1], t1);
  col = mix(col, uColorStops[2], t2 * 0.6);

  float alpha = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
  alpha *= 0.55;

  gl_FragColor = vec4(col, alpha);
}
`;

interface AuroraProps {
  colorStops?: [string, string, string];
  amplitude?: number;
  speed?: number;
}

export default function Aurora({
  colorStops = ["#4f46e5", "#7c3aed", "#a78bfa"],
  amplitude = 1.0,
  speed = 1.0,
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new Renderer({ alpha: true, antialias: false });
    const gl = renderer.gl;
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.clearColor(0, 0, 0, 0);
    el.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(el.offsetWidth, el.offsetHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const geometry = new Triangle(gl);

    const toVec3 = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return new Color(r, g, b);
    };

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStops.map(toVec3) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new Mesh(gl, { geometry, program });

    let raf: number;
    let start = performance.now();

    const update = () => {
      raf = requestAnimationFrame(update);
      const elapsed = (performance.now() - start) / 1000;
      program.uniforms.uTime.value = elapsed * speed;
      renderer.render({ scene: mesh });
    };
    update();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [amplitude, speed, colorStops]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
