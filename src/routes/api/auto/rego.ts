import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { carjamEnabled, carjamLookup } from "@/lib/auto/carjam";

/** Optional CarJam rego autofill for the create-listing form (CARJAM_API_KEY gated, signed-in only). */
export const Route = createFileRoute("/api/auto/rego")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!carjamEnabled()) return json({ error: "Rego lookup isn't switched on yet.", code: "DISABLED" }, 503);
        const session = await getSessionUser().catch(() => null);
        if (!session) return json({ error: "Sign in to look up a rego.", code: "SIGN_IN_REQUIRED" }, 401);
        let plate = "";
        try {
          const body = (await request.json()) as { plate?: string };
          plate = String(body.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
        } catch {
          /* ignore */
        }
        if (!plate) return json({ error: "Enter a plate." }, 400);
        // Each CarJam lookup costs money: cap per user (10/day).
        const sql = await getSql();
        const [r] = await sql.query<{ n: number }>(
          `select count(*) as n from auto_rego_lookups where user_id = $1 and created_at > now() - interval '24 hours'`,
          [session.id],
        );
        if (Number(r?.n) >= 10) return json({ error: "Daily rego lookup limit reached." }, 429);
        await sql.query(`insert into auto_rego_lookups (user_id, plate) values ($1, $2)`, [session.id, plate]);
        const found = await carjamLookup(plate);
        if (!found) return json({ error: "No vehicle found for that plate." }, 404);
        return json({ ok: true, vehicle: found });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
