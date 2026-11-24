import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getAdminAccess } from "@/lib/admin.server";
import {
  LOBBY,
  ROOM_TOPIC,
  cleanBody,
  displayName,
  dmInbox,
  dmMessages,
  dmTopic,
  isBanned,
  nudge,
  onlineUsers,
  rateLimited,
  realtimeConfig,
  roomMessages,
  safeImage,
  toMessage,
} from "@/lib/site-chat/server";

type Body = {
  action?: "sync" | "send" | "read" | "leave" | "admin_delete" | "admin_ban" | "admin_unban";
  roomAfter?: number;
  dmPeer?: string;
  dmAfter?: number;
  full?: boolean;
  to?: string | null;
  body?: string;
  peer?: string;
  lastId?: number;
  id?: number;
  userId?: string;
  reason?: string;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const str = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 200 ? v : "");

/**
 * Site-wide pop-up chat API: public room, presence, private 1:1 DMs.
 * Guests may read the room and see who's online; posting, DMs and presence need a signed-in account.
 * DM reads are restricted server-side to the two participants (see dmMessages()).
 */
export const Route = createFileRoute("/api/site-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const action = body.action ?? "sync";
        const sql = await getSql();
        const session = await getSessionUser().catch(() => null);
        const me = session?.id ?? null;

        if (action === "sync") {
          let profile: { id: string; name: string; image: string | null; isAdmin: boolean; banned: boolean } | null = null;
          if (me) {
            const banned = await isBanned(sql, me);
            if (!banned) {
              await sql.query(
                `insert into site_chat_presence (user_id, last_seen) values ($1, now())
                 on conflict (user_id) do update set last_seen = now()`,
                [me],
              );
            }
            if (body.full) {
              const [u] = await sql.query<{ name: string | null; email: string | null; image: string | null }>(
                `select name, email, image from "user" where id = $1`,
                [me],
              );
              const admin = await getAdminAccess().catch(() => null);
              profile = { id: me, name: displayName(u?.name, u?.email), image: safeImage(u?.image), isAdmin: Boolean(admin), banned };
            }
          }
          const dmPeer = me ? str(body.dmPeer) : "";
          const [room, online, inbox, dm] = await Promise.all([
            roomMessages(sql, num(body.roomAfter)),
            onlineUsers(sql),
            me ? dmInbox(sql, me) : Promise.resolve([]),
            dmPeer && me ? dmMessages(sql, me, dmPeer, num(body.dmAfter)) : Promise.resolve(undefined),
          ]);
          const rt = body.full ? realtimeConfig() : null;
          return json({
            signedIn: Boolean(me),
            me: profile,
            room,
            online,
            inbox,
            dm,
            realtime: rt ? { ...rt, roomTopic: ROOM_TOPIC, dmTopic: me ? dmTopic(me) : null } : undefined,
          });
        }

        if (!me) return json({ error: "Sign in with Google to chat.", code: "SIGN_IN_REQUIRED" }, 401);

        if (action === "leave") {
          await sql.query(`delete from site_chat_presence where user_id = $1`, [me]);
          return json({ ok: true });
        }

        if (action === "read") {
          const peer = str(body.peer);
          if (!peer) return json({ error: "Missing peer" }, 400);
          await sql.query(
            `insert into site_chat_reads (user_id, peer_id, last_read_id) values ($1, $2, $3)
             on conflict (user_id, peer_id) do update
               set last_read_id = greatest(site_chat_reads.last_read_id, excluded.last_read_id)`,
            [me, peer, num(body.lastId)],
          );
          return json({ ok: true });
        }

        if (action === "send") {
          if (await isBanned(sql, me)) return json({ error: "You've been blocked from chat by a site admin." }, 403);
          const text = cleanBody(body.body);
          if (!text) return json({ error: "Type a message first." }, 400);
          const to = body.to ? str(body.to) : "";
          if (to) {
            if (to === me) return json({ error: "You can't DM yourself." }, 400);
            const exists = await sql.query(`select 1 from "user" where id = $1`, [to]);
            if (!exists.length) return json({ error: "That member no longer exists." }, 404);
          }
          const limited = await rateLimited(sql, me);
          if (limited) return json({ error: limited, code: "RATE_LIMITED" }, 429);
          const [row] = await sql.query<{
            id: number; sender_id: string; recipient_id: string | null; body: string; created_at: string;
          }>(
            `insert into site_chat_messages (room, sender_id, recipient_id, body)
             values ($1, $2, $3, $4)
             returning id, sender_id, recipient_id, body, created_at`,
            [to ? "dm" : LOBBY, me, to || null, text],
          );
          const [u] = await sql.query<{ name: string | null; email: string | null; image: string | null }>(
            `select name, email, image from "user" where id = $1`,
            [me],
          );
          const message = toMessage({ ...row, name: u?.name ?? null, email: u?.email ?? null, image: u?.image ?? null });
          if (to) {
            await sql.query(
              `insert into site_chat_reads (user_id, peer_id, last_read_id) values ($1, $2, $3)
               on conflict (user_id, peer_id) do update set last_read_id = greatest(site_chat_reads.last_read_id, excluded.last_read_id)`,
              [me, to, message.id],
            );
            await nudge([{ topic: dmTopic(to), event: "dm" }, { topic: dmTopic(me), event: "dm" }]);
          } else {
            await nudge([{ topic: ROOM_TOPIC, event: "room" }]);
          }
          return json({ ok: true, message });
        }

        if (action === "admin_delete" || action === "admin_ban" || action === "admin_unban") {
          const admin = await getAdminAccess().catch(() => null);
          if (!admin) return json({ error: "Admins only." }, 403);
          if (action === "admin_delete") {
            const id = num(body.id);
            if (!id) return json({ error: "Missing message id" }, 400);
            await sql.query(
              `update site_chat_messages set deleted_at = now(), deleted_by = $2 where id = $1 and deleted_at is null`,
              [id, admin.userId],
            );
            await nudge([{ topic: ROOM_TOPIC, event: "room", payload: { deleted: id } }]);
            return json({ ok: true });
          }
          const userId = str(body.userId);
          if (!userId) return json({ error: "Missing user" }, 400);
          if (action === "admin_ban") {
            if (userId === admin.userId) return json({ error: "You can't ban yourself." }, 400);
            await sql.query(
              `insert into site_chat_bans (user_id, banned_by, reason) values ($1, $2, $3)
               on conflict (user_id) do update set banned_by = excluded.banned_by, reason = excluded.reason, created_at = now()`,
              [userId, admin.userId, cleanBody(body.reason).slice(0, 200) || null],
            );
            await sql.query(`delete from site_chat_presence where user_id = $1`, [userId]);
            // Hide the banned user's public room messages.
            await sql.query(
              `update site_chat_messages set deleted_at = now(), deleted_by = $2
                where sender_id = $1 and room = $3 and deleted_at is null`,
              [userId, admin.userId, LOBBY],
            );
            await nudge([{ topic: ROOM_TOPIC, event: "room" }]);
          } else {
            await sql.query(`delete from site_chat_bans where user_id = $1`, [userId]);
          }
          return json({ ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
