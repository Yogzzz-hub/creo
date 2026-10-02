import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export type AntigravityTheme = "admin" | "lead" | "member";

/* ── Celestial Dot ── */
interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  radius: number;
  baseOpacity: number;
  timeOffset: number;
  floatSpeed: number;
  twinkleSpeed: number;
}

/* ── Shockwave Ring ── */
interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  strength: number;
  opacity: number;
}

/* ── Engine ── */
export class AntigravityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private stars: Star[] = [];
  private shockwaves: Shockwave[] = [];
  private pointer = { x: -2000, y: -2000, radius: 200, active: false };
  private animId: number | null = null;
  private isDestroyed = false;
  private boundMouseMove!: (e: MouseEvent) => void;
  private boundTouchMove!: (e: TouchEvent) => void;
  private boundMouseLeave!: () => void;
  private boundClick!: (e: MouseEvent) => void;
  private boundTouchStart!: (e: TouchEvent) => void;
  private boundResize!: () => void;
  private startTime: number = performance.now();

  constructor(canvas: HTMLCanvasElement, _theme: AntigravityTheme = "admin") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.resize();
    this.initStars();
    this.bindEvents();
    this.animate();
  }

  /** Theme changes are accepted for API compat but visuals stay white */
  public setTheme(_newTheme: AntigravityTheme) {
    /* no-op – all dots are white */
  }

  /* ── Resize ── */
  private resize = () => {
    if (this.isDestroyed || !this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  };

  /* ── Spawn Celestial Dots ── */
  private initStars() {
    this.stars = [];
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Dense star field – ~80-120 dots depending on viewport
    const count = Math.min(Math.floor((w * h) / 12000), 120);

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.15 - Math.random() * 0.35,
        fx: 0,
        fy: 0,
        radius: 0.8 + Math.random() * 2.6, // 0.8 – 3.4 px
        baseOpacity: 0.25 + Math.random() * 0.55, // 0.25 – 0.80
        timeOffset: Math.random() * 6283, // 0 – 2π×1000
        floatSpeed: 0.0008 + Math.random() * 0.0012,
        twinkleSpeed: 0.0012 + Math.random() * 0.003,
      });
    }
  }

  /* ── Shockwave ── */
  private triggerShockwave(x: number, y: number) {
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 340,
      strength: 12,
      opacity: 0.6,
    });
  }

  /* ── Events ── */
  private bindEvents() {
    const handlePointer = (x: number, y: number) => {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.active = true;
    };

    this.boundMouseMove = (e: MouseEvent) => handlePointer(e.clientX, e.clientY);
    this.boundTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    this.boundMouseLeave = () => {
      this.pointer.active = false;
      this.pointer.x = -2000;
      this.pointer.y = -2000;
    };
    this.boundClick = (e: MouseEvent) => {
      this.triggerShockwave(e.clientX, e.clientY);
    };
    this.boundTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        this.triggerShockwave(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    this.boundResize = () => this.resize();

    window.addEventListener("mousemove", this.boundMouseMove, { passive: true });
    window.addEventListener("touchmove", this.boundTouchMove, { passive: true });
    window.addEventListener("mouseleave", this.boundMouseLeave);
    window.addEventListener("click", this.boundClick, { passive: true });
    window.addEventListener("touchstart", this.boundTouchStart, { passive: true });
    window.addEventListener("resize", this.boundResize);
  }

  /* ── Physics Update ── */
  private update() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const now = performance.now();
    const elapsed = now - this.startTime;

    // Shockwaves
    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s];
      if (!sw) continue;
      sw.radius += 7;
      sw.opacity -= 0.016;

      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(s, 1);
        continue;
      }

      this.stars.forEach((star) => {
        const dx = star.x - sw.x;
        const dy = star.y - sw.y;
        const dist = Math.hypot(dx, dy);
        const diff = Math.abs(dist - sw.radius);
        if (diff < 55 && dist > 0) {
          const factor = (1 - diff / 55) * sw.strength * sw.opacity;
          const angle = Math.atan2(dy, dx);
          star.fx += Math.cos(angle) * factor;
          star.fy += Math.sin(angle) * factor;
        }
      });
    }

    // Stars
    this.stars.forEach((star) => {
      const sway = Math.sin(star.timeOffset + elapsed * star.floatSpeed) * 0.2;

      star.x += star.vx + star.fx + sway;
      star.y += star.vy + star.fy;

      star.fx *= 0.93;
      star.fy *= 0.93;

      // Wrap
      if (star.y < -10) { star.y = h + 10; star.x = Math.random() * w; }
      if (star.x < -10) star.x = w + 10;
      if (star.x > w + 10) star.x = -10;

      // Pointer repulsion
      if (this.pointer.active) {
        const dx = star.x - this.pointer.x;
        const dy = star.y - this.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.pointer.radius && dist > 0) {
          const force = Math.pow((this.pointer.radius - dist) / this.pointer.radius, 1.3) * 5;
          const angle = Math.atan2(dy, dx);
          star.fx += Math.cos(angle) * force;
          star.fy += Math.sin(angle) * force;
        }
      }
    });
  }

  /* ── Render ── */
  private render() {
    if (!this.ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const now = performance.now();
    const elapsed = now - this.startTime;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Constellation lines (white)
    const maxLineDist = 120;
    for (let i = 0; i < this.stars.length; i++) {
      const a = this.stars[i];
      if (!a) continue;
      for (let j = i + 1; j < this.stars.length; j++) {
        const b = this.stars[j];
        if (!b) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < maxLineDist) {
          const alpha = (1 - dist / maxLineDist) * 0.1;
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          this.ctx.lineWidth = 0.6;
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
        }
      }
    }

    // 2. Shockwave rings (white)
    this.shockwaves.forEach((sw) => {
      if (!this.ctx) return;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255,255,255,${sw.opacity * 0.35})`;
      this.ctx.lineWidth = Math.max(0.8, 2.5 * sw.opacity);
      this.ctx.stroke();
      this.ctx.restore();
    });

    // 3. White celestial dots with twinkle
    this.stars.forEach((star) => {
      if (!this.ctx) return;

      // Twinkle: sinusoidal opacity fluctuation
      const twinkle = 0.5 + 0.5 * Math.sin(star.timeOffset + elapsed * star.twinkleSpeed);
      const opacity = star.baseOpacity * (0.45 + 0.55 * twinkle);

      // Soft outer glow for larger dots
      if (star.radius > 1.6) {
        this.ctx.beginPath();
        const glow = this.ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.radius * 3
        );
        glow.addColorStop(0, `rgba(255,255,255,${opacity * 0.35})`);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        this.ctx.fillStyle = glow;
        this.ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Core dot
      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  /* ── Loop ── */
  private animate = () => {
    if (this.isDestroyed) return;
    this.update();
    this.render();
    this.animId = requestAnimationFrame(this.animate);
  };

  /* ── Cleanup ── */
  public destroy() {
    this.isDestroyed = true;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    window.removeEventListener("mousemove", this.boundMouseMove);
    window.removeEventListener("touchmove", this.boundTouchMove);
    window.removeEventListener("mouseleave", this.boundMouseLeave);
    window.removeEventListener("click", this.boundClick);
    window.removeEventListener("touchstart", this.boundTouchStart);
    window.removeEventListener("resize", this.boundResize);
  }
}

/* ── React Component ── */
interface AntigravityBackgroundProps {
  theme?: AntigravityTheme;
}

export function AntigravityBackground({ theme = "admin" }: AntigravityBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AntigravityEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!engineRef.current) {
      engineRef.current = new AntigravityEngine(canvasRef.current, theme);
    } else {
      engineRef.current.setTheme(theme);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0 select-none"
    />
  );
}

/* ── Portal Wrapper ── */
export function PortalWrapper({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  // Strict Routing Rules: ONLY portal routes (/admin/*, /team-lead/* or /lead/*, /member/* or /workstation/*)
  const isAdmin = pathname.startsWith("/admin");
  const isTeamLead = pathname.startsWith("/team-lead") || pathname.startsWith("/lead");
  const isMember = pathname.startsWith("/member") || pathname.startsWith("/workstation");
  const shouldRender = isAdmin || isTeamLead || isMember;

  const currentTheme: AntigravityTheme = isAdmin
    ? "admin"
    : isTeamLead
    ? "lead"
    : "member";

  return (
    <div className="portal-dark relative min-h-screen w-full bg-nebula-navy text-slate-100 overflow-x-hidden">
      {shouldRender && <AntigravityBackground theme={currentTheme} />}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
