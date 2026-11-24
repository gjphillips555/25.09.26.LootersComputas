import { useState } from "react";
import { ExternalLink, Flag, Link2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChatAvatar } from "@/components/siftah/site-chat-panes";
import { autoApi } from "@/components/auto/auto-ui";
import { nzd, type SharedLink } from "@/lib/auto/shared";
import { cn } from "@/lib/utils";

const SITE_TONE: Record<string, string> = {
  trademe: "bg-[#ffd400] text-[#0b0b0c]",
  turners: "bg-[#e31837] text-white",
  autotrader: "bg-[#1f6fd6] text-white",
  facebook: "bg-[#1877f2] text-white",
  carjam: "bg-[#0b0b0c] text-white",
};

export type Viewer = { id: string | null; isAdmin: boolean };

/**
 * A member-shared link preview. Thumbnail is the page's public og:image, HOTLINKED from the original site
 * (no copy stored, no proxy) with no referrer; falls back to a site placeholder if it fails to load.
 */
export function SharedLinkCard({ link, viewer, onChanged }: { link: SharedLink; viewer?: Viewer | null; onChanged?: () => void }) {
  const [imgOk, setImgOk] = useState(Boolean(link.image));
  const [busy, setBusy] = useState(false);
  const isOwner = Boolean(viewer?.id && viewer.id === link.sharer.id);
  const act = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    const { ok, data } = await autoApi("/api/auto/shared", { body: { ...body, id: link.id } });
    setBusy(false);
    if (ok) {
      toast.success(msg);
      onChanged?.();
    } else toast.error(data.error || "Something went wrong");
  };
  const title = link.title || `Listing on ${link.siteLabel}`;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border-2 border-dashed border-[#0b0b0c] bg-white shadow-[4px_4px_0_#5cc8f2]" data-testid="shared-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f4f5]">
        {imgOk && link.image ? (
          <img src={link.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-[#55555c]">
            <Link2 className="size-10" />
            <span className="text-xs font-bold">{link.siteLabel}</span>
          </div>
        )}
        <span className={cn("absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow", SITE_TONE[link.site] || "bg-white text-black")}>
          <Link2 className="size-3" /> Shared from {link.siteLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 font-display text-base leading-tight text-[#0b0b0c]">{title}</p>
        {link.price != null && <p className="text-lg font-black text-[#e3121b]">{nzd(link.price)}</p>}
        {link.description && <p className="line-clamp-2 text-xs text-[#55555c]">{link.description}</p>}
        {!link.description && link.fetchStatus !== "ok" && (
          <p className="text-[11px] italic text-[#55555c]">
            {link.fetchStatus === "robots" || link.fetchStatus === "blocked"
              ? `${link.siteLabel} doesn't allow link previews, so only the link is shown.`
              : "No preview was published for this page."}
          </p>
        )}
        <a
          href={link.url}
          target="_blank"
          rel="noopener nofollow ugc"
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0b0b0c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e3121b]"
          data-testid="shared-view"
        >
          View on {link.siteLabel} <ExternalLink className="size-4" />
        </a>
        <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] text-[#55555c]">
          <ChatAvatar user={link.sharer} className="size-6" />
          <span className="min-w-0 flex-1 truncate">Shared by <b className="text-[#0b0b0c]">{link.sharer.name}</b> · not a Siftah listing</span>
          {isOwner && (
            <button type="button" disabled={busy} onClick={() => window.confirm("Remove this shared link?") && act({ action: "delete" }, "Link removed")} className="inline-flex items-center gap-1 font-bold text-[#e3121b]" data-testid="shared-remove">
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
          {!isOwner && viewer?.isAdmin && (
            <button type="button" disabled={busy} onClick={() => { const r = window.prompt("Reason for removal?", "Breaches listing rules"); if (r !== null) void act({ action: "admin_remove", reason: r }, "Link removed"); }} className="inline-flex items-center gap-1 font-bold text-[#e3121b]" data-testid="shared-admin-remove">
              <ShieldAlert className="size-3.5" /> Remove{link.reports ? ` (${link.reports})` : ""}
            </button>
          )}
          {!isOwner && !viewer?.isAdmin && viewer?.id && (
            <button type="button" disabled={busy} onClick={() => { const r = window.prompt("What's wrong with this link? (scam, not a vehicle, offensive…)"); if (r) void act({ action: "report", reason: r }, "Thanks, an admin will review it"); }} className="inline-flex items-center gap-1 font-bold hover:text-[#e3121b]" data-testid="shared-report" title="Report">
              <Flag className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
