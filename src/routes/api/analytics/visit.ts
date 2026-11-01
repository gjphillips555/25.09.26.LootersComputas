import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

export const Route = createFileRoute("/api/analytics/visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({})) as { path?: string };
          const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 180) : "/";
          const cookie = request.headers.get("cookie") || "";
          const current = cookie.split(";").map((v) => v.trim()).find((v) => v.startsWith("lc_visitor="))?.slice("lc_visitor=".length);
          const visitorId = current && /^[0-9a-f-]{36}$/i.test(current) ? current : randomUUID();
          const user = await getSessionUser().catch(() => null);
          const sql = await getSql();
          await sql.query("insert into site_visit_events (visitor_id,user_id,path) values ($1,$2,$3)", [visitorId, user?.id ?? null, path]);
          return new Response(JSON.stringify({ ok: true }), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              ...(current ? {} : { "Set-Cookie": `lc_visitor=${visitorId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure` }),
            },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false }), { status: 204 });
        }
      },
    },
  },
});
