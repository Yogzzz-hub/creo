import { useReducedMotion } from "motion/react";
import { createContext, lazy, type ReactNode, type RefObject, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import "../../styles/stage-tones.css";

// three.js and the scenes load as their own chunk
const StageRuntime = lazy(() => import("./runtime"));

/** Props the stage can build, each a procedural scene posed by scroll. */
export type SceneKind =
  | "heroDive"
  | "blocks"
  | "bubble"
  | "mailbox"
  | "megaphone"
  | "button"
  | "device"
  | "deviceOrbit"
  | "coinStack"
  | "chromeMark";

export interface LayerSpec {
  kind: SceneKind;
  /** Slots the scene may render into; the first with a size wins (e.g. desktop vs mobile slot) */
  views: RefObject<HTMLElement | null>[];
  /** Section the 3D is clipped to and whose scroll drives it */
  section: RefObject<HTMLElement | null>;
  /**
   * "progress": 0 → 1 while a tall section scrolls past its sticky viewport.
   * "pass": 0 → 1 while the slot crosses the screen. Each kind has a default.
   */
  drive?: "progress" | "pass";
  /** Kind-specific variant, e.g. blocks: "manifesto" (cube → coins) or "assemble" (chaos → cube) */
  mode?: string;
  /** For the big button: true while it is held down */
  pressed?: RefObject<boolean>;
}

type Listener = () => void;

/** Live set of layer specs that pages register and the runtime renders. */
export class StageRegistry {
  readonly specs = new Set<LayerSpec>();
  private listeners = new Set<Listener>();
  add(spec: LayerSpec) {
    this.specs.add(spec);
    this.emit();
  }
  remove(spec: LayerSpec) {
    this.specs.delete(spec);
    this.emit();
  }
  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    for (const listener of this.listeners) listener();
  }
}

const StageContext = createContext<StageRegistry | null>(null);

/** Attaches a 3D scene to a slot on the page for as long as the caller is mounted. */
export function useStageLayer(spec: LayerSpec) {
  const registry = useContext(StageContext);
  const specRef = useRef(spec);
  useEffect(() => {
    if (!registry) return;
    const current = specRef.current;
    registry.add(current);
    return () => registry.remove(current);
  }, [registry]);
}

const PHOTO = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=75`;

/** Photos shown on the device screens */
export const SCREEN_IMAGES = [
  PHOTO("1517838277536-f5f99be501cd"),
  PHOTO("1608248543803-ba4f8c70ae0b"),
  PHOTO("1509440159596-0249088772ff"),
  PHOTO("1515886657613-9f3515b0c78f"),
  PHOTO("1600210492486-724fe5c67fb0"),
  PHOTO("1509198397868-475647b2a1e5"),
];

/**
 * Root of a 3D marketing page. Sections inside it take a tone class
 * (`st-tone st-base | st-hero | st-inverse | st-brand`) and attach scenes with
 * `useStageLayer`; one fixed WebGL canvas paints the tones and draws every
 * scene into its slot. Without WebGL the sections keep their CSS fills.
 */
export function Stage3DRoot({ children, className = "" }: { children: ReactNode; className?: string }) {
  const registry = useMemo(() => new StageRegistry(), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const [live, setLive] = useState(false);

  return (
    <StageContext.Provider value={registry}>
      <div ref={rootRef} className={`w-full min-h-screen font-sans text-site-ink ${live ? "st-live" : ""} ${className}`}>
        <Suspense fallback={null}>
          <StageRuntime registry={registry} root={rootRef} images={SCREEN_IMAGES} reduce={reduce} onLive={setLive} />
        </Suspense>
        {children}
      </div>
    </StageContext.Provider>
  );
}
