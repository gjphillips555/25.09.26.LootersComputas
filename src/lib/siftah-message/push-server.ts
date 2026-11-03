/**
 * Server-side VAPID push for Siftah Message.
 * Payload must never include message text — only title + count-style body.
 *
 * Set on Vercel:
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT=mailto:gjphillips555@gmail.com
 */

// Default public key (pair generated for this project). Override with VAPID_PUBLIC_KEY.
export const DEFAULT_VAPID_PUBLIC_KEY =
  "BC-OaK00i2XZzXJzc9fBORQG70pm-0CnF3YK62BzxHlyTGQdIsMVtIBq5kWXpSrhTZUfZBWtrJZ_sHVmOgHzx74";

// Matching private key — only used if VAPID_PRIVATE_KEY env is unset (dev fallback).
// Production MUST set VAPID_PRIVATE_KEY on Vercel.
const DEFAULT_VAPID_PRIVATE_KEY = "ykJthF7Qa1bh8TP4h3XeJF7QJtuFEkde2NnTjBOgMto";

export function getVapidPublicKey(): string {
  return (process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY).trim();
}

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = getVapidPublicKey();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY).trim();
  const subject = (process.env.VAPID_SUBJECT || "mailto:gjphillips555@gmail.com").trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export type PushSubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function notifyUsersPrivate(
  sql: { query: (q: string, params?: unknown[]) => Promise<Record<string, unknown>[]> },
  userIds: string[],
  newCount = 1,
): Promise<void> {
  if (!userIds.length) return;
  const cfg = getVapidConfig();
  if (!cfg) return;

  let webpush: typeof import("web-push");
  try {
    webpush = await import("web-push");
  } catch {
    console.warn("[siftah-message] web-push not installed — skip push");
    return;
  }

  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);

  const body =
    newCount === 1 ? "New message received" : `${newCount} new messages received`;
  const payload = JSON.stringify({ title: "Siftah Message", body });

  for (const uid of userIds) {
    const rows = await sql.query(
      `select endpoint, p256dh, auth from sm_push_subs where user_id = $1`,
      [uid],
    );
    for (const row of rows) {
      const sub = {
        endpoint: String(row.endpoint),
        keys: { p256dh: String(row.p256dh), auth: String(row.auth) },
      };
      try {
        await webpush.sendNotification(sub, payload, { TTL: 60 * 60 });
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await sql.query(`delete from sm_push_subs where endpoint = $1`, [sub.endpoint]);
        }
      }
    }
  }
}
