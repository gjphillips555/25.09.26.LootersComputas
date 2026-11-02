import { useEffect, useState } from "react";
import { Download, ImagePlus, LoaderCircle, Trash2, Upload, WandSparkles, X } from "lucide-react";

type GalleryImage = { id: string; prompt: string; image: string; createdAt: number };

const GALLERY_KEY = "siftah-davinci-gallery-v1";
const IMAGE_MODELS = [
  { id: "Qwen/Qwen-Image", label: "Qwen Image · detailed" },
  { id: "black-forest-labs/FLUX.1-schnell", label: "FLUX Schnell · fast" },
  { id: "stabilityai/stable-diffusion-xl-base-1.0", label: "Stable Diffusion XL · editing" },
];

function readGallery(): GalleryImage[] {
  try {
    const value = JSON.parse(localStorage.getItem(GALLERY_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.image === "string").slice(0, 4) : [];
  } catch {
    return [];
  }
}

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

export function DaVinciWorkspace() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0].id);
  const [referenceImage, setReferenceImage] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [activeImage, setActiveImage] = useState<GalleryImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = readGallery();
    setGallery(saved);
    setActiveImage(saved[0] ?? null);
  }, []);

  function saveGallery(next: GalleryImage[]) {
    const limited = next.slice(0, 4);
    setGallery(limited);
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(limited));
    } catch {
      setError("The browser gallery is full. Download an image and remove older gallery items.");
    }
  }

  async function selectFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Reference images must be 3 MB or smaller.");
      return;
    }
    try {
      setReferenceImage(await fileAsDataUrl(file));
      setReferenceName(file.name);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read image.");
    }
  }

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/siftah/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          referenceImage: referenceImage || undefined,
        }),
      });
      const data = await response.json().catch(() => ({})) as { image?: string; error?: string };
      if (!response.ok || !data.image) throw new Error(data.error || "Image generation failed.");
      const item = { id: crypto.randomUUID(), prompt: prompt.trim(), image: data.image, createdAt: Date.now() };
      const next = [item, ...gallery.filter((entry) => entry.id !== item.id)];
      saveGallery(next);
      setActiveImage(item);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image generation failed.");
    } finally {
      setBusy(false);
    }
  }

  function download(image: GalleryImage | null) {
    if (!image) return;
    const anchor = document.createElement("a");
    anchor.href = image.image;
    anchor.download = `da-vinci-${image.id}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function remove(imageId: string) {
    const next = gallery.filter((item) => item.id !== imageId);
    saveGallery(next);
    if (activeImage?.id === imageId) setActiveImage(next[0] ?? null);
  }

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-3 py-5 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">Da Vinci · Image studio</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Make an image. Make it yours.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Describe a new image or upload a reference to transform. Generated work is saved in your local gallery on this device.</p>
        </div>
        <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200">Image generation</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#121216] p-4">
          <div>
            <label htmlFor="davinci-prompt" className="mb-2 block text-xs font-semibold text-zinc-300">What should Da Vinci create?</label>
            <textarea id="davinci-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)}
              rows={5} placeholder="A cinematic product photograph of a custom gaming PC, dramatic orange lighting, clean studio background…"
              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-red-400/50" />
          </div>

          <div>
            <label htmlFor="davinci-model" className="mb-2 block text-xs font-semibold text-zinc-300">Image model</label>
            <select id="davinci-model" value={model} onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#1b1b20] px-3 py-3 text-sm text-zinc-200 outline-none focus:border-red-400/50">
              {IMAGE_MODELS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-300">Reference image (optional)</p>
                <p className="mt-1 truncate text-[11px] text-zinc-500">{referenceName || "Upload an image to edit or use as a visual reference"}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06]">
                <Upload className="size-3.5" /> Upload
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} />
              </label>
            </div>
            {referenceImage && <div className="mt-3 flex items-start gap-3">
              <img src={referenceImage} alt="Reference preview" className="h-20 w-20 rounded-lg border border-white/10 object-cover" />
              <button type="button" onClick={() => { setReferenceImage(""); setReferenceName(""); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"><X className="size-3.5" /> Remove</button>
            </div>}
          </div>

          {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
          <button type="button" onClick={() => void generate()} disabled={busy || !prompt.trim()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? <><LoaderCircle className="size-4 animate-spin" /> Creating image…</> : <><WandSparkles className="size-4" /> Generate image</>}
          </button>
          <p className="text-[10px] leading-5 text-zinc-600">Generation uses your site's Hugging Face inference connection. Provider availability, model licences and inference charges depend on Hugging Face and the selected model.</p>
        </div>

        <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121216]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <p className="text-xs font-semibold text-zinc-300">Canvas</p>
            {activeImage && <button type="button" onClick={() => download(activeImage)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06]"><Download className="size-3.5" /> Download</button>}
          </div>
          <div className="flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,.08),transparent_65%)] p-4">
            {activeImage ? <img src={activeImage.image} alt={activeImage.prompt} className="max-h-[520px] w-full rounded-xl object-contain" /> :
              <div className="max-w-xs text-center"><ImagePlus className="mx-auto size-9 text-zinc-700" /><p className="mt-3 text-sm font-medium text-zinc-400">Your artwork appears here</p><p className="mt-1 text-xs leading-5 text-zinc-600">Write a prompt and generate your first image.</p></div>}
          </div>
          {activeImage && <p className="border-t border-white/[0.07] px-4 py-3 text-xs leading-5 text-zinc-400">{activeImage.prompt}</p>}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-white">Your gallery</h2><p className="mt-1 text-[11px] text-zinc-500">Saved on this device · newest first</p></div>
          <span className="text-xs tabular-nums text-zinc-500">{gallery.length}/4</span>
        </div>
        {gallery.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.map((item) => <div key={item.id} className="group overflow-hidden rounded-xl border border-white/10 bg-[#121216]">
            <button type="button" onClick={() => setActiveImage(item)} className="block w-full text-left">
              <img src={item.image} alt={item.prompt} className="aspect-square w-full object-cover" />
              <span className="block truncate px-2.5 py-2 text-[11px] text-zinc-400">{item.prompt}</span>
            </button>
            <div className="flex justify-end gap-1 border-t border-white/[0.07] p-1.5">
              <button type="button" onClick={() => download(item)} className="rounded-md p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label="Download image"><Download className="size-3.5" /></button>
              <button type="button" onClick={() => remove(item.id)} className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove from gallery"><Trash2 className="size-3.5" /></button>
            </div>
          </div>)}
        </div> : <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-600">No images saved yet.</p>}
      </div>
    </section>
  );
}
