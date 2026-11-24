import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, CalendarDays, CarFront, ExternalLink, Flag, Fuel, Gauge, Link2, Loader2, MapPin, MessageCircle,
  Pencil, Settings2, ShieldAlert, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { SearchEverywhere, autoApi, messageSeller } from "@/components/auto/auto-ui";
import { FullResGallery, ShareButton } from "@/components/auto/gallery";
import { ChatAvatar, signInHref } from "@/components/siftah/site-chat-panes";
import { getAutoDetail, type AutoDetailData } from "@/lib/auto/detail";
import { km, nzd, type AutoListing, type SharedLink } from "@/lib/auto/shared";

const SITE = "https://www.looterscomputas.online";
const FALLBACK_OG = `${SITE}/og.jpg`;
const abs = (u: string) => (/^https?:\/\//.test(u) ? u : `${SITE}${u.startsWith("/") ? "" : "/"}${u}`);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function metaFor(data: AutoDetailData, id: string) {
  const url = `${SITE}/auto/listing/${id}`;
  if (!data || data.kind === "removed") {
    return {
      meta: [
        { title: "Listing not found · Siftah Auto | Siftah Solutions" },
        { name: "robots", content: "noindex" },
      ],
    };
  }
  let title: string;
  let description: string;
  let image: string;
  const extra: Array<Record<string, string>> = [];
  if (data.kind === "listing") {
    const l = data.listing;
    title = `${l.title} · ${nzd(l.price)}${l.status === "sold" ? " (sold)" : ""} | Siftah Auto`;
    const facts = [String(l.year), l.make, l.model, l.odometer != null ? km(l.odometer) : "", l.fuel || "", l.transmission || "", l.location ? `${l.location}, ${l.region}` : l.region]
      .filter(Boolean).join(" · ");
    description = clip(`${facts}. ${l.description || "For sale on Siftah Auto, the NZ car marketplace by Siftah Solutions."}`.replace(/\s+/g, " "), 200);
    image = l.photos[0] ? abs(l.photos[0]) : FALLBACK_OG;
    extra.push(
      { property: "og:type", content: "product" },
      { property: "product:price:amount", content: String(l.price) },
      { property: "product:price:currency", content: "NZD" },
    );
  } else {
    const s = data.link;
    title = `${s.title || `Listing on ${s.siteLabel}`} — shared from ${s.siteLabel} | Siftah Auto`;
    description = clip(s.description || `A Siftah member shared this ${s.siteLabel} listing. View the original on ${s.siteLabel}.`, 200);
    image = s.image || FALLBACK_OG;
    // Summary of a third-party page: keep it out of search indexes (social previews still work).
    extra.push({ property: "og:type", content: "website" }, { name: "robots", content: "noindex, follow" });
  }
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:site_name", content: "Siftah Auto · Siftah Solutions" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@SiftahSolutions" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      ...extra,
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export const Route = createFileRoute("/auto/listing/$id")({
  loader: async ({ params }) => {
    const data = await getAutoDetail({ data: { id: params.id } }).catch(() => null);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => metaFor((loaderData as AutoDetailData) ?? null, params.id),
  component: AutoListingPage,
  notFoundComponent: AutoNotFound,
});

export function AutoNotFound() {
  return (
    <AppShell>
      <div className="py-20 text-center" data-testid="auto-404">
        <CarFront className="mx-auto size-14 text-[#e3121b]" />
        <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-[#55555c]">Siftah Auto · 404</p>
        <h1 className="mt-1 font-display text-3xl">Listing not found</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">It may have been sold and removed, deleted by the seller, or the link is wrong.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to={"/auto" as "/"} className="rounded-full bg-[#e3121b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ff2a33]">Browse Siftah Auto</Link>
          <Link to={"/auto/sell" as "/"} className="rounded-full border-2 border-[#0b0b0c] px-5 py-2.5 text-sm font-bold">List a vehicle</Link>
        </div>
      </div>
    </AppShell>
  );
}

function AutoListingPage() {
  const data = Route.useLoaderData() as AutoDetailData;
  const { id } = Route.useParams();
  if (!data) return <AutoNotFound />;
  if (data.kind === "listing") return <MemberDetail initial={data.listing} />;
  if (data.kind === "shared") return <SharedDetail initial={data.link} />;
  return <RemovedDetail id={id} />;
}

/** Removed items 404 for the public; the owner or an admin can still open them (to restore/delete). */
function RemovedDetail({ id }: { id: string }) {
  const [state, setState] = useState<"loading" | "none" | { listing?: AutoListing; link?: SharedLink }>("loading");
  useEffect(() => {
    const path = id.startsWith("sl_") ? `/api/auto/shared?op=link&id=${encodeURIComponent(id)}` : `/api/auto/listings?op=listing&id=${encodeURIComponent(id)}`;
    void autoApi<{ listing?: AutoListing; link?: SharedLink }>(path).then(({ ok, data }) => setState(ok ? data : "none"));
  }, [id]);
  if (state === "loading") return <AppShell><div className="flex justify-center py-24"><Loader2 className="size-8 animate-spin text-[#e3121b]" /></div></AppShell>;
  if (state === "none") return <AutoNotFound />;
  if (state.listing) return <MemberDetail initial={state.listing} />;
  if (state.link) return <SharedDetail initial={state.link} />;
  return <AutoNotFound />;
}

const posted = (iso: string) => new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "Pacific/Auckland" });

function BackBar({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      <Link to={"/auto" as "/"} className="mr-auto inline-flex items-center gap-1 text-sm font-bold text-[#1f9fd6] hover:underline"><ArrowLeft className="size-4" /> Siftah Auto</Link>
      <ShareButton title={title} />
    </div>
  );
}

type Viewer = { isOwner: boolean; isAdmin: boolean; reports: number; signedIn: boolean };

function MemberDetail({ initial }: { initial: AutoListing }) {
  const navigate = useNavigate();
  const [l, setL] = useState(initial);
  const [v, setV] = useState<Viewer | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { ok, data } = await autoApi<{ listing: AutoListing } & Viewer>(`/api/auto/listings?op=listing&id=${encodeURIComponent(initial.id)}`);
    if (ok) {
      setL(data.listing);
      setV({ isOwner: data.isOwner, isAdmin: data.isAdmin, reports: data.reports, signedIn: data.signedIn });
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);
  const act = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    const { ok, data } = await autoApi("/api/auto/listings", { body: { ...body, id: l.id } });
    setBusy(false);
    if (!ok) return toast.error(data.error || "Something went wrong");
    toast.success(msg);
    if (body.action === "delete") void navigate({ to: "/auto/sell" as "/", hash: "mine" });
    else void load();
  };
  const specs: Array<[typeof Gauge, string, string]> = [
    [CalendarDays, "Year", String(l.year)],
    [CarFront, "Make / model", `${l.make} ${l.model}`],
    [Gauge, "Odometer", km(l.odometer)],
    [Fuel, "Fuel", l.fuel || "—"],
    [Settings2, "Transmission", l.transmission || "—"],
    [CarFront, "Body", l.bodyType || "—"],
    [MapPin, "Location", `${l.location ? `${l.location}, ` : ""}${l.region}`],
  ];
  return (
    <AppShell>
      <BackBar title={l.title} />
      {l.status !== "active" && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-[#e3121b] bg-[#e3121b]/5 px-4 py-3 text-sm font-bold text-[#a80b12]">
          <ShieldAlert className="size-4" /> {l.status === "sold" ? "This vehicle has been sold." : "This listing was removed by a site admin (only you and admins can see it)."}
        </div>
      )}
      <article className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" data-testid="auto-detail" data-kind="listing">
        <FullResGallery photos={l.photos} title={l.title} badge={<span className="rounded-full bg-[#e3121b] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Siftah listing</span>} />
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1f9fd6]">Siftah Auto · NZ</p>
            <h1 className="font-display text-3xl leading-tight">{l.title}</h1>
            <p className="mt-1 text-3xl font-black text-[#e3121b]" data-testid="detail-price">{nzd(l.price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Posted {posted(l.createdAt)}{l.updatedAt !== l.createdAt ? ` · updated ${posted(l.updatedAt)}` : ""}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {specs.map(([Icon, k, val]) => (
              <div key={k} className="rounded-xl bg-[#f4f4f5] px-3 py-2">
                <dt className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#55555c]"><Icon className="size-3" />{k}</dt>
                <dd className="text-sm font-bold text-[#0b0b0c]">{val}</dd>
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
            <div className="flex items-center gap-3 rounded-2xl border-2 border-[#0b0b0c] p-3" data-testid="posted-by">
              <ChatAvatar user={l.seller} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#55555c]">Posted by</p>
                <p className="truncate font-bold">{l.seller.name}</p>
              </div>
              {!v?.isOwner && l.status === "active" && (
                v?.signedIn ? (
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
          {v?.isOwner && (
            <div className="flex flex-wrap gap-2">
              <Link to={"/auto/sell" as "/"} search={{ edit: l.id } as never} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#0b0b0c] px-4 py-2 text-sm font-bold" data-testid="owner-edit"><Pencil className="size-4" /> Edit</Link>
              {l.status === "active" && <button type="button" disabled={busy} onClick={() => act({ action: "status", status: "sold" }, "Marked as sold")} className="rounded-full bg-[#0b0b0c] px-4 py-2 text-sm font-bold text-white">Mark sold</button>}
              {l.status === "sold" && <button type="button" disabled={busy} onClick={() => act({ action: "status", status: "active" }, "Listing is live again")} className="rounded-full bg-[#0b0b0c] px-4 py-2 text-sm font-bold text-white">Relist</button>}
              <button type="button" disabled={busy} onClick={() => window.confirm("Delete this listing permanently?") && act({ action: "delete" }, "Listing deleted")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#e3121b] px-4 py-2 text-sm font-bold text-[#e3121b]" data-testid="owner-delete"><Trash2 className="size-4" /> Delete</button>
            </div>
          )}
          {v?.isAdmin && (
            <div className="rounded-2xl border-2 border-dashed border-[#e3121b] p-3 text-sm">
              <p className="font-bold">Admin · {v.reports} report{v.reports === 1 ? "" : "s"}</p>
              <div className="mt-2 flex gap-2">
                {l.status !== "removed" ? (
                  <button type="button" disabled={busy} onClick={() => { const reason = window.prompt("Reason for removal?", "Breaches listing rules"); if (reason !== null) void act({ action: "admin_remove", reason }, "Listing removed"); }} className="rounded-full bg-[#e3121b] px-3 py-1.5 text-xs font-bold text-white">Remove listing</button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => act({ action: "admin_restore" }, "Listing restored")} className="rounded-full bg-[#0b0b0c] px-3 py-1.5 text-xs font-bold text-white">Restore listing</button>
                )}
              </div>
            </div>
          )}
          {v && !v.isOwner && v.signedIn && l.status !== "removed" && (
            <button type="button" disabled={busy} onClick={() => { const reason = window.prompt("What's wrong with this listing? (scam, wrong details, offensive…)"); if (reason) void act({ action: "report", reason }, "Thanks, an admin will review it"); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55555c] hover:text-[#e3121b]">
              <Flag className="size-3.5" /> Report listing
            </button>
          )}
        </div>
      </article>
      <section className="mt-8 max-w-3xl">
        <h2 className="font-display text-2xl">Description</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6" data-testid="detail-description">{l.description || "No description provided."}</p>
      </section>
      <SearchEverywhere className="mt-8" make={l.make} model={l.model} rego={l.rego ?? undefined} />
    </AppShell>
  );
}

function SharedDetail({ initial }: { initial: SharedLink }) {
  const navigate = useNavigate();
  const [s, setS] = useState(initial);
  const [v, setV] = useState<{ isOwner: boolean; isAdmin: boolean; signedIn: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { ok, data } = await autoApi<{ link: SharedLink; isOwner: boolean; viewer: { id: string | null; isAdmin: boolean } }>(`/api/auto/shared?op=link&id=${encodeURIComponent(initial.id)}`);
    if (ok) {
      setS(data.link);
      setV({ isOwner: data.isOwner, isAdmin: data.viewer.isAdmin, signedIn: Boolean(data.viewer.id) });
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);
  const act = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    const { ok, data } = await autoApi("/api/auto/shared", { body: { ...body, id: s.id } });
    setBusy(false);
    if (!ok) return toast.error(data.error || "Something went wrong");
    toast.success(msg);
    if (body.action === "delete") void navigate({ to: "/auto/share" as "/", hash: "mine" });
    else void load();
  };
  const title = s.title || `Listing on ${s.siteLabel}`;
  const viewOriginal = (
    <a href={s.url} target="_blank" rel="noopener nofollow ugc" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0c] px-5 py-3.5 text-base font-black text-white hover:bg-[#e3121b]" data-testid="view-original">
      View original on {s.siteLabel} <ExternalLink className="size-5" />
    </a>
  );
  return (
    <AppShell>
      <BackBar title={title} />
      {s.status === "removed" && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border-2 border-[#e3121b] bg-[#e3121b]/5 px-4 py-3 text-sm font-bold text-[#a80b12]">
          <ShieldAlert className="size-4" /> This shared link was removed by a site admin (only you and admins can see it).
        </div>
      )}
      <article className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" data-testid="auto-detail" data-kind="shared">
        <FullResGallery
          photos={s.image ? [s.image] : []}
          title={title}
          noReferrer
          badge={<span className="inline-flex items-center gap-1 rounded-full bg-[#5cc8f2] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#0b0b0c]"><Link2 className="size-3" /> Shared from {s.siteLabel}</span>}
        />
        <div className="space-y-4">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[#0b0b0c] px-3 py-1 text-[11px] font-black uppercase tracking-wider" data-testid="shared-attribution">
              <Link2 className="size-3.5" /> Shared from {s.siteLabel}
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight">{title}</h1>
            {s.price != null && <p className="mt-1 text-3xl font-black text-[#e3121b]">{nzd(s.price)}</p>}
            <p className="mt-1 text-xs text-muted-foreground">Shared {posted(s.createdAt)}{s.titleSource === "member" ? " · title written by the member" : ""}</p>
          </div>
          {viewOriginal}
          <p className="text-xs text-muted-foreground">
            This isn't a Siftah listing. Price, details and availability are on {s.siteLabel}; deal with the seller there.
            {s.siteName && s.siteName !== s.siteLabel ? ` Source: ${s.siteName}.` : ""}
          </p>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-[#0b0b0c] p-3" data-testid="posted-by">
            <ChatAvatar user={s.sharer} className="size-11" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#55555c]">Shared by</p>
              <p className="truncate font-bold">{s.sharer.name}</p>
            </div>
          </div>
          {(v?.isOwner || v?.isAdmin) && (
            <div className="flex flex-wrap gap-2">
              {v.isOwner && <button type="button" disabled={busy} onClick={() => window.confirm("Remove this shared link?") && act({ action: "delete" }, "Link removed")} className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#e3121b] px-4 py-2 text-sm font-bold text-[#e3121b]"><Trash2 className="size-4" /> Remove</button>}
              {!v.isOwner && v.isAdmin && s.status !== "removed" && (
                <button type="button" disabled={busy} onClick={() => { const r = window.prompt("Reason for removal?", "Breaches listing rules"); if (r !== null) void act({ action: "admin_remove", reason: r }, "Link removed"); }} className="rounded-full bg-[#e3121b] px-4 py-2 text-sm font-bold text-white">Admin remove{s.reports ? ` (${s.reports} reports)` : ""}</button>
              )}
              {v.isAdmin && s.status === "removed" && <button type="button" disabled={busy} onClick={() => act({ action: "admin_restore" }, "Link restored")} className="rounded-full bg-[#0b0b0c] px-4 py-2 text-sm font-bold text-white">Restore</button>}
            </div>
          )}
          {v && !v.isOwner && v.signedIn && s.status === "active" && (
            <button type="button" disabled={busy} onClick={() => { const r = window.prompt("What's wrong with this link? (scam, not a vehicle, offensive…)"); if (r) void act({ action: "report", reason: r }, "Thanks, an admin will review it"); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#55555c] hover:text-[#e3121b]">
              <Flag className="size-3.5" /> Report link
            </button>
          )}
        </div>
      </article>
      <section className="mt-8 max-w-3xl">
        <h2 className="font-display text-2xl">Preview from {s.siteLabel}</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6" data-testid="detail-description">
          {s.description || (s.fetchStatus === "ok" ? "No description was published." : `${s.siteLabel} doesn't provide link previews, so only the link is shown. Open the original for full details.`)}
        </p>
        <div className="mt-4 max-w-sm">{viewOriginal}</div>
      </section>
    </AppShell>
  );
}
