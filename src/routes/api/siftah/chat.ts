import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getCreditBalance } from "@/lib/paypal.server";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Body = { action?: "status" | "chat" | "guest" | "media_access"; messages?: ChatMessage[]; persona?: "siftah" | "dexter" | "super-saiyan" };
type Stage = "super_saiyan" | "siftah" | "paid" | "admin";

const GUEST_COOKIE = "siftah_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30;
const SUPER_SAIYAN_MODEL = "huihui-ai/Huihui-Qwen3.5-27B-abliterated:featherless-ai";
const SIFTAH_MODELS = [
  "google/gemma-3-12b-it:deepinfra",
  "meta-llama/Llama-3.3-70B-Instruct:novita",
  "Qwen/Qwen3.5-9B:deepinfra",
] as const;
const FREE_SUPER_SAIYAN = 5;
const FREE_SIFTAH = 5;
const COOLDOWN_HOURS = 5;
/** Credits charged per paid message (both directions accounted as 2). */
const PAID_CREDIT_COST = 2;

type Usage = {
  super_saiyan_used: number;
  siftah_used: number;
  cooldown_until: string | null;
};

type Access = { userId: string; mode: "account" | "guest" };

export const Route = createFileRoute("/api/siftah/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        if (body.action === "guest") {
          try {
            const signedIn = await getSessionUser();
            if (signedIn) return json({ mode: "account" });
            const existingGuest = readGuestId(request);
            if (existingGuest) return json({ mode: "guest" });
            const guestId = randomUUID();
            const signature = signGuestId(guestId);
            return json(
              { mode: "guest" },
              200,
              { "Set-Cookie": `${GUEST_COOKIE}=${guestId}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${GUEST_MAX_AGE}` },
            );
          } catch {
            return json({ error: "Guest mode is temporarily unavailable. Please sign in instead." }, 503);
          }
        }

        let access: Access | null = null;
        try {
          const signedIn = await getSessionUser();
          if (signedIn) access = { userId: signedIn.id, mode: "account" };
          else {
            const guestId = readGuestId(request);
            if (guestId) access = { userId: `guest:${guestId}`, mode: "guest" };
          }
        } catch {
          access = null;
        }
        if (!access) {
          return json({ error: "Sign in or choose Guest mode to use Siftah.", code: "AUTH_REQUIRED" }, 401);
        }

        const { userId, mode } = access;
        const persona = body.persona === "dexter" || body.persona === "super-saiyan" ? body.persona : "siftah";
        const isPremiumPersona = persona === "super-saiyan";
        const isGuest = mode === "guest";
        const sql = await getSql();
        const [globalSettings] = await sql.query<{
          default_super_model: string; fallback_models: string[]; free_super_saiyan: number;
          free_siftah: number; cooldown_hours: number; guest_enabled: boolean;
        }>("select default_super_model, fallback_models, free_super_saiyan, free_siftah, cooldown_hours, guest_enabled from siftah_admin_settings where id = 1");
        const memberRows = isGuest ? [] : await sql.query<{
          enabled: boolean; model_override: string | null; free_super_saiyan: number | null;
          free_siftah: number | null; cooldown_hours: number | null;
        }>("select enabled, model_override, free_super_saiyan, free_siftah, cooldown_hours from siftah_user_settings where user_id = $1", [userId]);
        const memberSettings = memberRows[0];
        const adminRows = isGuest ? [] : await sql.query<{ verified: boolean }>(
          `select "emailVerified" as verified from "user"
            where id = $1 and lower(email) in ($2, $3) limit 1`,
          [userId, "gjphillips555@gmail.com", "webssite48@gmail.com"],
        );
        const isAdmin = adminRows[0]?.verified === true;
        if (isGuest && globalSettings?.guest_enabled === false) return json({ error: "Guest access is currently disabled. Please sign in." }, 403);
        if (!isGuest && !isAdmin && memberSettings?.enabled === false) return json({ error: "Siftah access has been disabled for this account. Contact support." }, 403);
        const freeSuper = isGuest ? globalSettings?.free_super_saiyan ?? FREE_SUPER_SAIYAN : 0;
        const freeSiftah = isGuest ? globalSettings?.free_siftah ?? FREE_SIFTAH : 0;
        const cooldownHours = isGuest ? COOLDOWN_HOURS : 0;
        const superModel = memberSettings?.model_override || globalSettings?.default_super_model || SUPER_SAIYAN_MODEL;
        const allowedModels = new Set<string>([...SIFTAH_MODELS, SUPER_SAIYAN_MODEL]);
        const configuredFallbacks = Array.isArray(globalSettings?.fallback_models)
          ? globalSettings.fallback_models.filter((model) => allowedModels.has(model))
          : [];
        const fallbackModels = configuredFallbacks.length ? configuredFallbacks : [...SIFTAH_MODELS];
        await sql.query(
          "insert into siftah_usage (user_id) values ($1) on conflict (user_id) do nothing",
          [userId],
        );
        await sql.query(
          `update siftah_usage
              set super_saiyan_used = 0,
                  siftah_used = 0,
                  cooldown_until = null,
                  updated_at = now()
            where user_id = $1 and cooldown_until is not null and cooldown_until <= now()`,
          [userId],
        );

        if (body.action === "status") {
          const [usage] = await sql.query<Usage>(
            "select super_saiyan_used, siftah_used, cooldown_until from siftah_usage where user_id = $1",
            [userId],
          );
          let userInfo = null;
          if (mode === "account") {
            const [userRow] = await sql.query<{ name: string; image: string | null; email: string }>(
              'select name, image, email from "user" where id = $1',
              [userId],
            );
            if (userRow) {
              userInfo = {
                name: userRow.name,
                email: userRow.email,
                image: userRow.image,
                role: isAdmin ? "admin" : "member",
              };
            }
          }
          return json({
            mode,
            isAdmin,
            user: userInfo,
            trialLimit: isGuest ? freeSuper + freeSiftah : 0,
            usage: { ...publicUsage(usage), creditsBalance: isGuest ? 0 : await getCreditBalance(userId) },
          });
        }

        if (body.action === "media_access") {
          if (isAdmin) return json({ ok: true, mode, isAdmin: true });
          if (isGuest) {
            const mediaTrialRows = await sql.query<Usage & { stage: "super_saiyan" | "siftah" }>(
              `update siftah_usage
                  set super_saiyan_used = case
                        when super_saiyan_used < $2 then super_saiyan_used + 1
                        else super_saiyan_used end,
                      siftah_used = case
                        when super_saiyan_used >= $2 and siftah_used < $3 then siftah_used + 1
                        else siftah_used end,
                      cooldown_until = case
                        when super_saiyan_used >= $2 and siftah_used = $3 - 1
                          then now() + ($4 || ' hours')::interval
                        else cooldown_until end,
                      updated_at = now()
                where user_id = $1
                  and (cooldown_until is null or cooldown_until <= now())
                  and (super_saiyan_used < $2 or siftah_used < $3)
              returning super_saiyan_used, siftah_used, cooldown_until,
                        case when super_saiyan_used <= $2 and siftah_used = 0 then 'super_saiyan' else 'siftah' end as stage`,
              [userId, freeSuper, freeSiftah, String(COOLDOWN_HOURS)],
            );
            if (!mediaTrialRows[0]) {
              const [usage] = await sql.query<Usage>(
                "select super_saiyan_used, siftah_used, cooldown_until from siftah_usage where user_id = $1",
                [userId],
              );
              return json({
                error: usage?.cooldown_until
                  ? "Your guest trial is cooling down. It resets after five hours."
                  : "Your guest trial has been used. It will reset after a five-hour cooldown.",
                code: "GUEST_TRIAL_LIMIT",
                mode,
                usage: publicUsage(usage),
              }, 429);
            }
            return json({
              ok: true,
              mode,
              isAdmin: false,
              usage: { ...publicUsage(mediaTrialRows[0]), creditsBalance: 0 },
            });
          }

          const mediaCreditRows = await sql.query<{ balance: number }>(
            `update siftah_credit_accounts
                set balance = balance - $2, updated_at = now()
              where user_id = $1 and balance >= $2
            returning balance`,
            [userId, PAID_CREDIT_COST],
          );
          if (!mediaCreditRows[0]) {
            return json({
              error: "This account needs 2 Credits for each image or video request. Add Credits through PayPal to continue.",
              code: "CREDITS_REQUIRED",
              mode,
              usage: { creditsBalance: await getCreditBalance(userId) },
            }, 429);
          }
          return json({
            ok: true,
            mode,
            isAdmin: false,
            usage: { creditsBalance: mediaCreditRows[0].balance },
          });
        }

        const messages = Array.isArray(body.messages)
          ? body.messages.slice(-12).filter((message) =>
              message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string",
            ).map((message) => ({ role: message.role, content: message.content.slice(0, 8000) }))
          : [];
        if (!messages.length || messages.at(-1)?.role !== "user") {
          return json({ error: "A user message is required." }, 400);
        }

        const reservedRows = isPremiumPersona || isAdmin ? [] : await sql.query<
          Usage & { stage: "super_saiyan" | "siftah" }
        >(
          `update siftah_usage
              set super_saiyan_used = case
                    when super_saiyan_used < $2 then super_saiyan_used + 1
                    else super_saiyan_used end,
                  siftah_used = case
                    when super_saiyan_used >= $2 and siftah_used < $3 then siftah_used + 1
                    else siftah_used end,
                  cooldown_until = case
                    when super_saiyan_used >= $2 and siftah_used = $3 - 1
                      then now() + ($4 || ' hours')::interval
                    else cooldown_until end,
                  updated_at = now()
            where user_id = $1
              and (cooldown_until is null or cooldown_until <= now())
              and (super_saiyan_used < $2 or siftah_used < $3)
          returning super_saiyan_used, siftah_used, cooldown_until,
                    case when super_saiyan_used <= $2 and siftah_used = 0 then 'super_saiyan' else 'siftah' end as stage`,
          [userId, freeSuper, freeSiftah, String(COOLDOWN_HOURS)],
        );
        const reserved = reservedRows[0];
        let stage: Stage | null = isAdmin ? "admin" : isPremiumPersona ? null : reserved?.stage ?? null;

        if ((!reserved || isPremiumPersona) && !isGuest && !isAdmin) {
          const creditRows = await sql.query<{ balance: number }>(
            `update siftah_credit_accounts
                set balance = balance - $2, updated_at = now()
              where user_id = $1 and balance >= $2
            returning balance`,
            [userId, PAID_CREDIT_COST],
          );
          if (!creditRows[0]) {
            const [usage] = await sql.query<Usage>(
              "select super_saiyan_used, siftah_used, cooldown_until from siftah_usage where user_id = $1",
              [userId],
            );
            return json({
              error: isGuest
                ? "Your guest trial has been used. It will reset after a five-hour cooldown."
                : "This account needs 2 Credits for each response. Add Credits through PayPal to continue.",
              code: isGuest ? "GUEST_TRIAL_LIMIT" : "CREDITS_REQUIRED",
              mode,
              usage: { ...publicUsage(usage), creditsBalance: isGuest ? 0 : await getCreditBalance(userId) },
            }, 429);
          }
          stage = "paid";
        }

        if (!stage) {
          const [usage] = await sql.query<Usage>(
            "select super_saiyan_used, siftah_used, cooldown_until from siftah_usage where user_id = $1",
            [userId],
          );
          return json({
            error: "Your guest trial has been used. It will reset after a five-hour cooldown.",
            code: "GUEST_TRIAL_LIMIT",
            mode,
            usage: publicUsage(usage),
          }, 429);
        }

        try {
          const system = persona === "dexter"
            ? "You are Dexter, the coding specialist inside Siftah from Looters Computas. Be precise, practical and concise. Prefer working code and clear steps."
            : persona === "super-saiyan"
              ? "You are Super Saiyan, the premium advanced model inside Siftah from Looters Computas. Give thorough, high-quality answers."
              : "You are Siftah, the general AI assistant from Looters Computas. Be helpful, direct and clear.";
          const modelQueue = stage === "super_saiyan" || stage === "admin" || isPremiumPersona
            ? [superModel, ...fallbackModels]
            : [...fallbackModels];
          let modelUsed = "";
          let lastError: unknown;
          let content = "";
          for (const candidate of modelQueue) {
            try {
              const response = await fetch("https://api.featherless.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${process.env.FEATHERLESS_API_KEY || process.env.OPENROUTER_API_KEY || ""}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://www.looterscomputas.online",
                  "X-Title": "Siftah Mobile",
                },
                body: JSON.stringify({
                  model: candidate,
                  messages: [{ role: "system", content: system }, ...messages],
                  temperature: 0.7,
                  max_tokens: 2048,
                }),
              });
              if (!response.ok) throw new Error(`Model ${candidate} failed: ${response.status}`);
              const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
              content = data.choices?.[0]?.message?.content || "";
              if (!content) throw new Error("Empty response");
              modelUsed = candidate;
              break;
            } catch (error) {
              lastError = error;
            }
          }
          if (!modelUsed) throw lastError ?? new Error("All Siftah models are currently busy.");

          return json({
            ok: true,
            content,
            model: modelUsed,
            mode,
            isAdmin,
            stage,
            usage: { ...publicUsage(reserved), creditsBalance: stage === "paid" ? (await getCreditBalance(userId)) : (isGuest ? 0 : await getCreditBalance(userId)) },
          });
        } catch (error) {
          console.error("Siftah chat error", error);
          return json({ error: "Siftah is temporarily unavailable. Please try again." }, 502);
        }
      },
    },
  },
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function publicUsage(usage: Usage | undefined) {
  return {
    superSaiyanUsed: usage?.super_saiyan_used ?? 0,
    siftahUsed: usage?.siftah_used ?? 0,
    cooldownUntil: usage?.cooldown_until ?? null,
  };
}

function readGuestId(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${GUEST_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [id, signature] = decodeURIComponent(match[1]).split(".");
  if (!id || !signature || !timingSafeEqual(Buffer.from(signature), Buffer.from(signGuestId(id)))) return null;
  return id;
}

function signGuestId(id: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.SIFTAH_GUEST_SECRET || "siftah-guest";
  return createHmac("sha256", secret).update(id).digest("base64url");
}
