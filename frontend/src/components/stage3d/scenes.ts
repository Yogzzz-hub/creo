import {
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  type MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  type Texture,
  Vector3,
} from "three";
import {
  createBigButton,
  createBlockCube,
  createChromeMark,
  createCoinStack,
  createCoins,
  createLaptop,
  createMailbox,
  createMegaphone,
  createPhone,
  createSpeechBubble,
} from "./models";
import type { LayerSpec, SceneKind } from "./registry";
import { createSparkleField } from "./sparkles";
import type { Stage, StageFrame } from "./stage";

/** Shared palette, materials and textures every scene builds from. */
export interface Kit {
  stage: Stage;
  reduce: boolean;
  /** `brandLit` is the brand colour pre-darkened for lit 3D surfaces */
  palette: { brand: Color; brandLight: Color; heroDark: Color; brandLit: Color };
  ink: Color;
  mats: {
    darkBody: MeshPhysicalMaterial;
    chrome: MeshStandardMaterial;
    brandGloss: MeshPhysicalMaterial;
    white: MeshPhysicalMaterial;
    whiteTrim: MeshPhysicalMaterial;
    mailboxBody: MeshPhysicalMaterial;
    buttonBase: MeshPhysicalMaterial;
  };
  tex: { portal: Texture; deck: Texture; lidLogo: Texture; reels: Texture[] };
  coinFaces: () => Texture[];
}

export interface BuiltScene {
  scene: Scene;
  camera: PerspectiveCamera;
  update: (f: StageFrame) => boolean | undefined;
  background?: (f: StageFrame) => Color;
  /** Re-skin anything the shared materials don't cover */
  onTheme?: () => void;
}

const smooth = (a: number, b: number, v: number) => MathUtils.smoothstep(v, a, b);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const FOV = 35;
export const TAN = Math.tan(MathUtils.degToRad(FOV / 2));

function camera(z: number, y = 0) {
  const cam = new PerspectiveCamera(FOV, 1, 0.05, 100);
  cam.position.set(0, y, z);
  return cam;
}

function lit(kit: Kit) {
  const scene = new Scene();
  kit.stage.light(scene);
  return scene;
}

/** Swaps fresh coin-face textures (in the current brand colour) onto coin materials. */
function refreshCoins(kit: Kit, materials: MeshStandardMaterial[]) {
  const fresh = kit.coinFaces();
  materials.forEach((m, i) => {
    m.map?.dispose();
    m.map = fresh[i % fresh.length] ?? null;
    m.needsUpdate = true;
  });
}

/** Normalised scroll for a scene: sticky progress, or the slot's pass across the screen. */
function driveOf(spec: LayerSpec, f: StageFrame, fallback: "progress" | "pass") {
  const drive = spec.drive ?? fallback;
  if (drive === "pass" || (f.mobile && fallback === "progress" && spec.drive !== "progress")) return smooth(0.12, 0.8, f.pass);
  return f.progress;
}

// ── Home hero: the mark floods the screen, a laptop opens, the camera dives in ──

function heroDive(kit: Kit): BuiltScene {
  const scene = lit(kit);
  const cam = camera(9, 1);
  const chromeMark = createChromeMark(kit.mats.chrome);
  scene.add(chromeMark);
  const laptop = createLaptop({ screen: kit.tex.portal, deck: kit.tex.deck, lidLogo: kit.tex.lidLogo, body: kit.mats.darkBody });
  const rig = new Group();
  laptop.root.position.y = -0.1;
  rig.add(laptop.root);
  scene.add(rig);
  const phones = [0, 1].map((i) => createPhone(kit.tex.reels[i] as Texture, kit.mats.darkBody));
  for (const phone of phones) scene.add(phone);
  // Four chrome stars at different depths (one gold), turned and lifted by the scroll
  const sparkles = createSparkleField({
    aspect: window.innerWidth / Math.max(window.innerHeight, 1),
    gold: kit.palette.brand,
  });
  for (const mesh of sparkles.meshes) scene.add(mesh);

  const closedTilt = new Quaternion().setFromAxisAngle(new Vector3(0.8, -0.55, 0.3).normalize(), 1.15);
  const openTilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.14);
  const screenPos = new Vector3();
  const screenNormal = new Vector3();
  const screenQuat = new Quaternion();
  const camBase = new Vector3();
  const camEnd = new Vector3();
  const look = new Vector3();
  const lookBase = new Vector3(0, 0.55, 0);
  const bg = kit.palette.brand.clone();
  // Reduced motion skips the dive: the hero is just the headline on dark
  const progressOf = (p: number) => (kit.reduce ? 1 : p);

  return {
    scene,
    camera: cam,
    background: (f) => {
      const p = progressOf(f.progress);
      if (p < 0.115) return bg.copy(kit.palette.heroDark);
      return bg.lerpColors(kit.palette.brand, kit.palette.heroDark, smooth(0.6, 0.8, p));
    },
    update: (f) => {
      const p = progressOf(f.progress);
      const t = f.time;
      const appear = smooth(0.1, 0.32, p);
      const turn = smooth(0.12, 0.58, p);
      const dive = smooth(0.6, 0.82, p);

      // Stars hold almost still; the scroll turns and lifts them, the dive adds
      // parallax
      sparkles.update(t, p);

      // The props only exist between the flood and the end of the dive
      const showProps = p >= 0.08 && p <= 0.86;
      rig.visible = showProps;

      laptop.setOpen(smooth(0.34, 0.58, p));
      rig.quaternion.slerpQuaternions(closedTilt, openTilt, easeInOut(turn));
      rig.rotateY(Math.sin(t * 0.6) * 0.06 * (1 - dive));
      rig.scale.setScalar(MathUtils.lerp(0.55, 1, appear));
      rig.position.y = MathUtils.lerp(-0.8, 0, appear) + Math.sin(t * 0.9) * 0.05 * (1 - dive);

      chromeMark.visible = showProps && dive < 0.9;
      chromeMark.position.set(0, 0.4, MathUtils.lerp(-2.4, 1.5, dive));
      chromeMark.rotation.set(Math.sin(t * 0.35) * 0.18 + p * 0.5, Math.sin(t * 0.3) * 0.3 + p * 0.9, -0.25 + p * 1.1 + t * 0.04);
      chromeMark.scale.setScalar(MathUtils.lerp(1.6, 1.05, appear) * (1 + dive * 0.8));

      phones.forEach((phone, i) => {
        const side = i === 0 ? -1 : 1;
        phone.visible = showProps && dive < 0.85;
        if (f.mobile) phone.position.set(side * 0.95, side * -2.35, -0.6);
        else phone.position.set(side * (2.95 + dive * 3), (i === 0 ? 0.45 : -0.4) + Math.sin(t * 0.8 + i * 2) * 0.12, 0.4);
        phone.rotation.set(0.1 * side, -side * 0.45 + Math.sin(t * 0.5 + i) * 0.12 + p * side * 0.6, side * 0.08);
        phone.scale.setScalar(MathUtils.lerp(0.4, f.mobile ? 0.62 : 0.9, appear));
      });

      // Frame the laptop for any aspect, then fly into its screen
      // Narrow screens frame the laptop tighter so it stays legible
      camBase.set(0, 1, Math.max(9, (f.mobile ? 3.7 : 4.8) / (2 * TAN * f.aspect)));
      laptop.screen.getWorldPosition(screenPos);
      laptop.screen.getWorldQuaternion(screenQuat);
      screenNormal.set(0, 0, 1).applyQuaternion(screenQuat);
      camEnd.copy(screenPos).addScaledVector(screenNormal, (0.92 / TAN) * 0.82);
      const d = easeInOut(dive);
      cam.position.lerpVectors(camBase, camEnd, d);
      look.lerpVectors(lookBase, screenPos, d);
      cam.lookAt(look);
      // The screen dims to the dark the headline sits on
      laptop.screenMaterial.color.setScalar(1 - smooth(0.76, 0.85, p));
      return true;
    },
  };
}

// ── Blocks: scattered pieces build a cube; "manifesto" then turns it brand and bursts it into coins ──

function blocks(kit: Kit, spec: LayerSpec): BuiltScene {
  const scene = lit(kit);
  const cam = camera(14, 0.6);
  cam.lookAt(0, 0, 0);
  const material = new MeshPhysicalMaterial({ color: kit.ink, roughness: 0.32, metalness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  const cube = createBlockCube(material);
  const coins = createCoins(kit.coinFaces(), kit.mats.brandGloss);
  const rig = new Group();
  rig.add(cube.root, coins.root);
  scene.add(rig);
  const manifesto = (spec.mode ?? "manifesto") === "manifesto";
  return {
    scene,
    camera: cam,
    onTheme: () => refreshCoins(kit, coins.materials),
    update: (f) => {
      const p = driveOf(spec, f, "progress");
      if (manifesto) {
        const q = p * 4;
        cube.setAssembly(smooth(0, 0.95, q));
        material.color.lerpColors(kit.ink, kit.palette.brandLit, smooth(2, 2.7, q));
        const burst = smooth(3, 3.7, q);
        cube.root.visible = burst < 0.999;
        cube.root.scale.setScalar(1 - burst * 0.9);
        coins.setBurst(burst, f.time);
        rig.rotation.set(0.42, f.time * 0.12 + q * 0.7, 0);
      } else {
        cube.setAssembly(smooth(0.05, 0.85, p));
        material.color.lerpColors(kit.ink, kit.palette.brandLit, smooth(0.85, 1, p));
        coins.setBurst(0, f.time);
        rig.rotation.set(0.42, f.time * 0.12 + p * 2.2, 0);
      }
      rig.position.y = f.mobile ? 0 : -0.55;
      return true;
    },
  };
}

// ── Single props that turn as their slot crosses the screen ──

const IVORY = new Color("#f5eee3");
const IVORY_TRIM = new Color("#e3d5c0");
const MIDNIGHT = new Color("#172338");
const AMBER = new Color("#b8722f");

/**
 * Whether the prop's section is painted a light colour, re-read twice a second
 * (cheap) so theme switches are picked up. Light props flip to midnight on it.
 */
function lightTone(spec: LayerSpec) {
  const hsl = { h: 0, s: 0, l: 0 };
  const probe = new Color();
  let light = false;
  let checked = -1;
  return () => {
    const now = performance.now();
    if (now - checked < 500) return light;
    checked = now;
    const el = spec.section.current;
    if (el) light = probe.set(getComputedStyle(el).getPropertyValue("--tone-bg").trim() || "#000").getHSL(hsl).l > 0.5;
    return light;
  };
}

function bubble(kit: Kit, spec: LayerSpec): BuiltScene {
  const scene = lit(kit);
  const cam = camera(7.5);
  // Ivory on dark sections, midnight on light ones; the tick is amber either way
  const body = kit.mats.white.clone();
  const prop = createSpeechBubble(body, kit.mats.brandGloss);
  scene.add(prop);
  const isLight = lightTone(spec);
  return {
    scene,
    camera: cam,
    update: (f) => {
      body.color.copy(isLight() ? MIDNIGHT : IVORY);
      prop.rotation.set(0.18 + Math.sin(f.time * 0.5) * 0.05, -0.55 + f.pass * 1.1 + Math.sin(f.time * 0.6) * 0.08, 0.05);
      prop.position.y = Math.sin(f.time * 0.9) * 0.08;
      return true;
    },
  };
}

function mailbox(kit: Kit): BuiltScene {
  const scene = lit(kit);
  const cam = camera(9, 1.2);
  cam.lookAt(0, 0.1, 0);
  const prop = createMailbox(kit.mats.mailboxBody, kit.mats.brandGloss, kit.mats.white);
  prop.root.position.y = 0.1;
  scene.add(prop.root);
  return {
    scene,
    camera: cam,
    update: (f) => {
      prop.set(smooth(0.15, 0.7, f.pass));
      prop.root.rotation.set(0.05, -0.85 + f.pass * 0.55 + Math.sin(f.time * 0.4) * 0.04, 0);
      // Back off on narrow slots so the open door and flag stay in frame (~4 units wide)
      cam.position.z = Math.max(9, 4.2 / (2 * TAN * f.aspect));
      cam.lookAt(0, 0.1, 0);
      return true;
    },
  };
}

function megaphone(kit: Kit, spec: LayerSpec): BuiltScene {
  const scene = lit(kit);
  const cam = camera(6.4);
  // Ivory on dark sections, midnight with amber trim on light ones
  const body = kit.mats.white.clone();
  const trim = kit.mats.whiteTrim.clone();
  const prop = createMegaphone(body, trim);
  const bellMaterial = prop.bell.material as MeshPhysicalMaterial;
  scene.add(prop.root);
  const isLight = lightTone(spec);
  return {
    scene,
    camera: cam,
    update: (f) => {
      const light = isLight();
      body.color.copy(light ? MIDNIGHT : IVORY);
      bellMaterial.color.copy(body.color);
      trim.color.copy(light ? AMBER : IVORY_TRIM);
      prop.root.rotation.set(0.12, -0.55 + f.pass * 0.8, 0.12 + Math.sin(f.time * 0.7) * 0.04);
      prop.root.position.y = Math.sin(f.time * 0.8) * 0.06;
      // A little "shout" pulse through the bell
      const pulse = Math.max(0, Math.sin(f.time * 3)) ** 8;
      prop.bell.scale.set(1 + pulse * 0.04, 1, 1 + pulse * 0.04);
      return true;
    },
  };
}

function button(kit: Kit, spec: LayerSpec): BuiltScene {
  const scene = lit(kit);
  const cam = camera(2.9, 3.1);
  cam.lookAt(0, 0, 0);
  const prop = createBigButton(kit.mats.buttonBase, kit.mats.brandGloss, kit.mats.chrome);
  scene.add(prop.root);
  let press = 0;
  return {
    scene,
    camera: cam,
    update: (f) => {
      const target = spec.pressed?.current ? 1 : 0;
      press += (target - press) * (kit.reduce ? 1 : 1 - Math.exp(-f.dt * 22));
      prop.setPress(press);
      prop.root.rotation.y = f.time * 0.25;
      return true;
    },
  };
}

/** A laptop rising out of the footer (a phone on narrow screens). */
function device(kit: Kit): BuiltScene {
  const scene = lit(kit);
  const cam = camera(7.2, 1.2);
  const laptop = createLaptop({ screen: kit.tex.portal, deck: kit.tex.deck, lidLogo: kit.tex.lidLogo, body: kit.mats.darkBody });
  laptop.setOpen(0.92);
  const phone = createPhone(kit.tex.reels[2] as Texture, kit.mats.darkBody);
  scene.add(laptop.root, phone);
  return {
    scene,
    camera: cam,
    update: (f) => {
      const rise = easeInOut(f.enter);
      laptop.root.visible = !f.mobile;
      phone.visible = f.mobile;
      if (f.mobile) {
        phone.position.y = MathUtils.lerp(-2.6, 0.2, rise);
        phone.scale.setScalar(1.25);
        cam.position.set(0, 0.6, 6);
        cam.lookAt(0, 0.4, 0);
      } else {
        // Laptop spans ~60% of the slot and runs off its bottom edge
        laptop.root.position.y = MathUtils.lerp(-2.4, -0.35, rise);
        laptop.root.rotation.x = MathUtils.lerp(0.3, 0.08, rise);
        cam.position.set(0, 1.2, 3.2 / 0.6 / (f.aspect * 2 * TAN));
        cam.lookAt(0, 1, 0);
      }
      return true;
    },
  };
}

// ── Work hero: an open laptop with phones playing reels orbiting it ──

function deviceOrbit(kit: Kit): BuiltScene {
  const scene = lit(kit);
  const cam = camera(8, 1);
  const laptop = createLaptop({ screen: kit.tex.portal, deck: kit.tex.deck, lidLogo: kit.tex.lidLogo, body: kit.mats.darkBody });
  laptop.root.position.y = -0.55;
  scene.add(laptop.root);
  const ring = new Group();
  const phones = kit.tex.reels.map((reel, i, all) => {
    const phone = createPhone(reel, kit.mats.darkBody);
    const angle = (i / all.length) * Math.PI * 2;
    ring.add(phone);
    return { phone, angle, lift: i % 2 ? 0.55 : -0.25 };
  });
  scene.add(ring);
  const look = new Vector3();
  return {
    scene,
    camera: cam,
    update: (f) => {
      const p = kit.reduce ? 0.4 : f.progress;
      laptop.setOpen(MathUtils.lerp(0.2, 1, smooth(0, 0.3, p)));
      laptop.root.rotation.y = Math.sin(f.time * 0.4) * 0.05;
      const radius = f.mobile ? 2.3 : 3.4;
      ring.rotation.y = p * Math.PI * 1.6 + f.time * 0.06;
      for (const { phone, angle, lift } of phones) {
        phone.position.set(Math.sin(angle) * radius, lift + Math.sin(f.time * 0.8 + angle) * 0.1, Math.cos(angle) * radius);
        phone.rotation.set(0, angle, Math.sin(angle * 3) * 0.06);
        phone.scale.setScalar(f.mobile ? 0.6 : 0.78);
      }
      // Start low and close, then pull back and up over the ring as the section scrolls
      const fit = (radius * 2 + 1.4) / (2 * TAN * f.aspect);
      const pull = easeInOut(smooth(0.05, 0.9, p));
      cam.position.set(0, MathUtils.lerp(0.8, 2.6, pull), Math.max(MathUtils.lerp(6.2, 9, pull), fit));
      look.set(0, 0.35, 0);
      cam.lookAt(look);
      return true;
    },
  };
}

// ── Pricing hero: a coin stack that fans into a spiral ──

function coinStack(kit: Kit, spec: LayerSpec): BuiltScene {
  const scene = lit(kit);
  const cam = camera(8, 1.4);
  cam.lookAt(0, 0, 0);
  const stack = createCoinStack(kit.coinFaces(), kit.mats.brandGloss);
  scene.add(stack.root);
  return {
    scene,
    camera: cam,
    onTheme: () => refreshCoins(kit, stack.materials),
    update: (f) => {
      const p = kit.reduce ? 1 : driveOf(spec, f, "progress");
      stack.set(smooth(0.05, 0.8, p), f.time);
      stack.root.rotation.set(0.15, f.time * 0.15 + p * 1.4, 0);
      // Keep the whole spiral (about 5 units wide, 4.5 tall) inside the slot
      cam.position.z = Math.max(5.6 / (2 * TAN * f.aspect), 4.6 / (2 * TAN));
      return true;
    },
  };
}

// ── About hero: the chrome "c." with brand pearls orbiting it ──

function chromeMarkScene(kit: Kit, spec: LayerSpec): BuiltScene {
  const scene = lit(kit);
  const cam = camera(9.5);
  const mark = createChromeMark(kit.mats.chrome);
  scene.add(mark);
  const pearlGeometry = new SphereGeometry(0.32, 48, 32);
  const pearls = [0, 1, 2].map((i) => {
    const pearl = new Mesh(pearlGeometry, i === 1 ? kit.mats.white : kit.mats.brandGloss);
    scene.add(pearl);
    return pearl;
  });
  return {
    scene,
    camera: cam,
    update: (f) => {
      const p = kit.reduce ? 0.3 : driveOf(spec, f, "progress");
      mark.rotation.set(Math.sin(f.time * 0.3) * 0.15 + p * 0.6, p * Math.PI * 2 + Math.sin(f.time * 0.25) * 0.2, -0.2 + p * 0.8);
      mark.scale.setScalar(MathUtils.lerp(1.15, 0.85, p));
      pearls.forEach((pearl, i) => {
        const a = f.time * 0.4 + (i / 3) * Math.PI * 2 + p * 3;
        pearl.position.set(Math.cos(a) * 3, Math.sin(a * 1.3) * 1.2, Math.sin(a) * 1.8);
        pearl.scale.setScalar(1 - i * 0.2);
      });
      cam.position.z = Math.max(9.5, 6.4 / (2 * TAN * f.aspect));
      return true;
    },
  };
}

export const BUILDERS: Record<SceneKind, (kit: Kit, spec: LayerSpec) => BuiltScene> = {
  heroDive,
  blocks,
  bubble,
  mailbox,
  megaphone,
  button,
  device,
  deviceOrbit,
  coinStack,
  chromeMark: chromeMarkScene,
};
