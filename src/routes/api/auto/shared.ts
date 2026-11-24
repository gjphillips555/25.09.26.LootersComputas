import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getAdminAccess } from "@/lib/admin.server";
import { newId } from "@/lib/auto/server";
import { fetchPreview } from "@/lib/auto/link-preview.server";
import { getSharedLink, listSharedLinks, mySharedLinks } from "@/lib/auto/shared-links.server";
import { parseShareUrl } from "@/lib/auto/shared";

const SHARES_PER_DAY = 10;
const MAX_ACTIVE = 50;

/**
 * Siftah Auto shared link previews.
 * GET  ?op=list&q=&site=&page=   public: active shared-link cards (+ viewer info)
 * GET  ?op=mine                  signed-in: my active shared links
 * POST {action: share|set_title|delete|report|admin_remove|admin_restore}
 */
export const Route = createFileRoute("/api/auto/shared")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const op = url.searchParams.get("op") || "list";
        const sql = await getSql();
        const session = await getSessionUser().catch(() => null);
        if (op === "list") {
          const admin = session ? await getAdminAccess().catch(() => null) : null;
          const num = (k: string) => {
            const n = Number(url.searchParams.get(k));
            return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
          };
          const result = await listSharedLinks(sql, {
            q: (url.searchParams.get("q") || "").trim().slice(0, 80) || undefined,
            site: url.searchParams.get("site") || undefined,
            page: num("page"),
            limit: num("limit"),
            priceMin: num("priceMin"),
            priceMax: num("priceMax"),
            withReports: Boolean(admin),
          });
          return json({ ...result, viewer: { id: session?.id ?? null, isAdmin: Boolean(admin) } }, 200, { "Cache-Control": "no-store" });
        }
        if (op === "link") {
          const id = (url.searchParams.get("id") || "").slice(0, 40);
          const link = id ? await getSharedLink(sql, id) : null;
          const admin = session ? await getAdminAccess().catch(() => null) : null;
          const isOwner = Boolean(session && link && link.sharer.id === session.id);
          if (!link || (link.status === "removed" && !admin && !isOwner)) return json({ error: "Link not found" }, 404);
          let reports = 0;
          if (admin) {
            const [r] = await sql.query<{ n: number }>(`select count(*) as n from auto_link_reports where link_id = $1`, [id]);
            reports = Number(r?.n) || 0;
          }
          return json({ link: { ...link, reports }, isOwner, viewer: { id: session?.id ?? null, isAdmin: Boolean(admin) } });
        }
        if (op === "mine") {
          if (!session) return json({ error: "Sign in to see your shared links.", code: "SIGN_IN_REQUIRED" }, 401);
          return json({ items: await mySharedLinks(sql, session.id) });
        }
        return json({ error: "Unknown op" }, 400);
      },

      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const session = await getSessionUser().catch(() => null);
        if (!session) return json({ error: "Sign in to share or manage links.", code: "SIGN_IN_REQUIRED" }, 401);
        const me = session.id;
        const sql = await getSql();
        const action = String(body.action || "");
        const id = typeof body.id === "string" ? body.id.slice(0, 40) : "";

        if (action === "share") {
          const banned = await sql.query(`select 1 from site_chat_bans where user_id = $1`, [me]).catch(() => []);
          if (banned.length) return json({ error: "Your account has been blocked from posting by a site admin." }, 403);
          const parsed = parseShareUrl(typeof body.url === "string" ? body.url.slice(0, 2000) : "");
          if ("error" in parsed) return json({ error: parsed.error }, 400);
          const [lim] = await sql.query<{ day: number; active: number }>(
            `select count(*) filter (where created_at > now() - interval '24 hours') as day,
                    count(*) filter (where status = 'active') as active
               from auto_shared_links where sharer_id = $1`,
            [me],
          );
          if (Number(lim?.day) >= SHARES_PER_DAY) return json({ error: `You can share up to ${SHARES_PER_DAY} links per day.` }, 429);
          if (Number(lim?.active) >= MAX_ACTIVE) return json({ error: "You have too many shared links. Remove some first." }, 429);
          const dupe = await sql.query<{ id: string }>(`select id from auto_shared_links where url = $1 and status = 'active'`, [parsed.url]);
          if (dupe.length) return json({ error: "Someone has already shared that listing.", existingId: dupe[0].id }, 409);

          // One fetch of this one URL (plus robots.txt), now, on submit. Never refreshed afterwards.
          const preview = await Promise.race([
            fetchPreview(parsed.url),
            new Promise<Awaited<ReturnType<typeof fetchPreview>>>((resolve) =>
              setTimeout(() => resolve({ site: parsed.site, url: parsed.url, title: null, description: null, image: null,
                siteName: null, price: null, fetchStatus: "error", detail: "Timed out" }), 12_000),
            ),
          ]);
          if ("error" in preview) return json({ error: preview.error }, 400);
          const memberTitle = typeof body.title === "string" ? body.title.trim().slice(0, 90) : "";
          const linkId = newId("sl_");
          try {
            await sql.query(
              `insert into auto_shared_links (id, sharer_id, site, url, og_title, member_title, og_description, og_image, og_site_name, price, fetch_status)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [linkId, me, preview.site, preview.url, preview.title, memberTitle.length >= 3 ? memberTitle : null,
               preview.description, preview.image, preview.siteName, preview.price, preview.fetchStatus],
            );
          } catch {
            return json({ error: "Someone has already shared that listing." }, 409);
          }
          const link = await getSharedLink(sql, linkId);
          return json({ ok: true, link, needsTitle: !link?.title, fetchStatus: preview.fetchStatus, detail: preview.detail ?? null });
        }

        if (action === "set_title") {
          // Members may add their own title only when the page published none.
          const title = typeof body.title === "string" ? body.title.replace(/\s+/g, " ").trim().slice(0, 90) : "";
          if (title.length < 3) return json({ error: "Add a title of at least 3 characters.", errors: { title: "Too short" } }, 400);
          const rows = await sql.query(
            `update auto_shared_links set member_title=$3, updated_at=now()
              where id=$1 and sharer_id=$2 and status='active' and og_title is null returning id`,
            [id, me, title],
          );
          if (!rows.length) return json({ error: "Link not found, not yours, or it already has a title from the site." }, 404);
          return json({ ok: true, link: await getSharedLink(sql, id) });
        }

        if (action === "delete") {
          const rows = await sql.query(`delete from auto_shared_links where id=$1 and sharer_id=$2 returning id`, [id, me]);
          if (!rows.length) return json({ error: "Link not found or not yours." }, 404);
          return json({ ok: true });
        }

        if (action === "report") {
          const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
          if (reason.length < 3) return json({ error: "Tell us briefly what's wrong." }, 400);
          const [recent] = await sql.query<{ n: number }>(
            `select (select count(*) from auto_link_reports where reporter_id = $1 and created_at > now() - interval '1 hour')
                  + (select count(*) from auto_reports where reporter_id = $1 and created_at > now() - interval '1 hour') as n`,
            [me],
          );
          if (Number(recent?.n) >= 10) return json({ error: "Too many reports. Try again later." }, 429);
          const exists = await sql.query<{ sharer_id: string }>(`select sharer_id from auto_shared_links where id = $1 and status = 'active'`, [id]);
          if (!exists.length) return json({ error: "Link not found" }, 404);
          if (exists[0].sharer_id === me) return json({ error: "You can't report your own link." }, 400);
          await sql.query(
            `insert into auto_link_reports (link_id, reporter_id, reason) values ($1,$2,$3)
             on conflict (link_id, reporter_id) do update set reason = excluded.reason, created_at = now()`,
            [id, me, reason],
          );
          return json({ ok: true });
        }

        if (action === "admin_remove" || action === "admin_restore") {
          const admin = await getAdminAccess().catch(() => null);
          if (!admin) return json({ error: "Admins only." }, 403);
          const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
          const rows = action === "admin_remove"
            ? await sql.query(`update auto_shared_links set status='removed', removed_reason=$2, updated_at=now() where id=$1 returning id`, [id, reason || "Removed by admin"])
            : await sql.query(
                `update auto_shared_links set status='active', removed_reason=null, updated_at=now()
                  where id=$1 and not exists (select 1 from auto_shared_links o where o.url = auto_shared_links.url and o.status='active' and o.id <> $1)
                  returning id`,
                [id],
              );
          if (!rows.length) return json({ error: "Link not found" }, 404);
          return json({ ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
