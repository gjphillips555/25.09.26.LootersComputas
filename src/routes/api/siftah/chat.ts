import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { requireUserId } from "@/lib/auth/verify.server";
import { getCreditBalance } from "@/lib/paypal.server";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type Body = {
  action?: "status" | "chat";
  messages?: ChatMessage[];
  token?: string;
  model?: string;
};

const SUPER_SAIYAN_MODELS = [
  "p-e-w/gemma-3-12b-it-heretic",
  "dphn/Dolphin3.0-Mistral-24B",
  "Sao10K/L3-8B-Stheno-v3.2",
] as const;
const DEFAULT_SUPER_SAIYAN_MODEL = SUPER_SAIYAN_MODELS[0];
const SIFTAH_MODELS = [
  "p-e-w/gemma-3-12b-it-heretic",
  "dphn/Dolphin3.0-Mistral-24B",
  "Sao10K/L3-8B-Stheno-v3.2",
  "huihui-ai/Huihui-Qwen3.5-27B-abliterated",
  "mlabonne/gemma-3-27b-it-abliterated",
] as const;
const FREE_SUPER_SAIYAN = 5;
const FREE_SIFTAH = 5;
const COOLDOWN_HOURS = 5;

type Usage = {
  super_saiyan_used: number;
  siftah_used: number;
  cooldown_until: string | null;
};

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

        let userId: string;
        try {
          userId = await requireUserId();
        } catch {
          return json({ error: "Please sign in to use Siftah.", code: "AUTH_REQUIRED" }, 401);
        }

        const sql = await getSql();
        await sql.query(
          `insert into siftah_usage (user_id) values ($1) on conflict (user_id) do nothing`,
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
            `select super_saiyan_used, siftah_used, cooldown_until
               from siftah_usage where user_id = $1`,
            [userId],
          );
          return json({ usage: { ...publicUsage(usage), creditsBalance: await getCreditBalance(userId) } });
        }

        const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
        if (!messages.length || !messages.some((m) => m.role === "user")) {
          return json({ error: "Missing chat messages" }, 400);
        }

        const tokenFromUser = typeof body.token === "string" ? body.token.trim() : "";
        const token = tokenFromUser ||
          (process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN || "").trim();
        if (!token) {
          return json({
            error: "Siftah's AI service is not connected yet. No free use has been consumed. Add the Hugging Face server token and try again.",
            code: "AI_NOT_CONFIGURED",
          }, 503);
        }

        // Reserve one reply atomically so simultaneous tabs cannot exceed the cap.
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
        if (!reserved) {
          const paidRows = await sql.query<{ balance: number }>(
            `update siftah_credit_accounts
                set balance = balance - 2, updated_at = now()
              where user_id = $1 and balance >= 2
            returning balance`,
            [userId],
          );
          paidCreditReserved = paidRows.length > 0;
          if (!paidCreditReserved) {
            const [usage] = await sql.query<Usage>(
              `select super_saiyan_used, siftah_used, cooldown_until
                 from siftah_usage where user_id = $1`,
              [userId],
            );
            return json({
              error: usage?.cooldown_until
                ? "You've used your free allowance and don't have enough Credits. Your free allowance refreshes when the 5-hour cooldown ends."
                : "Your free allowance is used up. Buy Credits to continue chatting.",
              code: "FREE_LIMIT",
              usage: { ...publicUsage(usage), creditsBalance: await getCreditBalance(userId) },
            }, 429);
          }
        }

        const stage = reserved?.stage ?? "paid";

        try {
          let reply = "";
          let modelUsed: string;
          if (stage === "super_saiyan") {
            const requested = typeof body.model === "string" ? body.model : "";
            const chosen = (SUPER_SAIYAN_MODELS as readonly string[]).includes(requested)
              ? requested
              : DEFAULT_SUPER_SAIYAN_MODEL;
            reply = await hfChat(chosen, messages, token);
            modelUsed = chosen;
          } else {
            const start = Math.max(0, reserved.siftah_used - 1) % SIFTAH_MODELS.length;
            let lastError: unknown;
            let successfulModel = "";
            for (let offset = 0; offset < SIFTAH_MODELS.length; offset += 1) {
              const candidate = SIFTAH_MODELS[(start + offset) % SIFTAH_MODELS.length];
              try {
                reply = await hfChat(candidate, messages, token);
                successfulModel = candidate;
                break;
              } catch (error) {
                lastError = error;
              }
            }
            if (!successfulModel) throw lastError ?? new Error("All five Siftah models are busy.");
            modelUsed = successfulModel;
          }

          return json({
            reply: reply!,
            stage,
            modelUsed,
            usage: { ...publicUsage(reserved), creditsBalance: await getCreditBalance(userId) },
            creditsCharged: stage === "paid" ? 2 : 0,
            failoverPool: stage === "siftah" || stage === "paid" ? 5 : 0,
          });
        } catch (error) {
          // Failed upstream calls do not consume a free reply or trigger cooldown.
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
            `select super_saiyan_used, siftah_used, cooldown_until
               from siftah_usage where user_id = $1`,
            [userId],
          );
          return json({ error: message, usage: { ...publicUsage(usage), creditsBalance: await getCreditBalance(userId) } }, 502);
        }
      },
    },
  },
});

function publicUsage(usage?: Usage) {
  return {
    superSaiyanUsed: Number(usage?.super_saiyan_used ?? 0),
    siftahUsed: Number(usage?.siftah_used ?? 0),
    cooldownUntil: usage?.cooldown_until ?? null,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function hfChat(model: string, messages: ChatMessage[], token: string) {
  const routerUrl = "https://router.huggingface.co/v1/chat/completions";
  const res = await fetch(routerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 8000),
      })),
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (res.ok) {
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (content) return content;
  }

  const prompt = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n") + "\nASSISTANT:";
  const fallback = await fetch(
    `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt.slice(0, 12000),
        parameters: { max_new_tokens: 400, temperature: 0.7, return_full_text: false },
      }),
    },
  );
  const raw = await fallback.text();
  if (!fallback.ok) {
    throw new Error(`Hugging Face ${fallback.status}: ${raw.slice(0, 240)}`);
  }
  try {
    const parsed = JSON.parse(raw) as
      | Array<{ generated_text?: string }>
      | { generated_text?: string };
    if (Array.isArray(parsed)) return parsed[0]?.generated_text || raw;
    if ("generated_text" in parsed) return parsed.generated_text || raw;
  } catch {
    // The inference endpoint can also return plain text.
  }
  return raw;
}
