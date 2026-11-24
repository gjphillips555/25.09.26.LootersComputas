import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { newId } from "@/lib/auto/server";
import { carjamEnabled, carjamLookupDetailed } from "@/lib/auto/carjam";
import { carjamPublicUrl, expiryError, normalizePlate, plateError, type RegoVehicle } from "@/lib/auto/rego";

// CarJam charges per call (~$0.21), so: cache results, cap paid calls per member / per guest IP / site-wide.
const FOUND_TTL_DAYS = 30;
const NOT_FOUND_TTL_DAYS = 3;
const MEMBER_PER_DAY = 10;
const GUEST_PER_DAY = 3;
const SITE_PER_DAY = 100;
const MAX_REMINDERS = 25;

/**
 * Rego Checker API.
 * GET  ?op=config     { enabled }
 * GET  ?op=reminders  signed-in: saved expiry reminders
 * POST {action: lookup, plate} | {action: save_reminder, plate, expiry, label?} | {action: delete_reminder, id}
 */
export const Route = createFileRoute("/api/auto/rego-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const op = new URL(request.url).searchParams.get("op") || "config";
        if (op === "config") return json({ enabled: carjamEnabled() });
        if (op === "reminders") {
          const session = await getSessionUser().catch(() => null);
          if (!session) return json({ error: "Sign in to see saved reminders.", code: "SIGN_IN_REQUIRED" }, 401);
          const sql = await getSql();
          const rows = await sql.query<{ id: string; plate: string; label: string | null; expiry: string | Date }>(
            `select id, plate, label, expiry from rego_reminders where user_id = $1 order by expiry asc limit ${MAX_REMINDERS}`,
            [session.id],
          );
          return json({ items: rows.map((r) => ({ ...r, expiry: dateStr(r.expiry) })) });
        }
        return json({ error: "Unknown op" }, 400);
      },
      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const action = String(body.action || "lookup");
        const sql = await getSql();

        if (action === "lookup") {
          const plate = normalizePlate(String(body.plate || ""));
          const err = plateError(plate);
          if (err) return json({ error: err, code: "BAD_PLATE" }, 400);
          const carjamUrl = carjamPublicUrl(plate);
          if (!carjamEnabled()) return json({ ok: true, plate, enabled: false, carjamUrl });

          const [cached] = await sql.query<{ found: boolean; vehicle: RegoVehicle | null; fetched_at: string | Date }>(
            `select found, vehicle, fetched_at from rego_vehicle_cache
              where plate = $1 and fetched_at > now() - (case when found then interval '${FOUND_TTL_DAYS} days' else interval '${NOT_FOUND_TTL_DAYS} days' end)`,
            [plate],
          );
          if (cached) {
            return json({ ok: true, plate, enabled: true, carjamUrl, found: cached.found, vehicle: cached.found ? cached.vehicle : null, cached: true, fetchedAt: new Date(cached.fetched_at).toISOString() });
          }

          const session = await getSessionUser().catch(() => null);
          const ipHash = hashIp(request);
          const [site] = await sql.query<{ n: number }>(`select count(*)::int as n from rego_lookup_log where created_at > now() - interval '24 hours'`);
          if (Number(site?.n) >= SITE_PER_DAY) return json({ error: "Vehicle lookups are busy today. Try again tomorrow, or open the plate on CarJam.", code: "SITE_LIMIT", carjamUrl }, 429);
          if (session) {
            const [u] = await sql.query<{ n: number }>(`select count(*)::int as n from rego_lookup_log where user_id = $1 and created_at > now() - interval '24 hours'`, [session.id]);
            if (Number(u?.n) >= MEMBER_PER_DAY) return json({ error: `You've used your ${MEMBER_PER_DAY} vehicle lookups for today.`, code: "USER_LIMIT", carjamUrl }, 429);
          } else {
            const [g] = await sql.query<{ n: number }>(`select count(*)::int as n from rego_lookup_log where user_id is null and ip_hash = $1 and created_at > now() - interval '24 hours'`, [ipHash]);
            if (Number(g?.n) >= GUEST_PER_DAY) return json({ error: `Guests get ${GUEST_PER_DAY} vehicle lookups a day. Sign in for more.`, code: "GUEST_LIMIT", carjamUrl }, 429);
          }
          await sql.query(`insert into rego_lookup_log (user_id, ip_hash, plate) values ($1, $2, $3)`, [session?.id ?? null, ipHash, plate]);

          const result = await carjamLookupDetailed(plate);
          if (result.status === "error") return json({ error: "The vehicle lookup didn't respond. Try again shortly.", code: "LOOKUP_ERROR", carjamUrl }, 502);
          const vehicle: RegoVehicle | null = result.status === "found"
            ? { make: result.vehicle.make, model: result.vehicle.model, year: result.vehicle.year, colour: result.vehicle.colour, body: result.vehicle.body, fuel: result.vehicle.fuel, cc: result.vehicle.cc }
            : null;
          await sql.query(
            `insert into rego_vehicle_cache (plate, found, vehicle, fetched_at) values ($1, $2, $3, now())
             on conflict (plate) do update set found = excluded.found, vehicle = excluded.vehicle, fetched_at = now()`,
            [plate, Boolean(vehicle), vehicle ? JSON.stringify(vehicle) : null],
          );
          return json({ ok: true, plate, enabled: true, carjamUrl, found: Boolean(vehicle), vehicle, cached: false, fetchedAt: new Date().toISOString() });
        }

        const session = await getSessionUser().catch(() => null);
        if (!session) return json({ error: "Sign in to save reminders.", code: "SIGN_IN_REQUIRED" }, 401);

        if (action === "save_reminder") {
          const plate = normalizePlate(String(body.plate || ""));
          const pErr = plateError(plate);
          if (pErr) return json({ error: pErr }, 400);
          const expiry = String(body.expiry || "");
          const eErr = expiryError(expiry);
          if (eErr) return json({ error: eErr }, 400);
          const label = String(body.label || "").trim().slice(0, 40) || null;
          const [c] = await sql.query<{ n: number }>(`select count(*)::int as n from rego_reminders where user_id = $1 and plate <> $2`, [session.id, plate]);
          if (Number(c?.n) >= MAX_REMINDERS) return json({ error: `You can save up to ${MAX_REMINDERS} reminders.` }, 400);
          const [row] = await sql.query<{ id: string }>(
            `insert into rego_reminders (id, user_id, plate, label, expiry) values ($1, $2, $3, $4, $5)
             on conflict (user_id, plate) do update set expiry = excluded.expiry, label = excluded.label
             returning id`,
            [newId("rr_"), session.id, plate, label, expiry],
          );
          return json({ ok: true, id: row?.id });
        }

        if (action === "delete_reminder") {
          await sql.query(`delete from rego_reminders where id = $1 and user_id = $2`, [String(body.id || ""), session.id]);
          return json({ ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});

function hashIp(request: Request): string {
  const ip =
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
  return createHash("sha256").update(`siftah-rego:${ip}`).digest("hex").slice(0, 32);
}

function dateStr(v: string | Date): string {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  return String(v).slice(0, 10);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
