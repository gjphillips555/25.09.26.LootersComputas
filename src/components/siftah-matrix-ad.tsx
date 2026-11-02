import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";

const CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン<>[]{}#%*+=-_";

type Drop = {
  x: number;
  y: number;
  speed: number;
  len: number;
  glyphs: string[];
  bounce: number;
};

/**
 * Homepage Siftah advert: red/white matrix rain that soft-bounces off the
 * logo and headline, then fades downward. Logo stays sharp on top.
 * Mobile: stacked layout so copy stays readable.
 */
export function SiftahMatrixAd() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const copyRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let drops: Drop[] = [];
    let reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fontSize = 13;

    function measureObstacles() {
      if (!shell) return [] as DOMRect[];
      const base = shell.getBoundingClientRect();
      const rects: DOMRect[] = [];
      for (const el of [logoRef.current, copyRef.current]) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        // Slightly expand so rain clears the readable area
        rects.push(
          new DOMRect(
            r.left - base.left - 6,
            r.top - base.top - 4,
            r.width + 12,
            r.height + 8,
          ),
        );
      }
      return rects;
    }

    function resize() {
      if (!shell || !canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = shell.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.max(8, Math.floor(width / fontSize));
      drops = Array.from({ length: cols }, (_, i) => makeDrop(i * fontSize, height));
    }

    function makeDrop(x: number, height: number): Drop {
      const len = 8 + Math.floor(Math.random() * 14);
      return {
        x,
        y: Math.random() * -height,
        speed: 1.2 + Math.random() * 2.4,
        len,
        glyphs: Array.from({ length: len }, () => CHARS[(Math.random() * CHARS.length) | 0]),
        bounce: 0,
      };
    }

    function hitObstacle(x: number, y: number, obstacles: DOMRect[]) {
      for (const o of obstacles) {
        if (x >= o.left && x <= o.right && y >= o.top && y <= o.bottom) return o;
      }
      return null;
    }

    function frame() {
      if (!canvas || !ctx || !shell) return;
      const { width, height } = shell.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // Soft red/white static noise wash
      for (let i = 0; i < 28; i++) {
        const nx = Math.random() * width;
        const ny = Math.random() * height;
        ctx.fillStyle =
          Math.random() > 0.45
            ? `rgba(255,40,55,${0.04 + Math.random() * 0.08})`
            : `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
        ctx.fillRect(nx, ny, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }

      if (reduced) {
        raf = requestAnimationFrame(frame);
        return;
      }

      const obstacles = measureObstacles();
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.textBaseline = "top";

      for (const drop of drops) {
        drop.y += drop.speed;

        // Bounce / deflect off logo & copy, then fade downward
        const tipY = drop.y + drop.len * fontSize;
        const obstacle = hitObstacle(drop.x + fontSize * 0.4, tipY, obstacles);
        if (obstacle && drop.bounce < 3) {
          drop.speed = Math.max(0.6, drop.speed * 0.55);
          drop.x += (Math.random() > 0.5 ? 1 : -1) * (fontSize * (0.6 + Math.random()));
          drop.bounce += 1;
          // Nudge past the bottom of the obstacle so it "slides off"
          drop.y = obstacle.bottom - drop.len * fontSize * 0.35 + Math.random() * 6;
        }

        for (let i = 0; i < drop.len; i++) {
          const gy = drop.y + i * fontSize;
          if (gy < -fontSize || gy > height + fontSize) continue;

          // Fade more as characters fall past mid / after bounce
          const life = 1 - Math.min(1, Math.max(0, gy / (height + 40)));
          const bounceFade = Math.max(0.25, 1 - drop.bounce * 0.22);
          const alpha = life * bounceFade * (i === drop.len - 1 ? 1 : 0.35 + (i / drop.len) * 0.55);

          // Skip drawing over obstacles so logo/text stay clean
          if (hitObstacle(drop.x + 4, gy + 6, obstacles)) continue;

          const isHead = i === drop.len - 1;
          if (isHead) {
            ctx.fillStyle = `rgba(255,255,255,${0.85 * alpha})`;
          } else if (i > drop.len - 4) {
            ctx.fillStyle = `rgba(255,70,85,${0.75 * alpha})`;
          } else {
            ctx.fillStyle = `rgba(220,30,45,${0.45 * alpha})`;
          }
          ctx.fillText(drop.glyphs[i], drop.x, gy);
        }

        // Occasionally scramble a glyph
        if (Math.random() < 0.08) {
          const idx = (Math.random() * drop.glyphs.length) | 0;
          drop.glyphs[idx] = CHARS[(Math.random() * CHARS.length) | 0];
        }

        if (drop.y - drop.len * fontSize > height) {
          Object.assign(drop, makeDrop(drop.x, height));
        }
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    raf = requestAnimationFrame(frame);
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(shell);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);

  return (
    <section
      ref={shellRef}
      className="siftah-mini-ad relative mx-auto mt-1 w-full max-w-6xl overflow-hidden rounded-xl bg-[#0a0508] text-white"
      aria-label="Siftah Mobile advertisement"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        aria-hidden
      />
      {/* Soft vignette so rain sits in the edges */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 35% 50%, rgba(10,5,8,0.55), transparent 70%), radial-gradient(ellipse 50% 60% at 70% 50%, rgba(10,5,8,0.4), transparent 65%)",
        }}
      />

      <Link
        to="/siftah"
        className="relative z-[2] flex min-h-[200px] flex-col items-center gap-3 px-4 py-5 transition sm:min-h-[260px] sm:flex-row sm:items-center sm:justify-center sm:gap-8 sm:px-8 sm:py-4"
      >
        <img
          ref={logoRef}
          src="/siftah-mobile-logo.svg"
          alt="Siftah Mobile"
          className="h-28 w-auto max-w-[55%] shrink-0 object-contain drop-shadow-[0_0_22px_rgba(255,40,55,0.35)] sm:h-60 sm:max-w-[43%]"
        />
        <span ref={copyRef} className="min-w-0 flex-1 text-center sm:text-left">
          <span
            className="block text-[10px] font-black uppercase tracking-[.22em] text-[#ff8a95] sm:text-sm"
            style={{ WebkitTextStroke: "1px #050505", paintOrder: "stroke fill" }}
          >
            AI-powered computing
          </span>
          <span
            className="mt-1 block text-xl font-black leading-[1.05] text-[#ff3b4e] sm:text-4xl"
            style={{
              WebkitTextStroke: "1.5px #050505",
              paintOrder: "stroke fill",
              textShadow: "0 0 18px rgba(255,40,55,0.45)",
            }}
          >
            Meet Siftah Mobile
          </span>
          <span
            className="mt-1.5 block text-sm font-extrabold leading-snug text-white sm:mt-2 sm:text-xl"
            style={{ WebkitTextStroke: "1px #050505", paintOrder: "stroke fill" }}
          >
            AI chat, coding help, app building and creative tools.
          </span>
          <span
            className="mt-1.5 block text-xs font-bold text-[#ffb3ba] sm:mt-2 sm:text-base"
            style={{ WebkitTextStroke: "1px #050505", paintOrder: "stroke fill" }}
          >
            Your ideas. Built at the speed of thought.
          </span>
        </span>
        <span className="mt-1 shrink-0 rounded-lg border border-red-300/45 bg-red-500/20 px-4 py-2.5 text-xs font-extrabold text-red-50 shadow-md shadow-red-950/40 transition hover:bg-red-500/35 sm:mt-0 sm:text-sm">
          Explore <span aria-hidden="true">→</span>
        </span>
      </Link>
    </section>
  );
}
