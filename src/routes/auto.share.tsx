import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { autoApi } from "@/components/auto/auto-ui";
import { SharedLinkCard, type Viewer } from "@/components/auto/shared-link-card";
import { SHARE_SITES, parseShareUrl, type SharedLink } from "@/lib/auto/shared";

export const Route = createFileRoute("/auto/share")({
  head: () => ({ meta: [{ title: "Share a car from another site · Siftah Auto" }] }),
  component: AutoShare,
});

const STATUS_NOTE: Record<string, string> = {
  ok: "We read the page's public preview (title, description, image).",
  no_og: "That page didn't publish a preview, so add your own title below.",
  robots: "That site's robots.txt doesn't allow automated previews, so we saved just the link. Add your own title below.",
  blocked: "That site blocked the preview request, so we saved just the link. Add your own title below.",
  error: "We couldn't reach that page right now, so we saved just the link. Add your own title below.",
};

function AutoShare() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ link: SharedLink; needsTitle: boolean; fetchStatus: string } | null>(null);
  const [title, setTitle] = useState("");
  const [mine, setMine] = useState<SharedLink[] | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);

  const loadMine = async () => {
    const { ok, data } = await autoApi<{ items: SharedLink[] }>("/api/auto/shared?op=mine");
    setMine(ok ? data.items : []);
  };
  useEffect(() => {
    void loadMine();
    void autoApi<{ viewer: Viewer }>("/api/auto/shared?op=list&limit=1").then(({ ok, data }) => ok && setViewer(data.viewer));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const check = parseShareUrl(url);
    if ("error" in check) return setError(check.error);
    setBusy(true);
    const { ok, data } = await autoApi<{ link: SharedLink; needsTitle: boolean; fetchStatus: string }>("/api/auto/shared", { body: { action: "share", url } });
    setBusy(false);
    if (!ok) return setError(data.error || "Couldn't share that link.");
    setResult({ link: data.link, needsTitle: data.needsTitle, fetchStatus: data.fetchStatus });
    setUrl("");
    setTitle("");
    toast.success("Shared on Siftah Auto");
    void loadMine();
  };

  const saveTitle = async (e: FormEvent) => {
    e.preventDefault();
    if (!result) return;
    const { ok, data } = await autoApi<{ link: SharedLink }>("/api/auto/shared", { body: { action: "set_title", id: result.link.id, title } });
    if (!ok) return toast.error(data.error || "Couldn't save the title");
    setResult({ ...result, link: data.link, needsTitle: false });
    toast.success("Title added");
    void loadMine();
  };

  return (
    <AppShell>
      <div className="py-4">
        <Link to={"/auto" as "/"} className="inline-flex items-center gap-1 text-sm font-bold text-[#1f9fd6] hover:underline"><ArrowLeft className="size-4" /> Siftah Auto</Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <form onSubmit={submit} className="space-y-4 rounded-3xl border-2 border-[#0b0b0c] bg-white p-5 shadow-[6px_6px_0_#5cc8f2]" data-testid="share-form">
            <div>
              <h1 className="font-display text-3xl">Share a car from another site</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Paste the link to <b>one</b> vehicle listing. Siftah shows a preview card that sends buyers to the original listing.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.values(SHARE_SITES).map((s) => (
                <span key={s.label} className="rounded-full bg-[#f4f4f5] px-2.5 py-1 text-[11px] font-bold text-[#0b0b0c]">{s.label}</span>
              ))}
            </div>
            <label className="block text-xs font-bold text-[#55555c]">
              Listing link
              <input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                type="url"
                inputMode="url"
                required
                placeholder="https://www.trademe.co.nz/a/motors/cars/…/listing/1234567890"
                className="mt-1 h-12 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-[#0b0b0c]"
                data-testid="share-url"
              />
            </label>
            {error && <p className="rounded-xl bg-[#e3121b]/10 px-3 py-2 text-sm font-bold text-[#a80b12]" data-testid="share-error">{error}</p>}
            <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e3121b] text-base font-bold text-white hover:bg-[#ff2a33] disabled:opacity-50">
              {busy ? <><Loader2 className="size-4 animate-spin" /> Fetching preview…</> : <><Link2 className="size-4" /> Share link</>}
            </button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              We fetch that one page once, now, and read only its public preview tags (title, short description, image, site name) —
              respecting the site's robots.txt. Images load from the original site; nothing is copied. Up to 10 shares a day. Only share
              genuine vehicle listings; shared links can be reported and removed.
            </p>
          </form>

          {result && (
            <section className="space-y-3" data-testid="share-result">
              <p className="text-sm font-bold">
                {result.fetchStatus !== "ok" && !result.needsTitle
                  ? "Saved. Buyers see your title and a button to the original listing."
                  : STATUS_NOTE[result.fetchStatus] || STATUS_NOTE.error}
              </p>
              <div className="max-w-sm"><SharedLinkCard link={result.link} viewer={viewer} onChanged={() => { setResult(null); void loadMine(); }} /></div>
              {result.needsTitle && (
                <form onSubmit={saveTitle} className="flex max-w-sm gap-2" data-testid="share-title-form">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={90} placeholder="e.g. 2018 Toyota Hilux SR5" className="h-11 min-w-0 flex-1 rounded-xl border border-black/15 bg-white px-3 text-sm text-[#0b0b0c]" />
                  <button type="submit" className="rounded-xl bg-[#0b0b0c] px-4 text-sm font-bold text-white">Add title</button>
                </form>
              )}
            </section>
          )}
        </div>

        <section id="mine">
          <h2 className="font-display text-2xl">My shared links</h2>
          {mine === null ? (
            <div className="py-10 text-center"><Loader2 className="mx-auto size-6 animate-spin text-[#e3121b]" /></div>
          ) : mine.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">You haven't shared any links yet.</p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2" data-testid="share-mine">
              {mine.map((l) => <SharedLinkCard key={l.id} link={l} viewer={viewer} onChanged={() => void loadMine()} />)}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
