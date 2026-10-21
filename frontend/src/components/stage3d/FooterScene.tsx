import { useEffect, useRef } from "react";
import {
  ACESFilmicToneMapping,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createPhone, createRockGeometry } from "./models";
import { disposeScene } from "./stage";
import { createCoinFace, createReelScreen } from "./textures";

/**
 * Where each prop floats over the wordmark: x/y in -1…1 of the slot,
 * size as a fraction of the slot height, plus a spin and drift phase.
 */
const ROCKS = [
  { seed: 3, x: -0.97, y: -0.78, size: 0.55, spin: 0.08 },
  { seed: 11, x: -0.56, y: -0.42, size: 0.3, spin: -0.12 },
  { seed: 19, x: 0.9, y: -0.68, size: 0.72, spin: 0.06 },
  { seed: 27, x: 0.2, y: 0.52, size: 0.11, spin: 0.25 },
  { seed: 35, x: 0.62, y: 0.3, size: 0.07, spin: -0.3 },
];
const FOV = 30;
const CAMERA_Z = 14;

/**
 * Footer props, Turion-style: glossy obsidian rocks, a phone playing a reel
 * and a gold coin floating in front of the giant wordmark. Its own small
 * canvas, created only once the footer is near the viewport; drifts gently,
 * leans toward the pointer and rises as the footer scrolls in.
 */
export default function FooterScene({ image, className = "" }: { image: string; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the wordmark stands on its own
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04).texture;
    scene.environment = environment;
    room.dispose();
    pmrem.dispose();
    // Warm sky above, amber bounce from below, like the gradient behind
    scene.add(new HemisphereLight(0xfff3e4, 0xd2965a, 0.9));
    const key = new DirectionalLight(0xfff1df, 2.2);
    key.position.set(-4, 6, 6);
    const rim = new DirectionalLight(0xe0ad7a, 1.6);
    rim.position.set(5, -2, -3);
    scene.add(key, rim);

    const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.set(0, 0, CAMERA_Z);

    // Near-black stone that only catches a few warm glints, like polished obsidian
    const obsidian = new MeshPhysicalMaterial({
      color: 0x0c0907,
      roughness: 0.48,
      metalness: 0.1,
      clearcoat: 0.45,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.35,
      flatShading: true,
    });
    const rocks = ROCKS.map((r) => {
      const mesh = new Mesh(createRockGeometry(r.seed), obsidian);
      mesh.rotation.set(r.seed * 0.7, r.seed * 1.3, r.seed * 0.4);
      scene.add(mesh);
      return { ...r, mesh };
    });

    const darkBody = new MeshPhysicalMaterial({ color: 0x1c1b1a, metalness: 0.55, roughness: 0.32, clearcoat: 0.5 });
    const phone = createPhone(createReelScreen(image, "Batch 04 · approved"), darkBody);
    const phoneRig = new Group();
    phoneRig.add(phone);
    scene.add(phoneRig);

    const gold = new MeshPhysicalMaterial({ color: 0xb8722f, metalness: 0.6, roughness: 0.3, clearcoat: 0.7 });
    const face = new MeshStandardMaterial({ map: createCoinFace("spark", "#b8722f"), roughness: 0.3, metalness: 0.3 });
    const coin = new Mesh(new CylinderGeometry(0.5, 0.5, 0.14, 56), [gold, face, face]);
    scene.add(coin);

    let halfH = 1;
    let halfW = 1;
    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      halfH = Math.tan(MathUtils.degToRad(FOV / 2)) * CAMERA_Z;
      halfW = halfH * camera.aspect;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const pointer = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let visible = false;
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    io.observe(host);

    let time = 0;
    let last = performance.now();
    const draw = () => {
      // 0 while the slot is below the fold, 1 once it sits fully on screen
      const rect = host.getBoundingClientRect();
      const enter = MathUtils.clamp((window.innerHeight - rect.top) / Math.max(rect.height, 1), 0, 1);
      const rise = (1 - enter) * 0.6;
      const ease = 0.05;
      tilt.x += (pointer.y * 0.15 - tilt.x) * ease;
      tilt.y += (pointer.x * 0.2 - tilt.y) * ease;

      for (const r of rocks) {
        const scale = (r.size * halfH * 2) / 2;
        r.mesh.scale.setScalar(scale);
        r.mesh.position.set(
          r.x * halfW + tilt.y * scale,
          (r.y - rise * (0.4 + r.size)) * halfH + Math.sin(time * 0.6 + r.seed) * 0.08 * halfH * r.size,
          r.size * 2,
        );
        r.mesh.rotation.set(r.seed * 0.7 + time * r.spin, r.seed * 1.3 + time * r.spin * 1.5, r.seed * 0.4);
      }

      const phoneScale = (0.55 * halfH * 2) / 2.04;
      phoneRig.scale.setScalar(phoneScale);
      phoneRig.position.set(-0.12 * halfW, (-0.02 - rise) * halfH + Math.sin(time * 0.8) * 0.04 * halfH, 1.5);
      phoneRig.rotation.set(0.25 + tilt.x, -0.55 + Math.sin(time * 0.35) * 0.18 + tilt.y, 0.32);

      const coinScale = (0.16 * halfH * 2) / 1;
      coin.scale.setScalar(coinScale);
      coin.position.set(0.3 * halfW, (0.18 - rise * 0.8) * halfH + Math.sin(time * 0.9 + 1) * 0.05 * halfH, 1.2);
      coin.rotation.set(Math.PI / 2 + 0.4, time * 0.9, 0.3);

      renderer.render(scene, camera);
    };

    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || document.hidden) return;
      time += dt;
      draw();
    };
    // Reduced motion: one still frame, redrawn only when the slot resizes
    const redraw = () => draw();
    if (reduce) {
      time = 2;
      draw();
      window.addEventListener("resize", redraw);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", redraw);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      io.disconnect();
      disposeScene(scene);
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [image]);

  return <div ref={hostRef} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
