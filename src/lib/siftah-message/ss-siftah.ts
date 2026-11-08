import { encryptBody, newId } from "@/lib/siftah-message/crypto";
import { getCreditBalance } from "@/lib/paypal.server";

export const SS_SIFTAH_ID = "ss-siftah";
export const SS_SIFTAH_USERNAME = "SS Siftah";
export const SS_SIFTAH_NAME = "SS Siftah";
const PAID_CREDIT_COST = 2;
const FREE_SS_SIFTAH = 5;
const SS_SIFTAH_COOLDOWN_HOURS = 5;
const PUBLIC_ID = "siftah-public";

export async function seedSsSiftah(sql: any) {
  await sql.query(
    `insert into "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
     values ($1, $2, $3, true, $4, now(), now())
     on conflict (id) do update set name = excluded.name, "updatedAt" = now()`,
    [SS_SIFTAH_ID, SS_SIFTAH_NAME, "ss-siftah@looterscomputas.online", "/siftah-mobile-logo.svg"],
  );
  await sql.query(
    `insert into profiles (user_id, display_name, username, avatar_url, bio, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (user_id) do update set display_name = excluded.display_name, username = excluded.username,
       avatar_url = excluded.avatar_url, bio = excluded.bio, updated_at = now()`,
    [SS_SIFTAH_ID, SS_SIFTAH_NAME, SS_SIFTAH_USERNAME, "/siftah-mobile-logo.svg",
     "Siftah Mobile AI — same trial & credit rules as /siftah/"],
  );
  await sql.query(`create table if not exists sm_ss_siftah_usage (
    user_id text primary key, free_used int not null default 0,
    cooldown_until timestamptz, updated_at timestamptz not null default now())`);
}

export async function ensureSsSiftahContact(sql: any, userId: string) {
  if (userId === SS_SIFTAH_ID) return null;
  const existing = await sql.query(
    `select c.id from sm_conversations c
       join sm_members a on a.conversation_id = c.id and a.user_id = $1
       join sm_members b on b.conversation_id = c.id and b.user_id = $2
      where c.kind = 'direct' and (select count(*) from sm_members m where m.conversation_id = c.id) = 2 limit 1`,
    [userId, SS_SIFTAH_ID],
  );
  if (existing[0]) return String(existing[0].id);
  const id = newId("dm");
  await sql.query(`insert into sm_conversations (id, kind, title, created_by) values ($1,'direct',$2,$3)`, [id, SS_SIFTAH_USERNAME, SS_SIFTAH_ID]);
  await sql.query(`insert into sm_members (conversation_id, user_id) values ($1,$2),($1,$3)`, [id, userId, SS_SIFTAH_ID]);
  const welcome = encryptBody(
    "Kia ora — I'm SS Siftah, the Siftah Mobile AI. Ask me anything.\n\nSame rules as Siftah Mobile: short free trial, then credits. Full workspace at /siftah/.",
  );
  await sql.query(
    `insert into sm_messages (id, conversation_id, sender_id, body_enc, msg_type, expires_at)
     values ($1,$2,$3,$4,'text', now() + interval '24 hours')`,
    [newId("msg"), id, SS_SIFTAH_ID, welcome],
  );
  return id;
}

export async function isSsSiftahConversation(sql: any, convId: string) {
  if (!convId || convId === PUBLIC_ID) return false;
  const rows = await sql.query(`select 1 from sm_members where conversation_id = $1 and user_id = $2 limit 1`, [convId, SS_SIFTAH_ID]);
  return rows.length > 0;
}

export async function replyAsSsSiftah(sql: any, convId: string, userId: string, userText: string) {
  const usageRows = await sql.query(
    `insert into sm_ss_siftah_usage (user_id, free_used, updated_at) values ($1, 0, now())
     on conflict (user_id) do update set updated_at = sm_ss_siftah_usage.updated_at
     returning free_used, cooldown_until`,
    [userId],
  );
  let freeUsed = Number(usageRows[0]?.free_used ?? 0);
  const cooldownUntil = usageRows[0]?.cooldown_until ? new Date(String(usageRows[0].cooldown_until)) : null;
  if (cooldownUntil && cooldownUntil > new Date()) {
    return {
      ok: false as const,
      error: "Your SS Siftah trial is cooling down. It resets after five hours, or buy credits on /siftah/credits.",
      code: "TRIAL_COOLDOWN",
      creditsBalance: await getCreditBalance(userId),
    };
  }
  if (cooldownUntil && cooldownUntil <= new Date() && freeUsed >= FREE_SS_SIFTAH) {
    await sql.query(`update sm_ss_siftah_usage set free_used = 0, cooldown_until = null, updated_at = now() where user_id = $1`, [userId]);
    freeUsed = 0;
  }

  let stage: "free" | "paid" = "free";
  if (freeUsed < FREE_SS_SIFTAH) {
    const next = freeUsed + 1;
    await sql.query(
      `update sm_ss_siftah_usage set free_used = $2,
         cooldown_until = case when $2 >= $3 then now() + ($4 || ' hours')::interval else cooldown_until end,
         updated_at = now() where user_id = $1`,
      [userId, next, FREE_SS_SIFTAH, String(SS_SIFTAH_COOLDOWN_HOURS)],
    );
    stage = "free";
  } else {
    const creditRows = await sql.query(
      `update siftah_credit_accounts set balance = balance - $2, updated_at = now()
        where user_id = $1 and balance >= $2 returning balance`,
      [userId, PAID_CREDIT_COST],
    );
    if (!creditRows[0]) {
      return {
        ok: false as const,
        error: "Free SS Siftah trial used. Buy credits on /siftah/credits to keep chatting.",
        code: "CREDITS_REQUIRED",
        creditsBalance: await getCreditBalance(userId),
      };
    }
    stage = "paid";
  }

  const system =
    "You are SS Siftah, the Siftah Mobile AI assistant inside Siftah Message on Looters Computas (NZ). " +
    "Be helpful, direct and clear. Keep replies concise for chat unless the user asks for detail.";
  const models = [
    "huihui-ai/Huihui-Qwen3.5-27B-abliterated:featherless-ai",
    "google/gemma-3-12b-it:deepinfra",
    "meta-llama/Llama-3.3-70B-Instruct:novita",
    "Qwen/Qwen3.5-9B:deepinfra",
  ];
  let content = "";
  let lastError: unknown;
  for (const candidate of models) {
    try {
      const response = await fetch("https://api.featherless.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY || process.env.OPENROUTER_API_KEY || ""}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://www.looterscomputas.online",
          "X-Title": "SS Siftah Message",
        },
        body: JSON.stringify({
          model: candidate,
          messages: [{ role: "system", content: system }, { role: "user", content: userText.slice(0, 8000) }],
          temperature: 0.7,
          max_tokens: 1200,
        }),
      });
      if (!response.ok) throw new Error(`Model ${candidate} failed: ${response.status}`);
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      content = data.choices?.[0]?.message?.content || "";
      if (!content) throw new Error("Empty response");
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!content) {
    console.error("SS Siftah reply failed", lastError);
    content = "Sorry — I'm briefly offline. Try again in a moment, or open Siftah Mobile at /siftah/.";
  }

  const msgId = newId("msg");
  await sql.query(
    `insert into sm_messages (id, conversation_id, sender_id, body_enc, msg_type, expires_at)
     values ($1,$2,$3,$4,'text', now() + interval '6 hours')`,
    [msgId, convId, SS_SIFTAH_ID, encryptBody(content)],
  );
  await sql.query(`update sm_conversations set updated_at = now() where id = $1`, [convId]);
  return {
    ok: true as const,
    messageId: msgId,
    creditsBalance: await getCreditBalance(userId),
    freeRemaining: Math.max(0, FREE_SS_SIFTAH - (stage === "free" ? freeUsed + 1 : freeUsed)),
  };
}
