import { useEffect, useRef } from "react";

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uHover;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uImg;
varying vec2 vUv;

// object-fit: cover for the texture
vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y;
  float ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 d = vUv - uMouse;
  d.x *= uRes.x / uRes.y;
  float dist = length(d);
  vec2 dir = dist > 0.0001 ? d / dist : vec2(0.0);

  // Rings spreading out from the cursor, plus a drag in the direction of travel
  float wave = sin(dist * 30.0 - uTime * 7.5) * exp(-dist * 4.5);
  vec2 offset = (dir * wave * 0.02 + uVel * 1.4 * exp(-dist * 4.0)) * uHover;

  // Gentle push-in while hovered
  vec2 uv = (vUv - 0.5) * (1.0 - 0.07 * uHover) + 0.5 + offset;
  vec2 st = cover(uv);

  // Chromatic split that follows the distortion
  float split = length(offset) * 0.8 + 0.0015 * uHover;
  float r = texture2D(uTex, st + vec2(split, 0.0)).r;
  float g = texture2D(uTex, st).g;
  float b = texture2D(uTex, st - vec2(split, 0.0)).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/**
 * Image that turns liquid under the cursor: ripples spread from the pointer,
 * the picture drags with the mouse, and colours split slightly at the edges.
 *
 * The plain <img> always renders; a WebGL canvas is only created on the first
 * hover (mouse users, no reduced motion) and its loop sleeps when idle. If
 * WebGL or a CORS-enabled texture isn't available it quietly stays a photo.
 */
export function DistortImage({
  src,
  alt,
  className = "",
  imgClassName = "",
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    let gl: WebGLRenderingContext | null = null;
    let failed = false;
    let ready = false;
    let raf = 0;
    let uniforms: Record<string, WebGLUniformLocation | null> = {};
    const img = { w: 1, h: 1 };
    const s = { mx: 0.5, my: 0.5, tx: 0.5, ty: 0.5, vx: 0, vy: 0, hover: 0, target: 0, time: 0, last: 0 };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl?.viewport(0, 0, canvas.width, canvas.height);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!gl || !ready) return;
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.05) : 1 / 60;
      s.last = now;
      s.time += dt;
      s.hover += (s.target - s.hover) * Math.min(dt * 5, 1);
      const px = s.mx;
      const py = s.my;
      s.mx += (s.tx - s.mx) * Math.min(dt * 9, 1);
      s.my += (s.ty - s.my) * Math.min(dt * 9, 1);
      const clamp = (v: number) => Math.max(-0.06, Math.min(0.06, v));
      s.vx += (clamp(((s.mx - px) / dt) * 0.02) - s.vx) * 0.25;
      s.vy += (clamp(((s.my - py) / dt) * 0.02) - s.vy) * 0.25;

      gl.uniform2f(uniforms.uMouse ?? null, s.mx, s.my);
      gl.uniform2f(uniforms.uVel ?? null, -s.vx, -s.vy);
      gl.uniform1f(uniforms.uHover ?? null, s.hover);
      gl.uniform1f(uniforms.uTime ?? null, s.time);
      gl.uniform2f(uniforms.uRes ?? null, canvas.width, canvas.height);
      gl.uniform2f(uniforms.uImg ?? null, img.w, img.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (s.target === 0 && s.hover < 0.004) {
        // Settled back to a still photo: hand over to the <img> and sleep
        canvas.style.opacity = "0";
        s.last = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!ready || raf) return;
      canvas.style.opacity = "1";
      raf = requestAnimationFrame(frame);
    };

    const init = () => {
      if (gl || failed) return;
      gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
      if (!gl) {
        failed = true;
        return;
      }
      const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      const program = gl.createProgram();
      if (!vs || !fs || !program) {
        failed = true;
        return;
      }
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        failed = true;
        return;
      }
      gl.useProgram(program);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      for (const name of ["uTex", "uMouse", "uVel", "uHover", "uTime", "uRes", "uImg"]) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }

      const texture = gl.createTexture();
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => {
        if (!gl) return;
        try {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.uniform1i(uniforms.uTex ?? null, 0);
        } catch {
          // Cross-origin image without CORS: keep the plain photo
          failed = true;
          return;
        }
        img.w = image.naturalWidth || 1;
        img.h = image.naturalHeight || 1;
        ready = true;
        resize();
        if (s.target > 0) start();
      };
      image.onerror = () => {
        failed = true;
      };
      image.src = src;
    };

    const setPointer = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      s.tx = (e.clientX - r.left) / Math.max(r.width, 1);
      s.ty = 1 - (e.clientY - r.top) / Math.max(r.height, 1);
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      init();
      if (failed) return;
      resize();
      setPointer(e);
      if (s.hover < 0.01) {
        s.mx = s.tx;
        s.my = s.ty;
      }
      s.target = 1;
      start();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") setPointer(e);
    };
    const onLeave = () => {
      s.target = 0;
      start();
    };

    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      gl = null;
      uniforms = {};
    };
  }, [src]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <img src={src} alt={alt} loading="lazy" className={imgClassName} />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-300"
      />
    </div>
  );
}
