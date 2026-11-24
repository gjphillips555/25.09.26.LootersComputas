import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CarFront, ChevronLeft, ChevronRight, ExternalLink, Fuel, Gauge, MapPin, Settings2 } from "lucide-react";
import { getBearerToken } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { km, nzd, searchEverywhereLinks, type AutoListing } from "@/lib/auto/shared";

export async function autoApi<T = Record<string, unknown>>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; form?: FormData } = {},
): Promise<{ ok: boolean; status: number; data: T & { error?: string; errors?: Record<string, string> } }> {
  const headers: Record<string, string> = {};
  const bearer = getBearerToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method: init.method ?? (init.body !== undefined || init.form ? "POST" : "GET"),
    credentials: "same-origin",
    headers,
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  let data = {} as T & { error?: string };
  try {
    data = (await res.json()) as T & { error?: string };
  } catch {
    /* non-JSON */
  }
  return { ok: res.ok, status: res.status, data };
}

/** Open a private site-chat DM with a seller (handled by the floating chat head). */
export function messageSeller(seller: { id: string; name: string; image: string | null }) {
  window.dispatchEvent(new CustomEvent("siftah:open-chat", { detail: { peer: seller } }));
}

export function ListingCard({ listing }: { listing: AutoListing }) {
  const photo = listing.photos[0];
  const inner = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0b0b0c]">
        {photo ? (
          <img src={photo} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex size-full items-center justify-center text-white/30"><CarFront className="size-14" /></div>
        )}
        {listing.status === "sold" && (
          <span className="absolute left-2 top-2 rounded-full bg-[#e3121b] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Sold</span>
        )}
        {listing.source !== "siftah" && (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#0b0b0c]">via {listing.source}</span>
        )}
        {listing.photos.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{listing.photos.length} photos</span>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <p className="line-clamp-1 font-display text-base leading-tight text-[#0b0b0c]">{listing.title}</p>
        <p className="text-lg font-black text-[#e3121b]">{nzd(listing.price)}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#55555c]">
          <span className="inline-flex items-center gap-1"><Gauge className="size-3.5" />{km(listing.odometer)}</span>
          {listing.fuel && <span className="inline-flex items-center gap-1"><Fuel className="size-3.5" />{listing.fuel}</span>}
          {listing.transmission && <span className="inline-flex items-center gap-1"><Settings2 className="size-3.5" />{listing.transmission}</span>}
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{listing.location ? `${listing.location}, ` : ""}{listing.region}</span>
        </div>
      </div>
    </>
  );
  const cls = "group block overflow-hidden rounded-2xl border-2 border-[#0b0b0c] bg-white shadow-[4px_4px_0_#0b0b0c] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#e3121b]";
  return listing.externalUrl ? (
    <a href={listing.externalUrl} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link to={"/auto/listing/$id" as "/"} params={{ id: listing.id } as never} className={cls}>{inner}</Link>
  );
}

export function SearchEverywhere({ q, make, model, rego, className }: { q?: string; make?: string; model?: string; rego?: string; className?: string }) {
  const links = searchEverywhereLinks({ q, make, model, rego });
  const words = [make, model, q].filter(Boolean).join(" ");
  return (
    <section className={cn("rounded-2xl border-2 border-[#0b0b0c] bg-[#0b0b0c] p-4 text-white", className)} aria-label="Search everywhere">
      <p className="font-display text-lg">Search everywhere</p>
      <p className="mt-0.5 text-xs text-white/60">
        Open {words ? <>“{words}”</> : "this search"} on other NZ car sites. These open their own websites in a new tab; Siftah doesn't copy their listings.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-xs font-bold hover:border-[#5cc8f2] hover:bg-white/10"
            data-testid={`everywhere-${l.id}`}
          >
            {l.label} <ExternalLink className="size-3" />
          </a>
        ))}
      </div>
    </section>
  );
}

export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [photos.length]);
  if (!photos.length) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-[#0b0b0c] bg-[#0b0b0c] text-white/30">
        <CarFront className="size-20" />
      </div>
    );
  }
  const go = (d: number) => setI((v) => (v + d + photos.length) % photos.length);
  return (
    <div className="space-y-2" onKeyDown={(e) => (e.key === "ArrowRight" ? go(1) : e.key === "ArrowLeft" ? go(-1) : null)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-[#0b0b0c] bg-[#0b0b0c]">
        <img src={photos[i]} alt={`${title} photo ${i + 1}`} className="size-full object-contain" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80" aria-label="Previous photo"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80" aria-label="Next photo"><ChevronRight className="size-5" /></button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">{i + 1} / {photos.length}</span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, idx) => (
            <button key={p + idx} type="button" onClick={() => setI(idx)} className={cn("h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2", idx === i ? "border-[#e3121b]" : "border-transparent opacity-70 hover:opacity-100")}>
              <img src={p} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies

/**
 * Prepare a photo for upload at its ORIGINAL resolution. It is re-encoded once in the browser so camera
 * metadata (EXIF GPS location, serials) is stripped and orientation is baked in. It is only scaled down if
 * the browser's canvas limit (~16 MP) or the 4 MB upload cap can't otherwise be met.
 */
export async function resizeImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const MAX_AREA = 16_000_000;
    let scale = Math.min(1, Math.sqrt(MAX_AREA / (img.naturalWidth * img.naturalHeight)));
    const encode = (q: number) => {
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      return new Promise<Blob>((resolve, reject) => canvas.toBlob((bl) => (bl ? resolve(bl) : reject(new Error("encode failed"))), "image/jpeg", q));
    };
    for (let attempt = 0; attempt < 8; attempt++) {
      for (const q of [0.92, 0.86, 0.8]) {
        const blob = await encode(q);
        if (blob.size <= UPLOAD_MAX_BYTES) return blob;
      }
      scale *= 0.85; // still too big at full size: step down gently
    }
    return await encode(0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}
