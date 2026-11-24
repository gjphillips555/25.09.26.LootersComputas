import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, Loader2, Search, Star, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ListingCard, autoApi, resizeImage } from "@/components/auto/auto-ui";
import {
  BODY_TYPES, FUELS, MAX_PHOTOS, NZ_REGIONS, POPULAR_MAKES, TRANSMISSIONS, type AutoListing,
} from "@/lib/auto/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auto/sell")({
  head: () => ({ meta: [{ title: "List a vehicle · Siftah Auto" }] }),
  component: AutoSell,
});

type Form = {
  title: string; make: string; model: string; year: string; price: string; odometer: string; region: string; location: string;
  bodyType: string; fuel: string; transmission: string; rego: string; description: string; photos: string[];
};
const EMPTY: Form = {
  title: "", make: "", model: "", year: "", price: "", odometer: "", region: "", location: "",
  bodyType: "", fuel: "", transmission: "", rego: "", description: "", photos: [],
};

function AutoSell() {
  const navigate = useNavigate();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [mine, setMine] = useState<AutoListing[] | null>(null);
  const [regoLookup, setRegoLookup] = useState(false);
  const [looking, setLooking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadMine = async () => {
    const { ok, data } = await autoApi<{ items: AutoListing[] }>("/api/auto/listings?op=mine");
    setMine(ok ? data.items : []);
  };
  useEffect(() => {
    void loadMine();
    void autoApi<{ regoLookup: boolean }>("/api/auto/listings?op=config").then(({ ok, data }) => ok && setRegoLookup(Boolean(data.regoLookup)));
    const edit = new URLSearchParams(window.location.search).get("edit");
    if (edit) {
      setEditId(edit);
      void autoApi<{ listing: AutoListing; isOwner: boolean }>(`/api/auto/listings?op=listing&id=${encodeURIComponent(edit)}`).then(({ ok, data }) => {
        if (!ok || !data.isOwner) {
          toast.error("You can only edit your own listings.");
          setEditId(null);
          return;
        }
        const l = data.listing;
        setForm({
          title: l.title, make: l.make, model: l.model, year: String(l.year), price: String(l.price),
          odometer: l.odometer == null ? "" : String(l.odometer), region: l.region, location: l.location || "",
          bodyType: l.bodyType || "", fuel: l.fuel || "", transmission: l.transmission || "", rego: l.rego || "",
          description: l.description, photos: l.photos,
        });
      });
    }
    if (window.location.hash === "#mine") setTimeout(() => document.getElementById("mine")?.scrollIntoView(), 400);
  }, []);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - form.photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast.message(`Up to ${MAX_PHOTOS} photos per listing.`);
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      setUploading((n) => n + 1);
      try {
        const blob = await resizeImage(file);
        const fd = new FormData();
        fd.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const { ok, data } = await autoApi<{ url: string }>("/api/auto/upload", { form: fd });
        if (ok && data.url) setForm((f) => ({ ...f, photos: [...f.photos, data.url].slice(0, MAX_PHOTOS) }));
        else toast.error(data.error || "Upload failed");
      } catch {
        toast.error("Couldn't read that image.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const lookupRego = async () => {
    if (!form.rego.trim()) return toast.error("Enter the plate first.");
    setLooking(true);
    const { ok, data } = await autoApi<{ vehicle: { make?: string; model?: string; year?: number; fuel?: string } }>("/api/auto/rego", { body: { plate: form.rego } });
    setLooking(false);
    if (!ok) return toast.error(data.error || "Lookup failed");
    const v = data.vehicle;
    const fuel = FUELS.find((f) => v.fuel && v.fuel.toLowerCase().includes(f.toLowerCase())) || form.fuel;
    setForm((f) => ({ ...f, make: v.make || f.make, model: v.model || f.model, year: v.year ? String(v.year) : f.year, fuel }));
    toast.success("Filled in from CarJam");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (uploading) return toast.message("Wait for photos to finish uploading.");
    setSaving(true);
    const { ok, data } = await autoApi<{ id: string }>("/api/auto/listings", {
      body: { action: editId ? "update" : "create", id: editId ?? undefined, ...form },
    });
    setSaving(false);
    if (!ok) {
      setErrors(data.errors || {});
      return toast.error(data.error || "Couldn't save");
    }
    toast.success(editId ? "Listing updated" : "Your vehicle is live on Siftah Auto");
    void navigate({ to: "/auto/$id" as "/", params: { id: data.id } as never });
  };

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-xs font-bold text-[#55555c]">
      {label}
      <input
        value={form[k] as string}
        onChange={(e) => set(k, e.target.value)}
        className={cn("mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm text-[#0b0b0c]", errors[k] ? "border-[#e3121b]" : "border-black/15")}
        {...props}
      />
      {errors[k] && <span className="mt-0.5 block text-[11px] text-[#e3121b]">{errors[k]}</span>}
    </label>
  );
  const select = (k: keyof Form, label: string, options: readonly string[], required = false) => (
    <label className="block text-xs font-bold text-[#55555c]">
      {label}
      <select value={form[k] as string} onChange={(e) => set(k, e.target.value)} required={required} className={cn("mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm text-[#0b0b0c]", errors[k] ? "border-[#e3121b]" : "border-black/15")}>
        <option value="">{required ? "Choose…" : "—"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {errors[k] && <span className="mt-0.5 block text-[11px] text-[#e3121b]">{errors[k]}</span>}
    </label>
  );

  return (
    <AppShell>
      <div className="py-4">
        <Link to={"/auto" as "/"} className="inline-flex items-center gap-1 text-sm font-bold text-[#1f9fd6] hover:underline"><ArrowLeft className="size-4" /> Siftah Auto</Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={submit} className="space-y-5 rounded-3xl border-2 border-[#0b0b0c] bg-white p-5 shadow-[6px_6px_0_#e3121b]" data-testid="auto-form">
          <div>
            <h1 className="font-display text-3xl">{editId ? "Edit listing" : "List a vehicle"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Free for members. Buyers contact you through private Siftah chat.</p>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            {field("rego", "Rego plate (optional)", { placeholder: "ABC123", maxLength: 7, style: { textTransform: "uppercase" } })}
            {regoLookup && (
              <button type="button" onClick={lookupRego} disabled={looking} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#0b0b0c] px-4 text-sm font-bold text-white">
                {looking ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Look up rego
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#55555c]">
              Make
              <input list="sell-makes" value={form.make} onChange={(e) => set("make", e.target.value)} required className={cn("mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm text-[#0b0b0c]", errors.make ? "border-[#e3121b]" : "border-black/15")} placeholder="Toyota" />
              <datalist id="sell-makes">{POPULAR_MAKES.map((m) => <option key={m} value={m} />)}</datalist>
              {errors.make && <span className="mt-0.5 block text-[11px] text-[#e3121b]">{errors.make}</span>}
            </label>
            {field("model", "Model", { required: true, placeholder: "Hilux SR5" })}
            {field("year", "Year", { required: true, inputMode: "numeric", placeholder: "2018" })}
            {field("price", "Price (NZD)", { required: true, inputMode: "numeric", placeholder: "24990" })}
            {field("odometer", "Odometer (km)", { inputMode: "numeric", placeholder: "120000" })}
            {select("region", "Region", NZ_REGIONS, true)}
            {field("location", "Suburb / town", { placeholder: "Hornby" })}
            {select("bodyType", "Body type", BODY_TYPES)}
            {select("fuel", "Fuel", FUELS)}
            {select("transmission", "Transmission", TRANSMISSIONS)}
          </div>
          {field("title", "Listing title (optional — we'll use year, make & model)", { maxLength: 90, placeholder: "2018 Toyota Hilux SR5 4WD, one owner" })}
          <label className="block text-xs font-bold text-[#55555c]">
            Description
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} rows={6} placeholder="Condition, service history, WOF/rego expiry, extras…" className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-[#0b0b0c]" />
            <span className="block text-right text-[10px]">{form.description.length}/5000</span>
          </label>

          <div>
            <p className="text-xs font-bold text-[#55555c]">Photos ({form.photos.length}/{MAX_PHOTOS}) — the first photo is the cover</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {form.photos.map((p, i) => (
                <div key={p} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-[#0b0b0c]">
                  <img src={p} alt="" className="size-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-[#e3121b] px-1.5 text-[9px] font-black text-white">COVER</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    {i > 0 ? (
                      <button type="button" title="Make cover" onClick={() => setForm((f) => ({ ...f, photos: [p, ...f.photos.filter((x) => x !== p)] }))} className="text-white"><Star className="size-4" /></button>
                    ) : <span />}
                    <button type="button" title="Remove" onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((x) => x !== p) }))} className="text-white"><X className="size-4" /></button>
                  </div>
                </div>
              ))}
              {form.photos.length < MAX_PHOTOS && (
                <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#0b0b0c]/40 text-xs font-bold text-[#55555c] hover:border-[#e3121b] hover:text-[#e3121b]">
                  {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
                  {uploading ? "Uploading…" : "Add photos"}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void addPhotos(e.target.files)} data-testid="auto-photo-input" />
          </div>

          <button type="submit" disabled={saving || uploading > 0} className="h-12 w-full rounded-full bg-[#e3121b] text-base font-bold text-white hover:bg-[#ff2a33] disabled:opacity-50">
            {saving ? "Saving…" : editId ? "Save changes" : "Publish listing"}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            By listing you confirm you're entitled to sell this vehicle and the details are accurate. Listings can be reported and removed by admins.
          </p>
        </form>

        <section id="mine">
          <h2 className="font-display text-2xl">My listings</h2>
          {mine === null ? (
            <div className="py-10 text-center"><Loader2 className="mx-auto size-6 animate-spin text-[#e3121b]" /></div>
          ) : mine.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">You haven't listed anything yet.</p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" data-testid="auto-mine">
              {mine.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
