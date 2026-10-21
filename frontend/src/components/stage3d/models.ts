import {
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  type Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  type MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  type Texture,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Procedural props for the landing scenes. Units are arbitrary; each scene frames its own. */

const smooth = (a: number, b: number, v: number) => MathUtils.smoothstep(v, a, b);

// ── Laptop ────────────────────────────────────────────────────────────────────

export function createLaptop({
  screen,
  deck,
  lidLogo,
  body,
}: {
  screen: Texture;
  deck: Texture;
  lidLogo: Texture;
  body: MeshPhysicalMaterial;
}) {
  const root = new Group();
  const base = new Mesh(new RoundedBoxGeometry(3.2, 0.12, 2.2, 4, 0.05), body);
  base.position.y = 0.06;
  const deckMesh = new Mesh(
    new PlaneGeometry(3.06, 2.06),
    new MeshStandardMaterial({ map: deck, roughness: 0.7, metalness: 0.2 }),
  );
  deckMesh.rotation.x = -Math.PI / 2;
  deckMesh.position.y = 0.1215;

  // Lid hinges on the back edge; rotation.x = 0 is upright, +π/2 is shut
  const hinge = new Group();
  hinge.position.set(0, 0.12, -1.06);
  const lid = new Mesh(new RoundedBoxGeometry(3.2, 2.12, 0.07, 4, 0.03), body);
  lid.position.set(0, 1.06, -0.035);
  const bezel = new Mesh(
    new PlaneGeometry(3.1, 2.02),
    new MeshStandardMaterial({ color: 0x050608, roughness: 0.2, metalness: 0.4 }),
  );
  bezel.position.set(0, 1.06, 0.001);
  const screenMaterial = new MeshBasicMaterial({ map: screen, toneMapped: false });
  const screenMesh = new Mesh(new PlaneGeometry(2.94, 1.84), screenMaterial);
  screenMesh.position.set(0, 1.08, 0.002);
  const logo = new Mesh(
    new PlaneGeometry(0.9, 0.45),
    new MeshBasicMaterial({ map: lidLogo, transparent: true, toneMapped: false }),
  );
  logo.position.set(0, 1.06, -0.072);
  logo.rotation.y = Math.PI;
  hinge.add(lid, bezel, screenMesh, logo);
  root.add(base, deckMesh, hinge);

  return {
    root,
    screen: screenMesh,
    screenMaterial,
    /** 0 = shut, 1 = open at a natural working angle */
    setOpen(t: number) {
      hinge.rotation.x = MathUtils.lerp(Math.PI / 2 - 0.015, -0.3, t);
    },
  };
}

// ── Phone ─────────────────────────────────────────────────────────────────────

export function createPhone(screen: Texture, body: MeshPhysicalMaterial) {
  const root = new Group();
  const shell = new Mesh(new RoundedBoxGeometry(1, 2.04, 0.1, 6, 0.14), body);
  const glass = new Mesh(
    new PlaneGeometry(0.94, 1.98),
    new MeshBasicMaterial({ map: screen, transparent: true, toneMapped: false }),
  );
  glass.position.z = 0.0505;
  const island = new Mesh(new CapsuleGeometry(0.035, 0.16, 4, 12), new MeshBasicMaterial({ color: 0x000000 }));
  island.rotation.z = Math.PI / 2;
  island.position.set(0, 0.89, 0.053);
  root.add(shell, glass, island);
  return root;
}

// ── Chrome "c." outline, the hero's neon tube ─────────────────────────────────

export function createChromeMark(material: MeshStandardMaterial) {
  const outer = 1.7;
  const inner = 0.95;
  const from = MathUtils.degToRad(50);
  const to = MathUtils.degToRad(310);
  const mid = (outer + inner) / 2;
  const half = (outer - inner) / 2;
  const points: Vector3[] = [];
  const at = (a: number, r: number) => new Vector3(Math.cos(a) * r, Math.sin(a) * r, 0);
  const cap = (a: number, s: number, forward: number) => {
    const centre = at(a, mid);
    const radial = new Vector3(Math.cos(a), Math.sin(a), 0);
    const tangent = new Vector3(-Math.sin(a), Math.cos(a), 0).multiplyScalar(forward);
    return centre.addScaledVector(radial, half * Math.cos(Math.PI * s) * forward).addScaledVector(tangent, half * Math.sin(Math.PI * s));
  };
  for (let i = 0; i <= 64; i++) points.push(at(from + ((to - from) * i) / 64, outer));
  for (let i = 1; i < 12; i++) points.push(cap(to, i / 12, 1));
  for (let i = 0; i <= 52; i++) points.push(at(to - ((to - from) * i) / 52, inner));
  for (let i = 1; i < 12; i++) points.push(cap(from, i / 12, -1));
  const curve = new CatmullRomCurve3(points, true, "centripetal");

  const tube = new Mesh(new TubeGeometry(curve, 520, 0.075, 20, true), material);
  const dot = new Mesh(new TorusGeometry(0.34, 0.075, 20, 64), material);
  dot.position.set(1.95, -1.2, 0);
  // Centre "c." horizontally
  const model = new Group();
  model.position.x = -0.15;
  model.add(tube, dot);
  const root = new Group();
  root.add(model);
  return root;
}

// ── Blocks that assemble into a cube, then burst into coins ───────────────────

/** Deterministic PRNG so the scattered pieces look the same on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createBlockCube(material: MeshPhysicalMaterial) {
  const rand = mulberry32(7);
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const free = new Set<string>();
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) free.add(key(x, y, z));

  // Grow tetromino-like pieces through neighbouring cells
  const pieces: Vector3[][] = [];
  while (free.size) {
    const startKey = [...free][Math.floor(rand() * free.size)] as string;
    const [sx, sy, sz] = startKey.split(",").map(Number) as [number, number, number];
    const piece = [new Vector3(sx, sy, sz)];
    free.delete(startKey);
    const target = 3 + Math.floor(rand() * 3);
    while (piece.length < target) {
      const options: Vector3[] = [];
      for (const cell of piece) {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
          const k = key(cell.x + dx, cell.y + dy, cell.z + dz);
          if (free.has(k)) options.push(new Vector3(cell.x + dx, cell.y + dy, cell.z + dz));
        }
      }
      const next = options[Math.floor(rand() * options.length)];
      if (!next) break;
      free.delete(key(next.x, next.y, next.z));
      piece.push(next);
    }
    pieces.push(piece);
  }

  const geometry = new RoundedBoxGeometry(0.97, 0.97, 0.97, 3, 0.07);
  const root = new Group();
  const parts = pieces.map((cells, i) => {
    const centre = cells.reduce((acc, c) => acc.add(c), new Vector3()).divideScalar(cells.length);
    const group = new Group();
    for (const cell of cells) {
      const mesh = new Mesh(geometry, material);
      mesh.position.copy(cell).sub(centre);
      group.add(mesh);
    }
    const direction = centre.lengthSq() > 0.01 ? centre.clone().normalize() : new Vector3(rand() - 0.5, 1, rand() - 0.5).normalize();
    const start = centre.clone().addScaledVector(direction, 3.2 + rand() * 2.4).add(new Vector3(0, -1.5 - rand() * 2, 0));
    const quarter = () => (Math.floor(rand() * 4) - 1.5) * (Math.PI / 2);
    const startQuat = new Quaternion().setFromAxisAngle(
      new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      quarter(),
    );
    root.add(group);
    return { group, home: centre, start, startQuat, delay: (i / pieces.length) * 0.45 };
  });
  const identity = new Quaternion();

  return {
    root,
    /** 0 = scattered, 1 = a solid cube */
    setAssembly(t: number) {
      for (const part of parts) {
        const local = MathUtils.clamp((t - part.delay) / 0.55, 0, 1);
        const e = 1 - (1 - local) ** 3;
        part.group.position.lerpVectors(part.start, part.home, e);
        part.group.quaternion.slerpQuaternions(part.startQuat, identity, e);
      }
    },
  };
}

export function createCoins(faces: Texture[], rim: MeshPhysicalMaterial) {
  const geometry = new CylinderGeometry(0.5, 0.5, 0.14, 56);
  const root = new Group();
  const count = 9;
  const coins = Array.from({ length: count }, (_, i) => {
    const face = new MeshStandardMaterial({ map: faces[i % faces.length], roughness: 0.3, metalness: 0.2 });
    const coin = new Mesh(geometry, [rim, face, face]);
    const a = (i / count) * Math.PI * 2 + 0.3;
    const radius = 1.9 + (i % 3) * 0.35;
    const target = new Vector3(Math.cos(a) * radius, Math.sin(a) * radius * 0.85 - 0.2, ((i % 4) - 1.5) * 0.5);
    const spin = new Vector3(0.6 + (i % 3) * 0.4, 0.9 + (i % 2) * 0.6, 0.2);
    root.add(coin);
    return { coin, target, spin, face };
  });
  return {
    root,
    materials: coins.map((c) => c.face),
    /** 0 = stacked at the centre, 1 = scattered in a loose ring */
    setBurst(t: number, time: number) {
      const e = 1 - (1 - t) ** 3;
      root.visible = t > 0.001;
      for (const { coin, target, spin } of coins) {
        coin.position.copy(target).multiplyScalar(e);
        coin.scale.setScalar(MathUtils.lerp(0.2, 1, e));
        coin.rotation.set(Math.PI / 2 + time * spin.x * 0.6, time * spin.y * 0.6, time * spin.z);
      }
    },
  };
}

/** A neat stack of coins that peels apart into a rising spiral. */
export function createCoinStack(faces: Texture[], rim: MeshPhysicalMaterial, count = 12) {
  const geometry = new CylinderGeometry(0.5, 0.5, 0.14, 56);
  const root = new Group();
  const materials: MeshStandardMaterial[] = [];
  const coins = Array.from({ length: count }, (_, i) => {
    const face = new MeshStandardMaterial({ map: faces[i % faces.length], roughness: 0.3, metalness: 0.2 });
    materials.push(face);
    const coin = new Mesh(geometry, [rim, face, face]);
    root.add(coin);
    const angle = (i / count) * Math.PI * 2.4;
    return {
      coin,
      stacked: new Vector3(Math.sin(i * 1.7) * 0.04, (i - count / 2) * 0.15, Math.cos(i * 1.3) * 0.04),
      spread: new Vector3(Math.cos(angle) * 2.1, (i - count / 2) * 0.32, Math.sin(angle) * 2.1),
      delay: (i / count) * 0.35,
    };
  });
  return {
    root,
    materials,
    /** 0 = stacked, 1 = fanned into a spiral */
    set(t: number, time: number) {
      for (const { coin, stacked, spread, delay } of coins) {
        const local = MathUtils.clamp((t - delay) / 0.65, 0, 1);
        const e = 1 - (1 - local) ** 3;
        coin.position.lerpVectors(stacked, spread, e);
        coin.rotation.set(MathUtils.lerp(0, Math.PI / 2, e) + time * 0.5 * e, time * 0.8 * e + delay * 6 * e, 0);
      }
    },
  };
}

// ── Chrome sparkle star ───────────────────────────────────────────────────────

/**
 * A four-point sparkle like a chrome charm: the outline is a superellipse
 * |x|^n + |y|^n = 1 with n < 1 (concave sides, needle tips), and each face
 * rises toward the centre so every arm gets a ridge. Front and back meet at
 * a crisp edge. Spans roughly -1…1 (a touch taller than wide).
 */
export function createSparkleGeometry({ segments = 288, rings = 28, sharpness = 0.42, height = 0.26 } = {}) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const side of [1, -1]) {
    const offset = positions.length / 3;
    for (let j = 0; j <= rings; j++) {
      const s = j / rings;
      // Concave falloff: steep near the tips, a soft dome in the middle
      const z = side * height * (1 - s) ** 1.5;
      for (let i = 0; i < segments; i++) {
        const phi = (i / segments) * Math.PI * 2;
        const c = Math.cos(phi);
        const sn = Math.sin(phi);
        const r = (Math.abs(c) ** sharpness + Math.abs(sn) ** sharpness) ** (-1 / sharpness);
        positions.push(c * r * s, sn * r * s * 1.08, z);
      }
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < segments; i++) {
        const a = offset + j * segments + i;
        const b = offset + j * segments + ((i + 1) % segments);
        const c = a + segments;
        const d = b + segments;
        // Front faces wind toward +z, the back toward -z
        if (side > 0) indices.push(a, b, d, a, d, c);
        else indices.push(a, d, b, a, c, d);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ── Obsidian rock ─────────────────────────────────────────────────────────────

/**
 * A faceted stone: an icosphere pressed flat in a few random directions and
 * stretched, so every seed gives a different chunk. Pair with a flat-shaded
 * glossy material for obsidian.
 */
export function createRockGeometry(seed: number) {
  const rand = mulberry32(seed);
  const geometry = new IcosahedronGeometry(1, 2);
  const cuts = Array.from({ length: 7 }, () => new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize());
  const stretch = new Vector3(0.8 + rand() * 0.5, 0.7 + rand() * 0.45, 0.8 + rand() * 0.4);
  const position = geometry.attributes.position;
  const v = new Vector3();
  if (!position) return geometry;
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).normalize();
    let radius = 1;
    for (const cut of cuts) radius -= 0.32 * Math.max(0, v.dot(cut)) ** 5;
    v.multiplyScalar(radius).multiply(stretch);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// ── Speech bubble ─────────────────────────────────────────────────────────────

export function createSpeechBubble(body: MeshPhysicalMaterial, accent: MeshPhysicalMaterial) {
  const root = new Group();
  const disc = new Mesh(new CylinderGeometry(1.2, 1.2, 0.5, 72), body);
  disc.rotation.x = Math.PI / 2;
  const rim = new Mesh(new TorusGeometry(1.2, 0.25, 28, 96), body);
  const tail = new Mesh(new CapsuleGeometry(0.22, 0.55, 8, 24), body);
  tail.position.set(-0.86, -1.18, 0);
  tail.rotation.z = -0.7;
  // An approval tick on the face
  const tickA = new Mesh(new RoundedBoxGeometry(0.16, 0.42, 0.12, 2, 0.05), accent);
  tickA.position.set(-0.2, -0.06, 0.28);
  tickA.rotation.z = 0.75;
  const tickB = new Mesh(new RoundedBoxGeometry(0.16, 0.78, 0.12, 2, 0.05), accent);
  tickB.position.set(0.16, 0.08, 0.28);
  tickB.rotation.z = -0.62;
  root.add(disc, rim, tail, tickA, tickB);
  return root;
}

// ── Mailbox ───────────────────────────────────────────────────────────────────

function mailboxProfile(scale = 1) {
  const w = 0.56 * scale;
  const h = 0.72 * scale;
  const shape = new Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w, h);
  shape.absarc(0, h, w, 0, Math.PI, false);
  shape.lineTo(-w, 0);
  return shape;
}

export function createMailbox(body: MeshPhysicalMaterial, flagMaterial: MeshPhysicalMaterial, letter: MeshPhysicalMaterial) {
  const root = new Group();
  const shell = new Mesh(
    new ExtrudeGeometry(mailboxProfile(), { depth: 2.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 40 }),
    body,
  );
  shell.position.z = -1.1;
  // Dark mouth that shows when the door swings open
  const mouth = new Mesh(new ExtrudeGeometry(mailboxProfile(0.9), { depth: 0.01, bevelEnabled: false, curveSegments: 40 }), new MeshBasicMaterial({ color: 0x020305 }));
  mouth.position.set(0, 0.05, 1.141);

  const doorPivot = new Group();
  doorPivot.position.set(0, -0.02, 1.16);
  const door = new Mesh(
    new ExtrudeGeometry(mailboxProfile(1.06), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 40 }),
    body,
  );
  const latch = new Mesh(new CapsuleGeometry(0.05, 0.22, 6, 12), body);
  latch.position.set(0, 1.25, 0.1);
  latch.rotation.x = Math.PI / 2;
  doorPivot.add(door, latch);

  const flagPivot = new Group();
  flagPivot.position.set(0.62, 0.55, 0.55);
  const arm = new Mesh(new RoundedBoxGeometry(0.05, 0.08, 1.0, 2, 0.02), flagMaterial);
  arm.position.z = -0.5;
  const flag = new Mesh(new RoundedBoxGeometry(0.05, 0.36, 0.42, 2, 0.03), flagMaterial);
  flag.position.set(0, 0.14, -0.86);
  flagPivot.add(arm, flag);

  const envelope = new Mesh(new RoundedBoxGeometry(0.8, 0.04, 1.1, 2, 0.02), letter);
  envelope.position.set(0, 0.35, 0.2);

  const post = new Mesh(new RoundedBoxGeometry(0.24, 3, 0.24, 2, 0.04), body);
  post.position.set(0, -1.5, 0);
  root.add(shell, mouth, doorPivot, flagPivot, envelope, post);

  return {
    root,
    set(progress: number) {
      flagPivot.rotation.x = MathUtils.lerp(0, -Math.PI / 2, smooth(0.15, 0.45, progress));
      doorPivot.rotation.x = MathUtils.lerp(0, 1.45, smooth(0.35, 0.6, progress));
      envelope.position.z = MathUtils.lerp(0.2, 1.75, smooth(0.5, 0.8, progress));
      envelope.position.y = MathUtils.lerp(0.35, 0.18, smooth(0.6, 0.8, progress));
    },
  };
}

// ── Megaphone ─────────────────────────────────────────────────────────────────

export function createMegaphone(body: MeshPhysicalMaterial, trim: MeshPhysicalMaterial) {
  const lathe = new Group();
  const profile = [
    [0.3, 0],
    [0.33, 0.15],
    [0.46, 0.5],
    [0.7, 0.95],
    [1.02, 1.32],
    [1.12, 1.42],
  ].map(([r, y]) => new Vector2(r, y));
  const bellMaterial = body.clone();
  bellMaterial.side = DoubleSide;
  const bell = new Mesh(new LatheGeometry(profile, 72), bellMaterial);
  const lip = new Mesh(new TorusGeometry(1.12, 0.06, 18, 72), body);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 1.42;
  const driver = new Mesh(new CylinderGeometry(0.3, 0.34, 0.22, 48), trim);
  driver.position.y = 0.32;
  const barrel = new Mesh(new CylinderGeometry(0.36, 0.38, 0.95, 56), body);
  barrel.position.y = -0.47;
  const back = new Mesh(new SphereGeometry(0.38, 48, 24), body);
  back.scale.y = 0.45;
  back.position.y = -0.95;
  const handle = new Mesh(new RoundedBoxGeometry(0.26, 0.8, 0.3, 3, 0.1), body);
  handle.position.set(0.62, -0.55, 0);
  handle.rotation.z = -0.35;
  const trigger = new Mesh(new RoundedBoxGeometry(0.12, 0.3, 0.16, 2, 0.05), trim);
  trigger.position.set(0.4, -0.35, 0);
  lathe.add(bell, lip, driver, barrel, back, handle, trigger);
  // Mouth faces +x, handle hangs down
  lathe.rotation.z = -Math.PI / 2;
  const root = new Group();
  root.add(lathe);
  return { root, bell };
}

// ── The big button ────────────────────────────────────────────────────────────

export function createBigButton(base: MeshPhysicalMaterial, cap: MeshPhysicalMaterial, chrome: MeshStandardMaterial) {
  const root = new Group();
  const plinth = new Mesh(new CylinderGeometry(1, 1.06, 0.36, 72), base);
  plinth.position.y = -0.18;
  const collar = new Mesh(new TorusGeometry(0.9, 0.08, 20, 72), base);
  collar.rotation.x = Math.PI / 2;
  const plunger = new Group();
  const stem = new Mesh(new CylinderGeometry(0.8, 0.82, 0.32, 72), cap);
  const dome = new Mesh(new SphereGeometry(0.8, 72, 24, 0, Math.PI * 2, 0, 0.6), cap);
  dome.scale.y = 0.42;
  dome.position.y = 0.04;
  // Embossed "c." on the cap
  const glyph = new Mesh(new TorusGeometry(0.26, 0.055, 16, 48, Math.PI * 1.45), chrome);
  glyph.rotation.set(-Math.PI / 2, 0, Math.PI * 0.28);
  glyph.position.y = 0.36;
  const dot = new Mesh(new SphereGeometry(0.07, 24, 16), chrome);
  dot.position.set(0.3, 0.35, 0.2);
  plunger.add(stem, dome, glyph, dot);
  root.add(plinth, collar, plunger);
  return {
    root,
    /** 0 = up, 1 = fully pressed */
    setPress(t: number) {
      plunger.position.y = MathUtils.lerp(0.2, 0.02, t);
    },
  };
}

export const tint = (material: { color: Color }, color: Color) => material.color.copy(color);
