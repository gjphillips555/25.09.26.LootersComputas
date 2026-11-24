import { useCallback, useEffect, useState } from "react";
import { CarFront, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Detail-page gallery. Always renders the ORIGINAL stored image URLs (no resized/thumbnail variants), in the
 * main view, the thumbnails strip and the full-screen lightbox. `noReferrer` is used for hotlinked OG images.
 */
export function FullResGallery({ photos, title, noReferrer = false, badge }: { photos: string[]; title: string; noReferrer?: boolean; badge?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const list = photos.filter((p) => !failed[p]);
  useEffect(() => setI(0), [list.length]);
  const go = useCallback((d: number) => setI((v) => (v + d + list.length) % Math.max(1, list.length)), [list.length]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go]);
  const ref = noReferrer ? ("no-referrer" as const) : undefined;

  if (!list.length) {
    return (
      <div className="relative flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-[#0b0b0c] bg-[#0b0b0c] text-white/30">
        <CarFront className="size-20" />
        {badge && <div className="absolute left-3 top-3">{badge}</div>}
      </div>
    );
  }
  const current = list[Math.min(i, list.length - 1)];
  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-[#0b0b0c] bg-[#0b0b0c]">
        <button type="button" onClick={() => setOpen(true)} className="block size-full cursor-zoom-in" aria-label="Open full-size photo">
          <img
            src={current}
            alt={`${title} — photo ${i + 1}`}
            referrerPolicy={ref}
            decoding="async"
            fetchPriority="high"
            onError={() => setFailed((f) => ({ ...f, [current]: true }))}
            className="size-full object-contain"
            data-testid="gallery-main"
          />
        </button>
        {badge && <div className="pointer-events-none absolute left-3 top-3">{badge}</div>}
        <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white"><Expand className="size-3" /> Full size</span>
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80" aria-label="Previous photo"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80" aria-label="Next photo"><ChevronRight className="size-5" /></button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">{i + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((p, idx) => (
            <button key={p + idx} type="button" onClick={() => setI(idx)} className={cn("h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2", idx === i ? "border-[#e3121b]" : "border-transparent opacity-70 hover:opacity-100")} aria-label={`Photo ${idx + 1}`}>
              <img src={p} alt="" loading="lazy" referrerPolicy={ref} className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95" role="dialog" aria-label="Full-size photo" onClick={() => setOpen(false)} data-testid="lightbox">
          <img src={current} alt={`${title} — photo ${i + 1}`} referrerPolicy={ref} className="max-h-[92vh] max-w-[96vw] object-contain" onClick={(e) => e.stopPropagation()} data-testid="lightbox-img" />
          <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close"><X className="size-6" /></button>
          {list.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo"><ChevronLeft className="size-6" /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo"><ChevronRight className="size-6" /></button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-bold text-white">{i + 1} / {list.length}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Copy-link / native share button. */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href.split("#")[0];
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelled: fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={() => void share()} className={cn("inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] bg-white px-4 py-2 text-sm font-bold text-[#0b0b0c] hover:bg-[#f4f4f5]", className)} data-testid="share-button">
      {copied ? "Link copied ✓" : "Copy link / Share"}
    </button>
  );
}
