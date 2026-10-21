import { type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Scene, type Texture } from "three";
import type { LayerSpec, StageRegistry } from "./registry";
import { BUILDERS, type BuiltScene, type Kit } from "./scenes";
import { createStage, disposeScene, type StageLayer } from "./stage";
import {
  type CoinIcon,
  createCoinFace,
  createKeyboardDeck,
  createLidLogo,
  createPortalScreen,
  createReelScreen,
} from "./textures";

/** Reads a palette token where the public site defines it (scoped, not on :root). */
function css(name: string, fallback: string) {
  const scope = document.querySelector(".public-site") ?? document.documentElement;
  return getComputedStyle(scope).getPropertyValue(name).trim() || fallback;
}

const REEL_CAPTIONS = [
  "Strength drop teaser",
  "Serum launch countdown",
  "Sourdough, step by step",
  "Spring lookbook",
  "Living room refresh",
  "Unboxing in 15 seconds",
];
const COIN_ICONS: CoinIcon[] = ["play", "check", "clock", "heart", "spark"];

/**
 * Owns the WebGL stage for a 3D page: builds the shared palette, materials and
 * textures, then a scene for every layer the page registers (and drops it when
 * its section unmounts). Theme switches re-skin everything in place.
 */
export default function StageRuntime({
  registry,
  root,
  images,
  reduce,
  onLive,
}: {
  registry: StageRegistry;
  root: RefObject<HTMLElement | null>;
  images: string[];
  reduce: boolean;
  onLive: (live: boolean) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onLiveRef = useRef(onLive);
  onLiveRef.current = onLive;

  // This page's own public-site root, found after commit (refs are attached by
  // then): while a route change renders, the outgoing page's root can still be
  // the document's first match
  const [container, setContainer] = useState<Element | null>(null);
  useEffect(() => {
    setContainer(root.current?.closest(".public-site") ?? document.body);
  }, [root]);

  useEffect(() => {
    // The host div is only portalled in once the container is known
    const host = container && hostRef.current;
    const rootEl = root.current;
    if (!host || !rootEl) return;

    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(host, rootEl, { reduce });
    } catch {
      onLiveRef.current(false);
      return; // No WebGL: sections keep their CSS backgrounds
    }
    stage.onLive(() => onLiveRef.current(true));

    const palette = { brand: new Color(), brandLight: new Color(), heroDark: new Color(), brandLit: new Color() };
    const readPalette = () => {
      palette.brand.set(css("--site-blue-deep", "#d2965a"));
      palette.brandLight.set(css("--site-blue-light", "#e0ad7a"));
      palette.heroDark.set(css("--hero-dark", "#0a0908"));
      // Lit, tone-mapped surfaces wash a mid amber out to cream, so props get a
      // deeper, more saturated amber that renders as the brand colour
      palette.brandLit.copy(palette.brand).offsetHSL(0, 0.12, -0.14);
    };
    readPalette();

    const portal = createPortalScreen(images);
    const kit: Kit = {
      stage,
      reduce,
      palette,
      ink: new Color("#1a1615"),
      mats: {
        darkBody: new MeshPhysicalMaterial({ color: 0x1c1b1a, metalness: 0.55, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
        chrome: new MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 }),
        // Burnished gold: metallic enough to pick up the studio reflections, soft enough to read as amber
        brandGloss: new MeshPhysicalMaterial({ roughness: 0.32, metalness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
        white: new MeshPhysicalMaterial({ color: 0xf5eee3, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
        whiteTrim: new MeshPhysicalMaterial({ color: 0xe3d5c0, roughness: 0.45 }),
        mailboxBody: new MeshPhysicalMaterial({ color: 0x161312, roughness: 0.5, metalness: 0.35, clearcoat: 0.25 }),
        buttonBase: new MeshPhysicalMaterial({ color: 0x12100f, roughness: 0.28, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 }),
      },
      tex: {
        portal: portal.texture,
        deck: createKeyboardDeck(),
        lidLogo: createLidLogo(),
        reels: images.slice(0, 5).map((src, i) => createReelScreen(src, REEL_CAPTIONS[i] ?? "")),
      },
      coinFaces: (): Texture[] =>
        COIN_ICONS.flatMap((icon) => [createCoinFace(icon, `#${palette.brandLit.getHexString()}`), createCoinFace(icon, "#172338")]),
    };
    const applyPalette = () => {
      kit.mats.brandGloss.color.copy(palette.brandLit);
      // The screens are always dark, so they take amber itself
      portal.setAccent("#d2965a");
    };
    applyPalette();

    const built = new Map<LayerSpec, { layer: StageLayer; scene: BuiltScene }>();
    // Scenes whose sections unmounted; freed with the stage (they share materials with live ones)
    const retired: Scene[] = [];
    const sync = () => {
      for (const spec of registry.specs) {
        if (built.has(spec)) continue;
        const scene = BUILDERS[spec.kind](kit, spec);
        const layer: StageLayer = {
          views: spec.views,
          section: spec.section,
          scene: scene.scene,
          camera: scene.camera,
          update: scene.update,
          background: scene.background,
        };
        stage.add(layer);
        built.set(spec, { layer, scene });
      }
      for (const [spec, entry] of built) {
        if (registry.specs.has(spec)) continue;
        stage.remove(entry.layer);
        retired.push(entry.layer.scene);
        built.delete(spec);
      }
    };
    sync();
    const unsubscribe = registry.subscribe(sync);

    const themeObserver = new MutationObserver(() => {
      readPalette();
      applyPalette();
      for (const { scene } of built.values()) scene.onTheme?.();
      stage.refreshTones();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      unsubscribe();
      themeObserver.disconnect();
      for (const scene of retired) disposeScene(scene);
      stage.dispose();
      onLiveRef.current(false);
    };
  }, [registry, root, images, reduce, container]);

  // Portalled into the public-site root (an isolated stacking context with its
  // own fill) so it paints above that fill but behind every section's content
  if (!container) return null;
  return createPortal(<div ref={hostRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-1" />, container);
}
