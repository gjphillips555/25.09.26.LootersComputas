import { createHmac } from "node:crypto";
import type { Sql } from "@/lib/db";
import { safeAvatar } from "@/lib/profile/shared";

/** Public room id. DMs use room = 'dm' with sender/recipient. */
export const LOBBY = "lobby";
export const MAX_LEN = 500;
export const HISTORY = 100;
/** A user counts as online if their tab pinged within this window. */
export const ONLINE_WINDOW_SECONDS = 45;

export type ChatUser = { id: string; name: string; image: string | null };
export type ChatMessage = {
  id: number;
  senderId: string;
  recipientId: string | null;
  body: string;
  createdAt: string;
  sender: ChatUser;
};

/**
 * Normalise user text: strip control characters (keep newlines/tabs), collapse runs of blank
 * lines, trim, cap length. Output is plain text — the client renders it as text (React escapes),
 * never as HTML.
 */
export function cleanBody(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_LEN);
}

export function displayName(name: string | null | undefined, email?: string | null): string {
  const n = (name || "").trim();
  if (n) return n.slice(0, 40);
  const local = (email || "").split("@")[0];
  return local ? local.slice(0, 20) : "Member";
}

/** Only http(s) avatar URLs are passed to the client. */
export function safeImage(url: string | null | undefined): string | null {
  return safeAvatar(url);
}

type Row = {
  id: number;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  created_at: string | Date;
  name: string | null;
  email: string | null;
  image: string | null;
};

export function toMessage(r: Row): ChatMessage {
  return {
    id: Number(r.id),
    senderId: r.sender_id,
    recipientId: r.recipient_id,
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    sender: { id: r.sender_id, name: displayName(r.name, r.email), image: safeImage(r.image) },
  };
}

const MSG_COLS = `m.id, m.sender_id, m.recipient_id, m.body, m.created_at, u.name, u.email, u.image`;

export async function roomMessages(sql: Sql, afterId = 0): Promise<ChatMessage[]> {
  const rows = afterId > 0
    ? await sql.query<Row>(
        `select ${MSG_COLS} from site_chat_messages m join "user" u on u.id = m.sender_id
          where m.room = $1 and m.deleted_at is null and m.id > $2
          order by m.id asc limit $3`,
        [LOBBY, afterId, HISTORY],
      )
    : (await sql.query<Row>(
        `select ${MSG_COLS} from site_chat_messages m join "user" u on u.id = m.sender_id
          where m.room = $1 and m.deleted_at is null
          order by m.id desc limit $2`,
        [LOBBY, HISTORY],
      )).reverse();
  return rows.map(toMessage);
}

/** DM thread between `me` and `peer` — the WHERE clause is the privacy boundary. */
export async function dmMessages(sql: Sql, me: string, peer: string, afterId = 0): Promise<ChatMessage[]> {
  const rows = (await sql.query<Row>(
    `select ${MSG_COLS} from site_chat_messages m join "user" u on u.id = m.sender_id
      where m.room = 'dm' and m.deleted_at is null and m.id > $3
        and ((m.sender_id = $1 and m.recipient_id = $2) or (m.sender_id = $2 and m.recipient_id = $1))
      order by m.id desc limit $4`,
    [me, peer, afterId, HISTORY],
  )).reverse();
  return rows.map(toMessage);
}

/** Recently seen users, excluding banned accounts. */
export async function onlineUsers(sql: Sql): Promise<ChatUser[]> {
  const rows = await sql.query<{ id: string; name: string | null; email: string | null; image: string | null }>(
    `select u.id, u.name, u.email, u.image
       from site_chat_presence p join "user" u on u.id = p.user_id
      where p.last_seen > now() - ($1 || ' seconds')::interval
        and not exists (select 1 from site_chat_bans b where b.user_id = p.user_id)
      order by p.last_seen desc limit 200`,
    [String(ONLINE_WINDOW_SECONDS)],
  );
  return rows.map((r) => ({ id: r.id, name: displayName(r.name, r.email), image: safeImage(r.image) }));
}

/** Unread DM counts per peer, plus the peer's profile (so the list can show people who aren't online). */
export async function dmInbox(sql: Sql, me: string) {
  const rows = await sql.query<{
    peer_id: string; unread: number; last_id: number; name: string | null; email: string | null; image: string | null;
  }>(
    `with x as (
       select m.id, m.recipient_id,
              case when m.sender_id = $1 then m.recipient_id else m.sender_id end as peer_id
         from site_chat_messages m
        where m.room = 'dm' and m.deleted_at is null and (m.sender_id = $1 or m.recipient_id = $1)
     ), pairs as (
       select x.peer_id, max(x.id) as last_id,
              count(*) filter (where x.recipient_id = $1 and x.id > coalesce(r.last_read_id, 0)) as unread
         from x left join site_chat_reads r on r.user_id = $1 and r.peer_id = x.peer_id
        group by x.peer_id
     )
     select p.peer_id, p.unread, p.last_id, u.name, u.email, u.image
       from pairs p join "user" u on u.id = p.peer_id
      order by p.last_id desc limit 50`,
    [me],
  );
  return rows.map((r) => ({
    peer: { id: r.peer_id, name: displayName(r.name, r.email), image: safeImage(r.image) },
    unread: Number(r.unread) || 0,
    lastId: Number(r.last_id) || 0,
  }));
}

/**
 * Sliding-window rate limit using the messages table itself:
 * at most 5 messages per 10 s and 30 per minute, across room + DMs.
 */
export async function rateLimited(sql: Sql, userId: string): Promise<string | null> {
  const [row] = await sql.query<{ ten: number; minute: number }>(
    `select count(*) filter (where created_at > now() - interval '10 seconds') as ten,
            count(*) filter (where created_at > now() - interval '60 seconds') as minute
       from site_chat_messages where sender_id = $1 and created_at > now() - interval '60 seconds'`,
    [userId],
  );
  if (Number(row?.ten) >= 5) return "You're sending messages too fast. Wait a few seconds.";
  if (Number(row?.minute) >= 30) return "Message limit reached. Try again in a minute.";
  return null;
}

export async function isBanned(sql: Sql, userId: string): Promise<boolean> {
  const rows = await sql.query(`select 1 from site_chat_bans where user_id = $1`, [userId]);
  return rows.length > 0;
}

/** Private realtime topic for a user's DM nudges (unguessable without the server secret). */
export function dmTopic(userId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.SIFTAH_GUEST_SECRET || "site-chat";
  return "site-chat-dm-" + createHmac("sha256", secret).update("dm:" + userId).digest("base64url").slice(0, 24);
}
export const ROOM_TOPIC = "site-chat-room";

/** Supabase Realtime config for the browser (public URL + anon key only). */
export function realtimeConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  if (!/^https:\/\//.test(url) || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

/**
 * Server-authored "something changed" nudges over Supabase Realtime Broadcast. Payloads carry no
 * message content — clients re-fetch from this API, which enforces auth — so a forged nudge can
 * only cause a harmless refresh. Failures are ignored (clients also poll).
 */
export async function nudge(messages: Array<{ topic: string; event: string; payload?: Record<string, unknown> }>) {
  const cfg = realtimeConfig();
  if (!cfg) return;
  const serverKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || cfg.key).trim();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    await fetch(`${cfg.url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serverKey, Authorization: `Bearer ${serverKey}` },
      body: JSON.stringify({ messages: messages.map((m) => ({ ...m, payload: m.payload ?? {} })) }),
      signal: ctrl.signal,
    }).catch(() => undefined);
    clearTimeout(t);
  } catch {
    /* best effort */
  }
}
