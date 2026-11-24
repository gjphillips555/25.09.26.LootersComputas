import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Check, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { authClient, getBearerToken } from "@/lib/auth/client";
import { USERNAME_MAX, normalizeUsername, usernameError } from "@/lib/profile/shared";
import { cn } from "@/lib/utils";

type Profile = { name: string; image: string | null; originalImage: string | null; customAvatar: boolean };

async function call(init: { body?: unknown; form?: FormData } = {}) {
  const headers: Record<string, string> = {};
  const bearer = getBearerToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch("/api/profile", {
    method: init.body !== undefined || init.form ? "POST" : "GET",
    credentials: "same-origin",
    headers,
    body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  let data: { profile?: Profile; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data };
}

/** Re-read the session past Better Auth's 5-minute cookie cache, then tell the app (chat, header) to refresh. */
export async function refreshProfileEverywhere() {
  try {
    await authClient.getSession({ query: { disableCookieCache: true } });
    (authClient as unknown as { $store?: { notify: (s: string) => void } }).$store?.notify("$sessionSignal");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("siftah:profile-updated"));
}

/** Centre-crop to a square, scale to 512 px and re-encode as JPEG (drops EXIF/GPS, bakes orientation). */
async function squareAvatar(file: File, zoom: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const side = Math.min(bmp.width, bmp.height) / Math.max(1, zoom);
  const sx = (bmp.width - side) / 2;
  const sy = (bmp.height - side) / 2;
  const out = 512;
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, out, out);
  bmp.close?.();
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88));
}

export function ProfileEditor({ compact = false, onSaved }: { compact?: boolean; onSaved?: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void call().then(({ ok, status, data }) => {
      if (status === 401) return setSignedOut(true);
      if (ok && data.profile) {
        setProfile(data.profile);
        setName(data.profile.name);
      }
    });
  }, []);
  useEffect(() => {
    if (!file) return setPreview(null);
    let alive = true;
    void squareAvatar(file, zoom).then((b) => {
      if (!alive) return;
      const url = URL.createObjectURL(b);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    }).catch(() => toast.error("Couldn't read that picture."));
    return () => {
      alive = false;
    };
  }, [file, zoom]);

  if (signedOut) return <p className="text-sm text-[#55555c]">Sign in to change your username and avatar.</p>;
  if (!profile) return <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-[#55555c]" /></div>;

  const done = async (p?: Profile, msg?: string) => {
    if (p) {
      setProfile(p);
      setName(p.name);
    }
    await refreshProfileEverywhere();
    if (msg) toast.success(msg);
    onSaved?.();
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    const n = normalizeUsername(name);
    const err = n === profile.name ? "That's already your username." : usernameError(n);
    setNameErr(err);
    if (err) return;
    setSaving(true);
    const { ok, data } = await call({ body: { action: "set_name", name: n } });
    setSaving(false);
    if (!ok) return setNameErr(data.error || "Couldn't save.");
    await done(data.profile, "Username updated");
  };

  const uploadAvatar = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await squareAvatar(file, zoom);
      const form = new FormData();
      form.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const { ok, data } = await call({ form });
      if (!ok) return toast.error(data.error || "Upload failed");
      setFile(null);
      await done(data.profile, "Avatar updated");
    } finally {
      setUploading(false);
    }
  };

  const revert = async () => {
    setUploading(true);
    const { ok, data } = await call({ body: { action: "revert_avatar" } });
    setUploading(false);
    if (!ok) return toast.error(data.error || "Couldn't revert");
    await done(data.profile, profile.originalImage ? "Back to your Google photo" : "Photo removed");
  };

  const shown = preview || profile.image;
  return (
    <div className={cn("space-y-4 text-[#0b0b0c]", compact && "text-sm")} data-testid="profile-editor">
      <div className="flex items-center gap-4">
        <span className="relative inline-flex size-20 shrink-0 overflow-hidden rounded-full border-2 border-[#0b0b0c] bg-[#e3121b]">
          {shown ? (
            <img src={shown} alt="Your avatar" referrerPolicy="no-referrer" className="size-full object-cover" data-testid="profile-avatar" />
          ) : (
            <span className="m-auto font-display text-3xl text-white">{profile.name.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { setZoom(1); setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} data-testid="avatar-file" />
          {!file ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-[#0b0b0c] px-3.5 py-2 text-xs font-bold text-white"><Camera className="size-3.5" /> Change photo</button>
              {profile.customAvatar && (
                <button type="button" onClick={revert} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-3 py-1.5 text-xs font-bold" data-testid="avatar-revert"><RotateCcw className="size-3.5" /> {profile.originalImage ? "Use my Google photo" : "Remove photo"}</button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-[#55555c]">Zoom
                <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[#e3121b]" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={uploadAvatar} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-3.5 py-2 text-xs font-bold text-white" data-testid="avatar-save">{uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save photo</button>
                <button type="button" onClick={() => setFile(null)} className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-bold">Cancel</button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-[#55555c]">Square-cropped to 512 px; location data is removed.</p>
        </div>
      </div>
      <form onSubmit={saveName} className="space-y-1.5">
        <label className="block text-xs font-bold text-[#55555c]" htmlFor="profile-username">Username</label>
        <div className="flex gap-2">
          <input id="profile-username" value={name} maxLength={USERNAME_MAX} onChange={(e) => { setName(e.target.value); setNameErr(null); }} className="h-10 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 text-sm" data-testid="username-input" />
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-4 text-sm font-bold text-white disabled:opacity-60" data-testid="username-save">{saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}</button>
        </div>
        {nameErr && <p className="text-xs font-bold text-[#e3121b]" data-testid="username-error">{nameErr}</p>}
        <p className="text-[11px] text-[#55555c]">Shown in chat, the online list and on your listings. 3–24 letters, numbers, spaces, dots, dashes or underscores.</p>
      </form>
    </div>
  );
}
