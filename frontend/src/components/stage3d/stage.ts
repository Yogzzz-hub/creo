import { cancelFrame, frame } from "motion/react";
import type { RefObject } from "react";
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Material,
  Mesh,
  Points,
  PMREMGenerator,
  type PerspectiveCamera,
  type Scene,
  Texture,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface StageFrame {
  /** 0 → 1 while a tall section scrolls past its sticky viewport */
  progress: number;
  /** 0 → 1 from the view's top entering at the bottom to its bottom leaving at the top */
  pass: number;
  /** 0 → 1 from the view's top entering at the bottom until it is fully on screen */
  enter: number;
  time: number;
  dt: number;
  aspect: number;
  mobile: boolean;
}

export interface StageLayer {
  /** Slots the scene may render into; the first one with a size wins (desktop vs mobile slot) */
  views: RefObject<HTMLElement | null>[];
  /** Section the 3D is clipped to and whose scroll drives `progress` */
  section: RefObject<HTMLElement | null>;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Pose the scene for this frame; return false to skip drawing it */
  update: (f: StageFrame) => boolean | undefined;
  /** Replaces the section's painted background colour for this frame */
  background?: (f: StageFrame) => Color;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

function intersect(a: Box, b: Box): Box | null {
  const box = {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
  return box.right - box.left < 1 || box.bottom - box.top < 1 ? null : box;
}

/** Frees every geometry, material and texture a scene owns. */
export function disposeScene(scene: Scene) {
  const materials = new Set<Material>();
  scene.traverse((object) => {
    if (object instanceof Mesh || object instanceof Points) {
      object.geometry.dispose();
      for (const m of Array.isArray(object.material) ? object.material : [object.material]) materials.add(m);
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
    material.dispose();
  }
}

/**
 * One WebGL canvas, fixed behind the landing page, that both paints every
 * `.home-tone` section's background colour and draws each section's 3D scene
 * into that section's slot on the page (scissored to the section). DOM text
 * sits on top, so headings can overlap the 3D like the reference.
 *
 * Runs in Motion's render step, after Lenis has scrolled for the frame, so
 * painted section edges never lag the DOM by a frame.
 */
export function createStage(host: HTMLElement, root: HTMLElement, { reduce }: { reduce: boolean }) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
  renderer.autoClear = false;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setScissorTest(true);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  host.appendChild(renderer.domElement);

  // Studio reflections give every prop its gloss without any image files
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();

  const layers: StageLayer[] = [];
  let tones: { el: HTMLElement; color: Color }[] = [];
  const readTones = () => {
    tones = Array.from(root.querySelectorAll<HTMLElement>(".st-tone")).map((el) => ({
      el,
      color: new Color(getComputedStyle(el).getPropertyValue("--tone-bg").trim() || "#000000"),
    }));
  };
  readTones();

  let width = window.innerWidth;
  let height = window.innerHeight;
  const resize = () => {
    // The fixed host excludes the scrollbar; window.innerWidth doesn't
    width = host.clientWidth || window.innerWidth;
    height = host.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  const scissor = (box: Box) => {
    renderer.setScissor(box.left, height - box.bottom, box.right - box.left, box.bottom - box.top);
  };

  const viewport: Box = { left: 0, top: 0, right: 0, bottom: 0 };
  let time = 0;
  let last = performance.now();
  let sinceTones = 0;
  let onLive: (() => void) | undefined;
  let live = false;

  const frameFor = (layer: StageLayer, view: DOMRect, dt: number): StageFrame => {
    const section = layer.section.current?.getBoundingClientRect() ?? view;
    return {
      progress: clamp01(-section.top / Math.max(section.height - height, 1)),
      pass: clamp01((height - view.top) / (height + view.height)),
      enter: clamp01((height - view.top) / Math.max(view.height, 1)),
      time,
      dt,
      aspect: view.width / Math.max(view.height, 1),
      mobile: width < 768,
    };
  };

  const tick = () => {
    const now = performance.now();
    const dt = reduce ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;
    if (document.hidden) return;
    time += dt;
    sinceTones += dt;
    if (sinceTones > 1) {
      sinceTones = 0;
      readTones();
    }
    viewport.right = width;
    viewport.bottom = height;

    renderer.setScissor(0, 0, width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, false);

    // Work out each layer's slot and frame once
    const active = layers.map((layer) => {
      const el = layer.views.map((v) => v.current).find((v) => v && v.offsetWidth > 0 && v.offsetHeight > 0);
      if (!el) return null;
      const view = el.getBoundingClientRect();
      return { layer, view, frame: frameFor(layer, view, dt) };
    });

    // Section backgrounds
    for (const tone of tones) {
      const rect = tone.el.getBoundingClientRect();
      const box = intersect(rect, viewport);
      if (!box) continue;
      const owner = active.find((a) => a?.layer.section.current === tone.el && a.layer.background);
      const color = owner?.layer.background ? owner.layer.background(owner.frame) : tone.color;
      scissor(box);
      renderer.setClearColor(color, 1);
      renderer.clear(true, false, false);
    }

    // Scenes, each clipped to its own section
    for (const entry of active) {
      if (!entry) continue;
      const { layer, view } = entry;
      const sectionRect = layer.section.current?.getBoundingClientRect() ?? view;
      const clip = intersect(view, viewport);
      const box = clip && intersect(clip, sectionRect);
      if (!box) continue;
      if (layer.update(entry.frame) === false) continue;
      layer.camera.aspect = entry.frame.aspect;
      layer.camera.updateProjectionMatrix();
      renderer.setViewport(view.left, height - view.bottom, view.width, view.height);
      scissor(box);
      renderer.clearDepth();
      renderer.render(layer.scene, layer.camera);
    }

    if (!live) {
      live = true;
      onLive?.();
    }
  };
  frame.render(tick, true);

  return {
    environment,
    /** Standard key, rim and fill lights plus the shared reflections */
    light(scene: Scene) {
      scene.environment = environment;
      const hemi = new HemisphereLight(0xfff4ea, 0x2a241e, 0.55);
      const key = new DirectionalLight(0xffffff, 1.9);
      key.position.set(4, 6, 5);
      const rim = new DirectionalLight(0xffffff, 1.1);
      rim.position.set(-5, 2, -4);
      scene.add(hemi, key, rim);
      return rim;
    },
    add(layer: StageLayer) {
      layers.push(layer);
      readTones();
    },
    remove(layer: StageLayer) {
      const index = layers.indexOf(layer);
      if (index >= 0) layers.splice(index, 1);
    },
    refreshTones: readTones,
    onLive(callback: () => void) {
      onLive = callback;
    },
    dispose() {
      cancelFrame(tick);
      resizeObserver.disconnect();
      for (const layer of layers) disposeScene(layer.scene);
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export type Stage = ReturnType<typeof createStage>;
