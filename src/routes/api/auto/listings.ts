import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getAdminAccess } from "@/lib/admin.server";
import { carjamEnabled } from "@/lib/auto/carjam";
import { providerStatus, searchProviders } from "@/lib/auto/providers";
import {
  getListing, myListings, newId, ownedPhotos, parseFilters, searchListings, validateListing,
} from "@/lib/auto/server";

/**
 * Siftah Auto listings API.
 * GET  ?op=search&…filters   public browse (member listings + any enabled official providers)
 * GET  ?op=listing&id=…      public detail (active/sold; removed only for owner/admin)
 * GET  ?op=mine              the signed-in user's listings
 * GET  ?op=config            feature switches (rego lookup, providers)
 * POST {action: create|update|status|delete|report|admin_remove, …}  signed-in only
 */
export const Route = createFileRoute("/api/auto/listings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const op = url.searchParams.get("op") || "search";
        const sql = await getSql();
        if (op === "search") {
          const filters = parseFilters(url.searchParams);
          const [local, external] = await Promise.all([searchListings(sql, filters), searchProviders(filters)]);
          return json({ ...local, external }, 200, { "Cache-Control": "no-store" });
        }
        if (op === "listing") {
          const id = (url.searchParams.get("id") || "").slice(0, 40);
          const listing = id ? await getListing(sql, id) : null;
          if (!listing) return json({ error: "Listing not found" }, 404);
          const session = await getSessionUser().catch(() => null);
          const isOwner = session?.id === listing.seller?.id;
          const admin = session ? await getAdminAccess().catch(() => null) : null;
          if (listing.status === "removed" && !isOwner && !admin) return json({ error: "Listing not found" }, 404);
          let reports = 0;
          if (admin) {
            const [r] = await sql.query<{ n: number }>(`select count(*) as n from auto_reports where listing_id = $1`, [id]);
            reports = Number(r?.n) || 0;
          }
          return json({ listing, isOwner, isAdmin: Boolean(admin), reports, signedIn: Boolean(session) });
        }
        if (op === "config") {
          return json({ regoLookup: carjamEnabled(), providers: providerStatus() });
        }
        if (op === "mine") {
          const session = await getSessionUser().catch(() => null);
          if (!session) return json({ error: "Sign in to see your listings.", code: "SIGN_IN_REQUIRED" }, 401);
          return json({ items: await myListings(sql, session.id) });
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
        if (!session) return json({ error: "Sign in to list or manage vehicles.", code: "SIGN_IN_REQUIRED" }, 401);
        const me = session.id;
        const sql = await getSql();
        const action = String(body.action || "");
        const id = typeof body.id === "string" ? body.id.slice(0, 40) : "";

        if (action === "create" || action === "update") {
          const banned = await sql.query(`select 1 from site_chat_bans where user_id = $1`, [me]).catch(() => []);
          if (banned.length) return json({ error: "Your account has been blocked from posting by a site admin." }, 403);
          const { value, errors } = validateListing(body);
          if (!value) return json({ error: "Please fix the highlighted fields.", errors }, 400);
          if (!(await ownedPhotos(sql, me, value.photos))) return json({ error: "One of the photos isn't yours. Re-upload it." }, 400);
          if (action === "create") {
            const [lim] = await sql.query<{ day: number; active: number }>(
              `select count(*) filter (where created_at > now() - interval '24 hours') as day,
                      count(*) filter (where status = 'active') as active
                 from auto_listings where seller_id = $1`,
              [me],
            );
            if (Number(lim?.day) >= 5) return json({ error: "You can create up to 5 listings per day." }, 429);
            if (Number(lim?.active) >= 20) return json({ error: "You can have up to 20 active listings. Mark some as sold first." }, 429);
            const newIdValue = newId();
            await sql.query(
              `insert into auto_listings (id, seller_id, title, make, model, year, price, odometer, region, location,
                 body_type, fuel, transmission, rego, description, photos)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)`,
              [newIdValue, me, value.title, value.make, value.model, value.year, value.price, value.odometer, value.region,
               value.location, value.bodyType, value.fuel, value.transmission, value.rego, value.description, JSON.stringify(value.photos)],
            );
            return json({ ok: true, id: newIdValue });
          }
          const updated = await sql.query(
            `update auto_listings set title=$3, make=$4, model=$5, year=$6, price=$7, odometer=$8, region=$9, location=$10,
                    body_type=$11, fuel=$12, transmission=$13, rego=$14, description=$15, photos=$16::jsonb, updated_at=now()
              where id=$1 and seller_id=$2 and status <> 'removed' returning id`,
            [id, me, value.title, value.make, value.model, value.year, value.price, value.odometer, value.region,
             value.location, value.bodyType, value.fuel, value.transmission, value.rego, value.description, JSON.stringify(value.photos)],
          );
          if (!updated.length) return json({ error: "Listing not found or not yours." }, 404);
          return json({ ok: true, id });
        }

        if (action === "status") {
          const status = body.status === "sold" ? "sold" : body.status === "active" ? "active" : null;
          if (!status) return json({ error: "Invalid status" }, 400);
          const rows = await sql.query(
            `update auto_listings set status=$3, updated_at=now() where id=$1 and seller_id=$2 and status <> 'removed' returning id`,
            [id, me, status],
          );
          if (!rows.length) return json({ error: "Listing not found or not yours." }, 404);
          return json({ ok: true });
        }

        if (action === "delete") {
          const rows = await sql.query(`delete from auto_listings where id=$1 and seller_id=$2 returning id`, [id, me]);
          if (!rows.length) return json({ error: "Listing not found or not yours." }, 404);
          return json({ ok: true });
        }

        if (action === "report") {
          const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
          if (reason.length < 3) return json({ error: "Tell us briefly what's wrong." }, 400);
          const [recent] = await sql.query<{ n: number }>(
            `select count(*) as n from auto_reports where reporter_id = $1 and created_at > now() - interval '1 hour'`,
            [me],
          );
          if (Number(recent?.n) >= 10) return json({ error: "Too many reports. Try again later." }, 429);
          const exists = await sql.query<{ seller_id: string }>(`select seller_id from auto_listings where id = $1`, [id]);
          if (!exists.length) return json({ error: "Listing not found" }, 404);
          if (exists[0].seller_id === me) return json({ error: "You can't report your own listing." }, 400);
          await sql.query(
            `insert into auto_reports (listing_id, reporter_id, reason) values ($1,$2,$3)
             on conflict (listing_id, reporter_id) do update set reason = excluded.reason, created_at = now()`,
            [id, me, reason],
          );
          return json({ ok: true });
        }

        if (action === "admin_remove" || action === "admin_restore") {
          const admin = await getAdminAccess().catch(() => null);
          if (!admin) return json({ error: "Admins only." }, 403);
          const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : null;
          const rows = action === "admin_remove"
            ? await sql.query(`update auto_listings set status='removed', removed_reason=$2, updated_at=now() where id=$1 returning id`, [id, reason || "Removed by admin"])
            : await sql.query(`update auto_listings set status='active', removed_reason=null, updated_at=now() where id=$1 returning id`, [id]);
          if (!rows.length) return json({ error: "Listing not found" }, 404);
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
