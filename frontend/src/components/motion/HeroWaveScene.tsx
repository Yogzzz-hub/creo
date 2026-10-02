import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uScroll;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vHeight;
  varying float vSeed;
  varying float vFade;

  void main() {
    vec3 p = position;
    float t = uTime * 0.35;
    // Layered travelling waves give an organic, fabric-like surface
    float h = sin(p.x * 0.55 + t * 1.6) * 0.55
            + sin(p.z * 0.8 + t * 1.1) * 0.35
            + sin((p.x + p.z) * 0.35 - t * 0.8) * 0.45;
    // Gentle swell toward the pointer
    float d = distance(p.xz, uPointer * vec2(9.0, 5.0));
    h += exp(-d * d * 0.08) * 0.9;
    p.y += h - uScroll * 1.6;

    vHeight = h;
    vSeed = aSeed;
    vFade = smoothstep(14.0, 4.0, abs(p.x)) * smoothstep(9.0, 2.0, abs(p.z + 1.0));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.2 + aSeed * 2.4) * uPixelRatio * (9.0 / -mv.z);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uBlue;
  uniform vec3 uMist;
  uniform vec3 uGold;
  varying float vHeight;
  varying float vSeed;
  varying float vFade;

  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, r);
    vec3 col = mix(uBlue, uMist, smoothstep(-0.6, 1.2, vHeight));
    // A sparse set of warm glints so it doesn't read as a stock blue gradient
    col = mix(col, uGold, step(0.965, vSeed) * 0.85);
    float alpha = soft * vFade * (0.35 + 0.45 * smoothstep(-0.8, 1.4, vHeight));
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Animated particle wave field for the landing hero (brand palette only).
 * Pauses when offscreen or the tab is hidden; renders one still frame when the
 * user prefers reduced motion.
 */
export default function HeroWaveScene({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the section's CSS gradients still look complete
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 768px)").matches;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 4.2, 11);
    camera.lookAt(0, 0, 0);

    // Grid of points on the XZ plane
    const cols = small ? 90 : 150;
    const rows = small ? 45 : 70;
    const count = cols * rows;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions[i * 3] = (c / (cols - 1) - 0.5) * 28;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (r / (rows - 1) - 0.5) * 16;
        seeds[i] = Math.random();
        i++;
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: [0, 0] as [number, number] },
      uScroll: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uBlue: { value: new Color("var(--color-nebula-glow)") },
      uMist: { value: new Color("var(--color-nebula-periwinkle)") },
      uGold: { value: new Color("var(--color-nebula-sand)") },
    };
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const points = new Points(geometry, material);
    points.rotation.x = -0.08;
    scene.add(points);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Pointer → eased target, so the swell glides instead of snapping
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    io.observe(host);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      uniforms.uTime.value += dt;
      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;
      uniforms.uPointer.value = [current.x, current.y];
      const rect = host.getBoundingClientRect();
      uniforms.uScroll.value = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), 0), 1);
      points.rotation.y = current.x * 0.12;
      camera.position.y = 4.2 - current.y * 0.4;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    if (reduce) {
      uniforms.uTime.value = 2.4;
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      io.disconnect();
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
