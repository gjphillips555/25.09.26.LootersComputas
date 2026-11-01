import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getCreditBalance } from "@/lib/paypal.server";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Body = { action?: "status" | "chat" | "guest"; messages?: ChatMessage[] };

const GUEST_COOKIE = "siftah_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30;
const SUPER_SAIYAN_MODEL = "huihui-ai/Qwen2.5-7B-Instruct-abliterated-v3:featherless-ai";
const SIFTAH_MODELS = [
  "google/gemma-3-12b-it:deepinfra",
  "meta-llama/Llama-3.3-70B-Instruct:novita",
  "Qwen/Qwen3.5-9B:deepinfra",
] as const;
const FREE_SUPER_SAIYAN = 5;
const FREE_SIFTAH = 5;
const COOLDOWN_HOURS = 5;

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
        const isGuest = mode === "guest";
        const sql = await getSql();
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
          return json({
            mode,
            usage: { ...publicUsage(usage), creditsBalance: isGuest ? 0 : await getCreditBalance(userId) },
          });
        }

        const messages = Array.isArray(body.messages)
          ? body.messages.slice(-12).filter((message) =>
              message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string",
            ).map((message) => ({ role: message.role, content: message.content.slice(0, 8000) }))
          : [];
        if (!messages.length || !messages.some((message) => message.role === "user")) {
          return json({ error: "Add a message before sending." }, 400);
        }

        const token = (process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN || "").trim();
        if (!token) {
          return json({
            error: "Siftah's Hugging Face service is not connected yet. No free use has been consumed.",
            code: "AI_NOT_CONFIGURED",
          }, 503);
        }

        const [reserved] = await sql.query<Usage & { stage: "super_saiyan" | "siftah" }>(
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
                    case when siftah_used > 0 then 'siftah' else 'super_saiyan' end as stage`,
          [userId, FREE_SUPER_SAIYAN, FREE_SIFTAH, String(COOLDOWN_HOURS)],
        );

        let paidCreditReserved = false;
        if (!reserved && !isGuest) {
          const paidRows = await sql.query<{ balance: number }>(
            `update siftah_credit_accounts
                set balance = balance - 2, updated_at = now()
              where user_id = $1 and balance >= 2
            returning balance`,
            [userId],
          );
          paidCreditReserved = paidRows.length > 0;
        }
        if (!reserved && !paidCreditReserved) {
          const [usage] = await sql.query<Usage>(
            "select super_saiyan_used, siftah_used, cooldown_until from siftah_usage where user_id = $1",
            [userId],
          );
          const creditsBalance = isGuest ? 0 : await getCreditBalance(userId);
          return json({
            error: usage?.cooldown_until
              ? isGuest
                ? "Your guest free allowance is used up. Sign in to continue with purchased Credits, or come back when the five-hour cooldown ends."
                : "You've used your free allowance and don't have enough Credits. Your free allowance refreshes when the five-hour cooldown ends."
              : "Your free allowance is used up. Sign in and buy Credits to continue chatting.",
            code: "FREE_LIMIT",
            mode,
            usage: { ...publicUsage(usage), creditsBalance },
          }, 429);
        }

        const stage = reserved?.stage ?? "paid";
        try {
          let reply = "";
          let modelUsed = "";
          if (stage === "super_saiyan") {
            reply = await hfChat(SUPER_SAIYAN_MODEL, messages, token);
            modelUsed = SUPER_SAIYAN_MODEL;
          } else {
            const start = Math.max(0, (reserved?.siftah_used ?? 1) - 1) % SIFTAH_MODELS.length;
            let lastError: unknown;
            for (let offset = 0; offset < SIFTAH_MODELS.length; offset += 1) {
              const candidate = SIFTAH_MODELS[(start + offset) % SIFTAH_MODELS.length];
              try {
                reply = await hfChat(candidate, messages, token);
                modelUsed = candidate;
                break;
              } catch (error) {
                lastError = error;
              }
            }
            if (!modelUsed) throw lastError ?? new Error("All Siftah models are currently busy.");
          }

          return json({
            reply,
            stage,
            mode,
            modelUsed,
            usage: {
              ...publicUsage(reserved),
              creditsBalance: isGuest ? 0 : await getCreditBalance(userId),
            },
            creditsCharged: stage === "paid" ? 2 : 0,
            failoverPool: stage === "siftah" || stage === "paid" ? SIFTAH_MODELS.length : 0,
          });
        } catch (error) {
          if (stage === "paid") {
            await sql.query(
              "update siftah_credit_accounts set balance = balance + 2, updated_at = now() where user_id = $1",
              [userId],
            );
          } else {
            await sql.query(
              `update siftah_usage
                  set super_saiyan_used = greatest(0, super_saiyan_used - case when $2 = 'super_saiyan' then 1 else 0 end),
                      siftah_used = greatest(0, siftah_used - case when $2 = 'siftah' then 1 else 0 end),
                      cooldown_until = case when $2 = 'siftah' and siftah_used = $3 then null else cooldown_until end,
                      updated_at = now()
                where user_id = $1`,
              [userId, stage, FREE_SIFTAH],
            );
          }
          const message = error instanceof Error ? error.message : "Upstream model error";
          const [usage] = await sql.query<Usage>(
            "select super_saiyan_used, siftah_used, cooldown_until from siftah_usage where user_id = $1",
            [userId],
          );
          return json({
            error: message,
            mode,
            usage: { ...publicUsage(usage), creditsBalance: isGuest ? 0 : await getCreditBalance(userId) },
          }, 502);
        }
      },
    },
  },
});

function guestSecret() {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("A stable auth secret is required for guest sessions.");
  return secret;
}

function signGuestId(id: string) {
  return createHmac("sha256", guestSecret()).update(id).digest("hex");
}

function readGuestId(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const raw = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${GUEST_COOKIE}=`))?.slice(GUEST_COOKIE.length + 1);
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  if (!id || !signature || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const expected = Buffer.from(signGuestId(id), "hex");
    const supplied = Buffer.from(signature, "hex");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    return id;
  } catch {
    return null;
  }
}

function publicUsage(usage?: Usage) {
  return {
    superSaiyanUsed: Number(usage?.super_saiyan_used ?? 0),
    siftahUsed: Number(usage?.siftah_used ?? 0),
    cooldownUntil: usage?.cooldown_until ?? null,
  };
}

function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function hfChat(model: string, messages: ChatMessage[], token: string) {
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a helpful, capable assistant. Be clear, practical, and honest. Follow applicable safety and legal boundaries." },
        ...messages,
      ],
      max_tokens: 1200,
      temperature: 0.7,
    }),
  });
  const data = await response.json().catch(() => ({})) as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    error?: string | { message?: string };
    message?: string;
  };
  if (!response.ok) {
    const detail = typeof data.error === "string" ? data.error : data.error?.message || data.message;
    throw new Error(detail || `Hugging Face inference failed (${response.status}).`);
  }
  const content = data.choices?.[0]?.message?.content;
  const reply = typeof content === "string"
    ? content
    : Array.isArray(content) ? content.map((part) => part.text || "").join("") : "";
  if (!reply.trim()) throw new Error("The model returned an empty response.");
  return reply;
}
