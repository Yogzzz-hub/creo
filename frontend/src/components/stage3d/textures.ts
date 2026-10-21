import { CanvasTexture, SRGBColorSpace } from "three";

/** Canvas-drawn textures for the landing scenes: device screens, keyboard, coin faces. */

const FONT = "Inter, 'DM Sans', system-ui, sans-serif";

function makeTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** CORS-enabled image load; resolves null on failure so a screen still draws. */
function loadImage(src: string) {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, pending);
  }
  return pending;
}

/** Draws `img` filling the box, cropped like object-fit: cover. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, fill: string, ink: string, size = 24) {
  ctx.font = `700 ${size}px ${FONT}`;
  const w = ctx.measureText(label).width + size * 1.4;
  const h = size * 1.75;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + size * 0.7, y + h / 2 + 1);
  ctx.textBaseline = "alphabetic";
  return w;
}

/** "creo" wordmark with its dot, drawn at a baseline. */
function wordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string, accent: string) {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.fillStyle = ink;
  ctx.fillText("creo", x, y);
  const w = ctx.measureText("creo").width;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x + w + size * 0.2, y - size * 0.12, size * 0.13, 0, Math.PI * 2);
  ctx.fill();
}

const BATCH = [
  { title: "Brand launch teaser", type: "REEL · 9:16", status: "Approved" },
  { title: "Product feature breakdown", type: "CAROUSEL · 4 SLIDES", status: "Awaiting" },
  { title: "Serum launch countdown", type: "STORY · 3 FRAMES", status: "Approved" },
];

/** The client portal's review screen, shown on the laptops. */
export function createPortalScreen(images: string[]) {
  const { canvas, ctx } = canvas2d(1600, 1000);
  const texture = makeTexture(canvas);
  let accent = "#d2965a";
  let photos: (HTMLImageElement | null)[] = [];

  const draw = () => {
    ctx.fillStyle = "#161514";
    ctx.fillRect(0, 0, 1600, 1000);

    // Sidebar
    ctx.fillStyle = "#1e1c1b";
    ctx.fillRect(0, 0, 300, 1000);
    wordmark(ctx, 46, 98, 52, "#efe3d6", accent);
    const nav = ["Dashboard", "Batches", "Brand DNA", "Approvals", "Billing"];
    nav.forEach((item, i) => {
      const y = 170 + i * 74;
      if (i === 3) {
        ctx.fillStyle = `${accent}33`;
        ctx.beginPath();
        ctx.roundRect(28, y - 6, 244, 60, 16);
        ctx.fill();
      }
      ctx.fillStyle = i === 3 ? "#efe3d6" : "#a3968a";
      ctx.beginPath();
      ctx.roundRect(52, y + 12, 24, 24, 7);
      ctx.fill();
      ctx.font = `600 26px ${FONT}`;
      ctx.fillText(item, 96, y + 34);
    });

    // Header
    ctx.fillStyle = "#efe3d6";
    ctx.font = `800 46px ${FONT}`;
    ctx.fillText("Batch 04 · Active review", 360, 112);
    ctx.fillStyle = "#b3a698";
    ctx.font = `500 26px ${FONT}`;
    ctx.fillText("2 of 3 approved · On track: 2 days early", 360, 158);
    ctx.fillStyle = "#34302c";
    ctx.beginPath();
    ctx.roundRect(1180, 132, 360, 14, 7);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(1180, 132, 240, 14, 7);
    ctx.fill();

    // Asset cards
    const cardW = 373;
    BATCH.forEach((asset, i) => {
      const x = 360 + i * (cardW + 30);
      const y = 210;
      ctx.fillStyle = "#211f1d";
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, 720, 28);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, 470, [28, 28, 0, 0]);
      ctx.clip();
      const photo = photos[i];
      if (photo) drawCover(ctx, photo, x, y, cardW, 470);
      else {
        ctx.fillStyle = "#34302c";
        ctx.fillRect(x, y, cardW, 470);
      }
      const shade = ctx.createLinearGradient(0, y + 300, 0, y + 470);
      shade.addColorStop(0, "rgba(33,31,29,0)");
      shade.addColorStop(1, "rgba(33,31,29,0.9)");
      ctx.fillStyle = shade;
      ctx.fillRect(x, y + 300, cardW, 170);
      ctx.restore();

      ctx.fillStyle = "#b3a698";
      ctx.font = `700 18px ${FONT}`;
      ctx.fillText(asset.type, x + 26, y + 520);
      ctx.fillStyle = "#efe3d6";
      ctx.font = `700 28px ${FONT}`;
      ctx.fillText(asset.title, x + 26, y + 562);
      if (asset.status === "Approved") pill(ctx, x + 26, y + 620, "✓ Approved", `${accent}40`, "#f3e3d2");
      else {
        const w = pill(ctx, x + 26, y + 620, "Approve", accent, "#1a120c");
        pill(ctx, x + 40 + w, y + 620, "Change", "#34302c", "#f3e3d2");
      }
    });
    texture.needsUpdate = true;
  };

  draw();
  void Promise.all(images.slice(0, 3).map(loadImage)).then((loaded) => {
    photos = loaded;
    draw();
  });

  return {
    texture,
    setAccent(color: string) {
      accent = color;
      draw();
    },
  };
}

/** A reel playing on a phone: full-bleed photo, rounded screen corners, reel chrome. */
export function createReelScreen(image: string, caption: string) {
  const { canvas, ctx } = canvas2d(560, 1180);
  const texture = makeTexture(canvas);
  let photo: HTMLImageElement | null = null;

  const draw = () => {
    ctx.clearRect(0, 0, 560, 1180);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, 560, 1180, 74);
    ctx.clip();
    ctx.fillStyle = "#161514";
    ctx.fillRect(0, 0, 560, 1180);
    if (photo) drawCover(ctx, photo, 0, 0, 560, 1180);
    const shade = ctx.createLinearGradient(0, 700, 0, 1180);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 700, 560, 480);

    ctx.fillStyle = "#ffffff";
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText("Reels", 36, 112);
    // Side actions
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(500, 760 + i * 92, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText("@yourbrand", 36, 1040);
    ctx.font = `500 24px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(caption, 36, 1082);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(36, 1118, 488, 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(36, 1118, 200, 6);
    ctx.restore();
    texture.needsUpdate = true;
  };

  draw();
  void loadImage(image).then((img) => {
    photo = img;
    draw();
  });
  return texture;
}

/** Keyboard deck seen from above: key grid and trackpad. */
export function createKeyboardDeck() {
  const { canvas, ctx } = canvas2d(1240, 840);
  ctx.fillStyle = "#16191f";
  ctx.fillRect(0, 0, 1240, 840);
  ctx.fillStyle = "#0b0d11";
  ctx.beginPath();
  ctx.roundRect(70, 70, 1100, 420, 18);
  ctx.fill();
  const rows = [14, 14, 13, 12, 11];
  rows.forEach((count, r) => {
    const keyW = (1060 - (count - 1) * 10) / count;
    for (let k = 0; k < count; k++) {
      ctx.fillStyle = "#1f232b";
      ctx.beginPath();
      ctx.roundRect(90 + k * (keyW + 10), 90 + r * 78, keyW, 66, 10);
      ctx.fill();
    }
  });
  ctx.fillStyle = "#1c2027";
  ctx.beginPath();
  ctx.roundRect(400, 540, 440, 250, 24);
  ctx.fill();
  return makeTexture(canvas);
}

/** "creo." mark for the back of the lid. */
export function createLidLogo() {
  const { canvas, ctx } = canvas2d(512, 256);
  wordmark(ctx, 92, 168, 120, "rgba(245,238,227,0.6)", "rgba(210,150,90,0.95)");
  return makeTexture(canvas);
}

export type CoinIcon = "play" | "check" | "clock" | "heart" | "spark";

/** One face of a coin: a filled disc with a white glyph. */
export function createCoinFace(icon: CoinIcon, fill: string) {
  const { canvas, ctx } = canvas2d(256, 256);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (icon === "play") {
    ctx.moveTo(104, 82);
    ctx.lineTo(176, 128);
    ctx.lineTo(104, 174);
    ctx.closePath();
    ctx.fill();
  } else if (icon === "check") {
    ctx.moveTo(84, 132);
    ctx.lineTo(116, 164);
    ctx.lineTo(176, 96);
    ctx.stroke();
  } else if (icon === "clock") {
    ctx.arc(128, 128, 58, 0, Math.PI * 2);
    ctx.moveTo(128, 96);
    ctx.lineTo(128, 130);
    ctx.lineTo(152, 146);
    ctx.stroke();
  } else if (icon === "heart") {
    ctx.moveTo(128, 178);
    ctx.bezierCurveTo(60, 130, 78, 74, 128, 104);
    ctx.bezierCurveTo(178, 74, 196, 130, 128, 178);
    ctx.fill();
  } else {
    ctx.moveTo(128, 64);
    ctx.quadraticCurveTo(136, 120, 192, 128);
    ctx.quadraticCurveTo(136, 136, 128, 192);
    ctx.quadraticCurveTo(120, 136, 64, 128);
    ctx.quadraticCurveTo(120, 120, 128, 64);
    ctx.fill();
  }
  return makeTexture(canvas);
}
