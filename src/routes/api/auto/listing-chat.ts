import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";
import { getAdminAccess } from "@/lib/admin.server";
import { cleanBody, displayName, isBanned, nudge, realtimeConfig, safeImage } from "@/lib/site-chat/server";
import { LISTING_CHAT_TTL_HOURS } from "@/lib/auto/shared";

const TTL = `interval '${LISTING_CHAT_TTL_HOURS} hours'`;
const HISTORY = 150;
const AUTO_HIDE_REPORTS = 3;

const listingTopic = (id: string) => `auto-listing-chat-${id}`;

type Row = { id: number; sender_id: string; body: string; created_at: string | Date; name: string | null; email: string | null; image: string | null };

/** Delete expired messages (every read/write runs this; queries also filter by created_at). */
async function purge(sql: Awaited<ReturnType<typeof getSql>>) {
  await sql.query(`delete from auto_listing_chat where created_at < now() - ${TTL}`).catch(() => undefined);
}

/**
 * Per-listing public live chat. Anyone can read; signed-in members post. Messages vanish after 2 hours.
 * GET  ?id=<listing>&after=<msgId>
 * POST {action: send, id, body} | {action: delete, messageId} | {action: report, messageId}
 */
export const Route = createFileRoute("/api/auto/listing-chat")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = (url.searchParams.get("id") || "").slice(0, 40);
        const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
        const sql = await getSql();
        const [listing] = await sql.query<{ seller_id: string; status: string; contact_chat: boolean }>(
          `select seller_id, status, contact_chat from auto_listings where id = $1`,
          [id],
        );
        if (!listing || listing.status === "removed") return json({ error: "Listing not found" }, 404);
        await purge(sql);
        const session = await getSessionUser().catch(() => null);
        const admin = session ? await getAdminAccess().catch(() => null) : null;
        const rows = (await sql.query<Row>(
          `select m.id, m.sender_id, m.body, m.created_at, u.name, u.email, u.image
             from auto_listing_chat m join "user" u on u.id = m.sender_id
            where m.listing_id = $1 and m.id > $2 and m.created_at > now() - ${TTL}
            order by m.id desc limit ${HISTORY}`,
          [id, after],
        )).reverse();
        const rt = realtimeConfig();
        return json({
          enabled: listing.contact_chat !== false,
          open: listing.status === "active" && listing.contact_chat !== false,
          sellerId: listing.seller_id,
          ttlHours: LISTING_CHAT_TTL_HOURS,
          viewer: { id: session?.id ?? null, isAdmin: Boolean(admin), isSeller: session?.id === listing.seller_id },
          messages: rows.map((r) => ({
            id: Number(r.id),
            senderId: r.sender_id,
            body: r.body,
            createdAt: new Date(r.created_at).toISOString(),
            sender: { id: r.sender_id, name: displayName(r.name, r.email), image: safeImage(r.image) },
          })),
          realtime: rt ? { url: rt.url, key: rt.key, topic: listingTopic(id) } : null,
        });
      },

      POST: async ({ request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Bad request" }, 400);
        }
        const session = await getSessionUser().catch(() => null);
        if (!session) return json({ error: "Sign in to chat about this vehicle.", code: "SIGN_IN_REQUIRED" }, 401);
        const me = session.id;
        const sql = await getSql();
        const action = String(body.action || "send");
        await purge(sql);

        if (action === "send") {
          const id = String(body.id || "").slice(0, 40);
          const [listing] = await sql.query<{ status: string; contact_chat: boolean }>(`select status, contact_chat from auto_listings where id = $1`, [id]);
          if (!listing || listing.status !== "active" || listing.contact_chat === false) return json({ error: "Chat is closed for this listing." }, 403);
          if (await isBanned(sql, me)) return json({ error: "Your account has been blocked from chat by a site admin." }, 403);
          const text = cleanBody(body.body);
          if (!text) return json({ error: "Type a message." }, 400);
          const [r] = await sql.query<{ ten: number; win: number }>(
            `select count(*) filter (where created_at > now() - interval '10 seconds')::int as ten,
                    count(*) filter (where created_at > now() - interval '10 minutes')::int as win
               from auto_listing_chat where sender_id = $1 and created_at > now() - interval '10 minutes'`,
            [me],
          );
          if (Number(r?.ten) >= 3) return json({ error: "You're sending messages too fast. Wait a few seconds." }, 429);
          if (Number(r?.win) >= 30) return json({ error: "Message limit reached. Try again in a few minutes." }, 429);
          const [row] = await sql.query<{ id: number }>(
            `insert into auto_listing_chat (listing_id, sender_id, body) values ($1, $2, $3) returning id`,
            [id, me, text],
          );
          await nudge([{ topic: listingTopic(id), event: "msg", payload: { id: Number(row.id) } }]);
          return json({ ok: true, id: Number(row.id) });
        }

        const messageId = Math.max(0, Number(body.messageId) || 0);
        const [msg] = await sql.query<{ listing_id: string; sender_id: string; seller_id: string }>(
          `select m.listing_id, m.sender_id, l.seller_id from auto_listing_chat m join auto_listings l on l.id = m.listing_id where m.id = $1`,
          [messageId],
        );
        if (!msg) return json({ error: "Message not found (it may have expired)." }, 404);

        if (action === "delete") {
          const admin = await getAdminAccess().catch(() => null);
          if (msg.sender_id !== me && msg.seller_id !== me && !admin) return json({ error: "Only the sender, the seller or an admin can delete this." }, 403);
          await sql.query(`delete from auto_listing_chat where id = $1`, [messageId]);
          await nudge([{ topic: listingTopic(msg.listing_id), event: "del", payload: { id: messageId } }]);
          return json({ ok: true });
        }

        if (action === "report") {
          if (msg.sender_id === me) return json({ error: "You can't report your own message." }, 400);
          await sql.query(`insert into auto_listing_chat_reports (message_id, reporter_id) values ($1, $2) on conflict do nothing`, [messageId, me]);
          const [c] = await sql.query<{ n: number }>(`select count(*)::int as n from auto_listing_chat_reports where message_id = $1`, [messageId]);
          if (Number(c?.n) >= AUTO_HIDE_REPORTS) {
            await sql.query(`delete from auto_listing_chat where id = $1`, [messageId]);
            await nudge([{ topic: listingTopic(msg.listing_id), event: "del", payload: { id: messageId } }]);
          }
          return json({ ok: true });
        }

        return json({ error: "Unknown action" }, 400);
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
