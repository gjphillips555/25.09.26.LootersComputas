import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CarFront, Flag, Fuel, Gauge, Loader2, MapPin, MessageCircle, Pencil, Settings2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PhotoGallery, SearchEverywhere, autoApi, messageSeller } from "@/components/auto/auto-ui";
import { ChatAvatar, signInHref } from "@/components/siftah/site-chat-panes";
import { km, nzd, type AutoListing } from "@/lib/auto/shared";

export const Route = createFileRoute("/auto/$id")({
  head: () => ({ meta: [{ title: "Vehicle for sale · Siftah Auto" }] }),
  component: AutoDetail,
});

type Detail = { listing: AutoListing; isOwner: boolean; isAdmin: boolean; reports: number; signedIn: boolean };

function AutoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [d, setD] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { ok, data } = await autoApi<Detail>(`/api/auto/listings?op=listing&id=${encodeURIComponent(id)}`);
    if (ok) {
      setD(data);
      document.title = `${data.listing.title} · ${nzd(data.listing.price)} · Siftah Auto`;
    } else setMissing(true);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    const { ok, data } = await autoApi("/api/auto/listings", { body: { ...body, id } });
    setBusy(false);
    if (ok) {
      toast.success(msg);
      if (body.action === "delete") void navigate({ to: "/auto/sell" as "/", hash: "mine" });
      else void load();
    } else toast.error(data.error || "Something went wrong");
  };

  if (missing) {
    return (
      <AppShell>
        <div className="py-20 text-center">
          <CarFront className="mx-auto size-12 text-[#e3121b]" />
          <p className="mt-3 font-display text-2xl">Listing not found</p>
          <p className="mt-1 text-sm text-muted-foreground">It may have been sold, removed or never existed.</p>
          <Link to={"/auto" as "/"} className="mt-5 inline-flex rounded-full bg-[#e3121b] px-5 py-2.5 text-sm font-bold text-white">Back to Siftah Auto</Link>
        </div>
      </AppShell>
    );
  }
  if (!d) {
    return <AppShell><div className="flex justify-center py-24"><Loader2 className="size-8 animate-spin text-[#e3121b]" /></div></AppShell>;
  }
  const l = d.listing;
  const specs: Array<[typeof Gauge, string, string]> = [
    [CalendarDays, "Year", String(l.year)],
    [Gauge, "Odometer", km(l.odometer)],
    [Fuel, "Fuel", l.fuel || "—"],
    [Settings2, "Transmission", l.transmission || "—"],
    [CarFront, "Body", l.bodyType || "—"],
    [MapPin, "Location", `${l.location ? `${l.location}, ` : ""}${l.region}`],
  ];

  return (
    <AppShell>
      <div className="py-4">
        <Link to={"/auto" as "/"} className="inline-flex items-center gap-1 text-sm font-bold text-[#1f9fd6] hover:underline"><ArrowLeft className="size-4" /> Siftah Auto</Link>
      </div>
      {l.status !== "active" && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-[#e3121b] bg-[#e3121b]/5 px-4 py-3 text-sm font-bold text-[#a80b12]">
          <ShieldAlert className="size-4" /> {l.status === "sold" ? "This vehicle has been sold." : "This listing was removed by a site admin."}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PhotoGallery photos={l.photos} title={l.title} />
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-3xl leading-tight">{l.title}</h1>
            <p className="mt-1 text-3xl font-black text-[#e3121b]">{nzd(l.price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Listed {new Date(l.createdAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {specs.map(([Icon, k, v]) => (
              <div key={k} className="rounded-xl bg-[#f4f4f5] px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#55555c]"><Icon className="size-3" />{k}</dt>
                <dd className="text-sm font-bold text-[#0b0b0c]">{v}</dd>
              </div>
            ))}
          </dl>
          {l.rego && (
            <p className="text-sm">
              Rego <span className="rounded border-2 border-[#0b0b0c] bg-white px-2 py-0.5 font-mono font-black tracking-widest">{l.rego}</span>{" "}
              <a href={`https://www.carjam.co.nz/car/?plate=${encodeURIComponent(l.rego)}`} target="_blank" rel="noopener noreferrer nofollow" className="text-xs font-bold text-[#1f9fd6] hover:underline">Check on CarJam ↗</a>
            </p>
          )}

          {l.seller && (
            <div className="flex items-center gap-3 rounded-2xl border-2 border-[#0b0b0c] p-3">
              <ChatAvatar user={l.seller} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#55555c]">Seller</p>
                <p className="truncate font-bold">{l.seller.name}</p>
              </div>
              {!d.isOwner && l.status === "active" && (
                d.signedIn ? (
                  <button type="button" onClick={() => messageSeller(l.seller!)} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff2a33]" data-testid="message-seller">
                    <MessageCircle className="size-4" /> Message seller
                  </button>
                ) : (
                  <a href={signInHref()} className="inline-flex items-center gap-1.5 rounded-full bg-[#e3121b] px-4 py-2 text-sm font-bold text-white" data-testid="message-seller">
                    <MessageCircle className="size-4" /> Sign in to message
                  </a>
                )
              )}
            </div>
          )}

          {d.isOwner && (
            <div className="flex flex-wrap gap-2">
              <Link to={"/auto/sell" as "/"} search={{ edit: l.id } as never} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-4 py-2 text-sm font-bold"><Pencil className="size-4" /> Edit</Link>
              {l.status === "active" && <button type="button" disabled={busy} onClick={() => act({ action: "status", status: "sold" }, "Marked as sold")} className="rounded-full bg-[#0b0b0c] px-4 py-2 text-sm font-bold text-white">Mark sold</button>}
              {l.status === "sold" && <button type="button" disabled={busy} onClick={() => act({ action: "status", status: "active" }, "Listing is live again")} className="rounded-full bg-[#0b0b0c] px-4 py-2 text-sm font-bold text-white">Relist</button>}
              <button type="button" disabled={busy} onClick={() => window.confirm("Delete this listing permanently?") && act({ action: "delete" }, "Listing deleted")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#e3121b] px-4 py-2 text-sm font-bold text-[#e3121b]"><Trash2 className="size-4" /> Delete</button>
            </div>
          )}

          {d.isAdmin && (
            <div className="rounded-2xl border-2 border-dashed border-[#e3121b] p-3 text-sm">
              <p className="font-bold">Admin · {d.reports} report{d.reports === 1 ? "" : "s"}</p>
              <div className="mt-2 flex gap-2">
                {l.status !== "removed" ? (
                  <button type="button" disabled={busy} onClick={() => { const reason = window.prompt("Reason for removal?", "Breaches listing rules"); if (reason !== null) void act({ action: "admin_remove", reason }, "Listing removed"); }} className="rounded-full bg-[#e3121b] px-3 py-1.5 text-xs font-bold text-white">Remove listing</button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => act({ action: "admin_restore" }, "Listing restored")} className="rounded-full bg-[#0b0b0c] px-3 py-1.5 text-xs font-bold text-white">Restore listing</button>
                )}
              </div>
            </div>
          )}

          {!d.isOwner && d.signedIn && l.status !== "removed" && (
            <button type="button" disabled={busy} onClick={() => { const reason = window.prompt("What's wrong with this listing? (scam, wrong details, offensive…)"); if (reason) void act({ action: "report", reason }, "Thanks, an admin will review it"); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55555c] hover:text-[#e3121b]">
              <Flag className="size-3.5" /> Report listing
            </button>
          )}
        </div>
      </div>

      <section className="mt-8 max-w-3xl">
        <h2 className="font-display text-2xl">Description</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{l.description || "No description provided."}</p>
      </section>
      <SearchEverywhere className="mt-8" make={l.make} model={l.model} rego={l.rego ?? undefined} />
    </AppShell>
  );
}
