import { type Color, MathUtils, Mesh, MeshStandardMaterial } from "three";
import { createSparkleGeometry } from "./models";

/**
 * The four stars, placed by hand in the hero camera's opening frame:
 * u/v are -1…1 across the view, depth is distance from the camera, screen is
 * the on-screen height as a fraction of the view. `turn` is how far each one
 * rotates over the whole hero scroll, `rise` how far it drifts up (in view
 * heights) — nearer stars move more, which reads as depth.
 */
// Balanced corners around the centred mark: large stars top-left and
// bottom-right, small ones top-right (gold) and bottom-left. Mirrored pairs
// share a depth, size and scroll speed so the symmetry holds as they move.
// The hero camera looks slightly down, which lifts everything ~0.16 of the
// half-height on screen, so v is lowered by that to land on the intended spot.
const LIFT = 0.16;
const STARS = [
  { u: -0.6, v: 0.36 - LIFT, depth: 8, screen: 0.17, gold: false, tilt: 0.35, turn: 0.3, rise: 0.42 },
  { u: 0.6, v: -0.36 - LIFT, depth: 8, screen: 0.17, gold: false, tilt: -0.35, turn: -0.3, rise: 0.42 },
  { u: 0.64, v: 0.4 - LIFT, depth: 16, screen: 0.065, gold: true, tilt: -0.5, turn: 0.22, rise: 0.24 },
  { u: -0.64, v: -0.4 - LIFT, depth: 16, screen: 0.065, gold: false, tilt: 0.5, turn: -0.22, rise: 0.24 },
];

const TAN = Math.tan(MathUtils.degToRad(35 / 2));

/**
 * Four chrome four-point stars (one gold) at different depths in the hero.
 * They hold still apart from a faint float and rock; scrolling turns them and
 * lifts them past at speeds set by their depth, and the camera's dive adds
 * parallax on top.
 */
export function createSparkleField({ aspect, gold }: { aspect: number; gold: Color }) {
  const geometry = createSparkleGeometry();
  const chrome = new MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06 });
  const goldMaterial = new MeshStandardMaterial({ color: gold, metalness: 1, roughness: 0.12 });
  // Keep the far edge stars inside narrow (phone) frames
  const spread = Math.min(aspect, 1.6);

  const stars = STARS.map((s, i) => {
    const halfH = TAN * s.depth;
    const mesh = new Mesh(geometry, s.gold ? goldMaterial : chrome);
    return {
      ...s,
      mesh,
      x: s.u * halfH * spread,
      y: 1 + s.v * halfH,
      z: 9 - s.depth,
      halfH,
      size: s.screen * halfH,
      phase: i * 1.7,
    };
  });

  return {
    meshes: stars.map((s) => s.mesh),
    /** `progress` is the hero's scroll progress, 0 → 1 */
    update(time: number, progress: number) {
      for (const s of stars) {
        // Barely-there idle motion: a slow float and a gentle rock
        const float = Math.sin(time * 0.6 + s.phase) * s.size * 0.06;
        const rock = Math.sin(time * 0.4 + s.phase) * 0.08;
        s.mesh.position.set(s.x, s.y + float + progress * s.rise * s.halfH * 2, s.z);
        s.mesh.rotation.set(rock * 0.6, s.tilt + rock + progress * 1.2 * Math.sign(s.turn), progress * s.turn * Math.PI * 2);
        s.mesh.scale.setScalar(s.size);
      }
    },
  };
}
