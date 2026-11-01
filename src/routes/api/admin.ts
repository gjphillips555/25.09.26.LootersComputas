import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getAdminAccess, OWNER_EMAIL } from "@/lib/admin.server";

const ALLOWED_MODELS = [
  "huihui-ai/Huihui-Qwen3.5-27B-abliterated:featherless-ai",
  "google/gemma-3-12b-it:deepinfra",
  "meta-llama/Llama-3.3-70B-Instruct:novita",
  "Qwen/Qwen3.5-9B:deepinfra",
] as const;

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const admin = await getAdminAccess();
          if (!admin) return json({ error: "Admin access required." }, 403);
          const sql = await getSql();
          const [counts] = await sql.query(
            `select
              (select count(*)::int from "user") as members,
              (select count(*)::int from "user" where "createdAt" >= now() - interval '7 days') as new_members_7d,
              (select count(*)::int from "session" where "expiresAt" > now()) as active_sessions,
              (select count(*)::int from site_visit_events where created_at >= now() - interval '24 hours') as visits_24h,
              (select count(distinct visitor_id)::int from site_visit_events where created_at >= now() - interval '24 hours') as visitors_24h,
              (select count(*)::int from siftah_credit_accounts) as credit_accounts,
              (select coalesce(sum(balance),0)::int from siftah_credit_accounts) as credits_outstanding`,
          );
          const [settings] = await sql.query("select * from siftah_admin_settings where id = 1");
          const admins = await sql.query("select email, role, created_at from siftah_admins order by role, email");
          const members = await sql.query(
            `select u.id, u.name, u.email, u."emailVerified" as email_verified, u."createdAt" as joined_at,
                    (select max(s."createdAt") from "session" s where s."userId" = u.id) as last_seen,
                    coalesce(us.super_saiyan_used,0)::int as super_saiyan_used,
                    coalesce(us.siftah_used,0)::int as siftah_used,
                    us.cooldown_until,
                    coalesce(ca.balance,0)::int as siftah_credits,
                    coalesce(ust.enabled,true) as siftah_enabled,
                    ust.model_override, ust.free_super_saiyan, ust.free_siftah, ust.cooldown_hours,
                    coalesce(ust.features,'{}'::jsonb) as features,
                    exists(select 1 from profiles p where p.user_id = u.id and p.paypal_payer_id is not null) as paypal_connected
               from "user" u
               left join siftah_usage us on us.user_id = u.id
               left join siftah_credit_accounts ca on ca.user_id = u.id
               left join siftah_user_settings ust on ust.user_id = u.id
              order by u."createdAt" desc limit 200`,
          );
          const visits = await sql.query(
            `select path, count(*)::int as views
               from site_visit_events where created_at >= now() - interval '7 days'
              group by path order by views desc limit 12`,
          );
          return json({ admin, stats: counts, settings, admins, members, topPages: visits, models: ALLOWED_MODELS });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Could not load admin dashboard." }, 500);
        }
      },
      POST: async ({ request }) => {
        try {
          const origin = request.headers.get("origin");
          if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
          const admin = await getAdminAccess();
          if (!admin) return json({ error: "Admin access required." }, 403);
          const body = await request.json().catch(() => ({})) as Record<string, unknown>;
          const sql = await getSql();
          if (body.action === "add_admin" || body.action === "remove_admin") {
            if (admin.role !== "owner" || admin.email !== OWNER_EMAIL) return json({ error: "Only the owner can manage admin access." }, 403);
            const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
            if (email === OWNER_EMAIL && body.action === "remove_admin") return json({ error: "The owner account cannot be removed." }, 400);
            if (body.action === "add_admin") {
              await sql.query("insert into siftah_admins (email, role) values ($1, 'admin') on conflict (email) do nothing", [email]);
            } else {
              await sql.query("delete from siftah_admins where lower(email) = $1 and role <> 'owner'", [email]);
            }
            return json({ success: true });
          }
          if (body.action === "update_defaults") {
            const model = String(body.defaultSuperModel || "");
            const fallback = Array.isArray(body.fallbackModels) ? body.fallbackModels.filter((m): m is string => typeof m === "string" && ALLOWED_MODELS.includes(m as typeof ALLOWED_MODELS[number])) : [];
            const freeSuper = clampInt(body.freeSuperSaiyan, 0, 100);
            const freeSiftah = clampInt(body.freeSiftah, 0, 100);
            const cooldown = clampInt(body.cooldownHours, 0, 168);
            if (!ALLOWED_MODELS.includes(model as typeof ALLOWED_MODELS[number])) return json({ error: "Choose a supported model." }, 400);
            if (!fallback.length) return json({ error: "Select at least one fallback model." }, 400);
            await sql.query(
              `update siftah_admin_settings set default_super_model=$1, fallback_models=$2::jsonb,
                 free_super_saiyan=$3, free_siftah=$4, cooldown_hours=$5,
                 guest_enabled=$6, updated_at=now() where id=1`,
              [model, JSON.stringify(fallback), freeSuper, freeSiftah, cooldown, body.guestEnabled !== false],
            );
            return json({ success: true });
          }
          if (body.action === "update_member") {
            const userId = typeof body.userId === "string" ? body.userId : "";
            if (!userId) return json({ error: "Missing member id." }, 400);
            const enabled = body.enabled !== false;
            const model = body.modelOverride ? String(body.modelOverride) : null;
            if (model && !ALLOWED_MODELS.includes(model as typeof ALLOWED_MODELS[number])) return json({ error: "Unsupported model." }, 400);
            const freeSuper = body.freeSuperSaiyan == null ? null : clampInt(body.freeSuperSaiyan, 0, 100);
            const freeSiftah = body.freeSiftah == null ? null : clampInt(body.freeSiftah, 0, 100);
            const cooldown = body.cooldownHours == null ? null : clampInt(body.cooldownHours, 0, 168);
            const features = body.features && typeof body.features === "object" && !Array.isArray(body.features) ? JSON.stringify(body.features) : "{}";
            await sql.query(
              `insert into siftah_user_settings (user_id, enabled, model_override, free_super_saiyan, free_siftah, cooldown_hours, features, updated_at)
               values ($1,$2,$3,$4,$5,$6,$7::jsonb,now())
               on conflict (user_id) do update set enabled=excluded.enabled, model_override=excluded.model_override,
                 free_super_saiyan=excluded.free_super_saiyan, free_siftah=excluded.free_siftah,
                 cooldown_hours=excluded.cooldown_hours, features=excluded.features, updated_at=now()`,
              [userId, enabled, model, freeSuper, freeSiftah, cooldown, features],
            );
            return json({ success: true });
          }
          return json({ error: "Unknown admin action." }, 400);
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Admin action failed." }, 500);
        }
      },
    },
  },
});

function clampInt(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
