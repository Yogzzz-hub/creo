import {
  type MotionValue,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  useVelocity,
} from "motion/react";
import { type PointerEvent, useEffect, useRef, useState } from "react";

export interface Reel {
  src: string;
  title: string;
  format: string;
}

/** Idle spin in degrees per second (negative turns the ring right-to-left) */
const IDLE_SPIN = -9;

function ReelCard({
  reel,
  angle,
  radius,
  width,
  rotation,
}: {
  reel: Reel;
  angle: number;
  radius: number;
  width: number;
  rotation: MotionValue<number>;
}) {
  const height = (width * 16) / 9;
  // How directly the card faces the viewer: 1 front, 0 side-on, -1 behind
  const facing = useTransform(rotation, (r) => Math.cos(((angle + r) * Math.PI) / 180));
  const shade = useTransform(facing, [-0.2, 0.4, 1], [0.85, 0.45, 0]);

  return (
    <div
      className="absolute [backface-visibility:hidden]"
      style={{
        width,
        height,
        left: -width / 2,
        top: -height / 2,
        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
      }}
    >
      <div className="relative size-full overflow-hidden rounded-[22px] border border-hi/10 bg-site-deep shadow-[0_30px_60px_-25px_rgb(var(--shadow-rgb)/calc(0.95*var(--shadow-k)))]">
        <img
          src={reel.src}
          alt={reel.title}
          loading="lazy"
          draggable={false}
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-site-bg/85 via-site-bg/10 to-transparent" />
        <div className="absolute left-3 top-3 rounded-full border border-hi/15 bg-site-bg/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-hi backdrop-blur-md">
          {reel.format}
        </div>
        <div className="absolute inset-x-3 bottom-3 text-sm font-semibold leading-snug text-hi sm:text-base">
          {reel.title}
        </div>
        <motion.div aria-hidden="true" className="absolute inset-0 bg-site-bg" style={{ opacity: shade }} />
      </div>
    </div>
  );
}

/**
 * A ring of 9:16 reel cards in 3D. It turns slowly on its own, gets a kick
 * from page scroll speed, and can be dragged (mouse or touch) with momentum.
 * Reduced motion shows a still ring.
 */
export function ReelCarousel({ reels, className = "" }: { reels: Reel[]; className?: string }) {
  const reduce = useReducedMotion();
  const rotation = useMotionValue(0);
  const spin = useRef(IDLE_SPIN);
  const drag = useRef({ active: false, lastX: 0, lastT: 0, v: 0, pointer: -1 });
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const [size, setSize] = useState({ card: 210, radius: 520 });
  const stageRef = useRef<HTMLDivElement>(null);
  // Stop spinning (and re-styling ten cards a frame) while the wall is off-screen
  const onScreen = useInView(stageRef, { margin: "200px 0px" });

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const card = w < 640 ? 132 : w < 1024 ? 170 : 210;
      const gap = card * 0.22;
      const radius = Math.round((card / 2 + gap / 2) / Math.tan(Math.PI / reels.length));
      setSize({ card, radius });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [reels.length]);

  useAnimationFrame((_, delta) => {
    if (reduce || !onScreen || drag.current.active) return;
    const dt = Math.min(delta / 1000, 0.05);
    // Scrolling down speeds the ring up; letting go eases it back to idle
    const kick = -scrollVelocity.get() * 0.03;
    spin.current += (IDLE_SPIN + kick - spin.current) * Math.min(dt * 1.8, 1);
    rotation.set(rotation.get() + spin.current * dt);
  });

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    drag.current = { active: true, lastX: e.clientX, lastT: performance.now(), v: 0, pointer: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.pointer) return;
    const now = performance.now();
    const dx = e.clientX - d.lastX;
    const dt = Math.max((now - d.lastT) / 1000, 0.001);
    const deg = dx * 0.28;
    rotation.set(rotation.get() + deg);
    d.v += (deg / dt - d.v) * 0.35;
    d.lastX = e.clientX;
    d.lastT = now;
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    // Fling: carry the drag speed and let it decay back to the idle spin
    spin.current = Math.max(-420, Math.min(420, d.v));
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const height = (size.card * 16) / 9;

  return (
    <div
      ref={stageRef}
      data-cursor="Drag"
      className={`relative w-full touch-pan-y select-none overflow-hidden [perspective:1500px] [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)] ${className}`}
      style={{ height: height + 120 }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Floor glow under the ring */}
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 h-24 w-[70%] -translate-x-1/2 rounded-[50%] bg-site-blue-deep/25 blur-[60px]"
      />
      <motion.div
        className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
        style={{ z: -size.radius, rotateX: -4, rotateY: rotation }}
      >
        {reels.map((reel, i) => (
          <ReelCard
            key={reel.src}
            reel={reel}
            angle={(360 / reels.length) * i}
            radius={size.radius}
            width={size.card}
            rotation={rotation}
          />
        ))}
      </motion.div>
    </div>
  );
}
