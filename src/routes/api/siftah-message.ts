import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { decryptBody, encryptBody, newId } from "@/lib/siftah-message/crypto";
import { notifyUsersPrivate } from "@/lib/siftah-message/push-server";

const PUBLIC_ID = "siftah-public";
const MAX_TEXT = 4000;
const MAX_MEDIA_CHARS = 900_000;
const DEFAULT_TTL_HOURS = 6;

async function requireUser(request: Request): Promise<{ id: string; name: string | null; email: string | null } | null> {
  try {
    const { auth } = await import("@/lib/auth/server");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return null;
    return { id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? null };
  } catch {
    return null;
  }
}

async function ensureSchema(sql: Awaited<ReturnType<typeof getSql>>) {
  try {
    await sql.query(`alter table profiles add column if not exists username text`);
    await sql.query(`alter table profiles add column if not exists shout_color text default '#ff9a00'`);
  } catch { /* ok */ }
  await sql.query(`create table if not exists sm_conversations (
    id text primary key, kind text not null default 'direct', title text, created_by text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
  await sql.query(`create table if not exists sm_members (
    conversation_id text not null references sm_conversations(id) on delete cascade,
    user_id text not null, joined_at timestamptz not null default now(), last_read_at timestamptz,
    primary key (conversation_id, user_id))`);
  await sql.query(`create table if not exists sm_messages (
    id text primary key, conversation_id text not null references sm_conversations(id) on delete cascade,
    sender_id text not null, body_enc text not null, msg_type text not null default 'text',
    media_url text, shout_color text, expires_at timestamptz, created_at timestamptz not null default now(),
    delete_after_view boolean default false, viewed_at timestamptz)`);
  await sql.query(`alter table sm_messages add column if not exists delete_after_view boolean default false`);
  await sql.query(`alter table sm_messages add column if not exists viewed_at timestamptz`);
  await sql.query(`insert into sm_conversations (id, kind, title) values ($1, 'public', 'Siftah Open Chat') on conflict (id) do nothing`, [PUBLIC_ID]);
  await sql.query(`create table if not exists sm_push_subs (
    endpoint text primary key,
    user_id text not null,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
  )`);
  await sql.query(`create index if not exists sm_push_subs_user_idx on sm_push_subs(user_id)`);
  await sql.query(`delete from sm_messages where expires_at is not null and expires_at < now()`);
}

async function ensureMember(sql: Awaited<ReturnType<typeof getSql>>, convId: string, userId: string) {
  await sql.query(`insert into sm_members (conversation_id, user_id) values ($1,$2) on conflict do nothing`, [convId, userId]);
}

async function isMember(sql: Awaited<ReturnType<typeof getSql>>, convId: string, userId: string) {
  if (convId === PUBLIC_ID) return true;
  const rows = await sql.query(`select 1 from sm_members where conversation_id = $1 and user_id = $2 limit 1`, [convId, userId]);
  return rows.length > 0;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/siftah-message")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return json({ error: "Sign in required." }, 401);
        const sql = await getSql();
        await ensureSchema(sql);
        await ensureMember(sql, PUBLIC_ID, user.id);
        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "inbox";

        if (action === "me") {
          const rows = await sql.query(
            `select u.id as user_id, u.name as auth_name, u.email, u.image as auth_image,
                    p.username, p.display_name, p.avatar_url, p.shout_color, p.bio, p.location
               from "user" u left join profiles p on p.user_id = u.id where u.id = $1`, [user.id]);
          const me = rows[0] || {};
          return json({ me: {
            userId: user.id,
            username: me.username || null,
            displayName: me.display_name || me.auth_name || "Looter",
            avatarUrl: me.avatar_url || me.auth_image || null,
            shoutColor: me.shout_color || "#ff9a00",
            bio: me.bio || null,
            location: me.location || null,
            email: me.email || null,
          }});
        }

        if (action === "search") {
          const q = (url.searchParams.get("q") || "").trim().slice(0, 64);
          if (q.length < 1) return json({ users: [] });
          const like = `%${q.replace(/[%_]/g, "")}%`;
          const users = await sql.query(
            `select u.id, coalesce(nullif(p.username,''), nullif(p.display_name,''), u.name, split_part(u.email,'@',1)) as username,
                    coalesce(p.avatar_url, u.image) as avatar_url
               from "user" u left join profiles p on p.user_id = u.id
              where u.id <> $1 and (
                lower(coalesce(p.username,'')) like lower($2)
                or lower(coalesce(p.display_name,'')) like lower($2)
                or lower(coalesce(u.name,'')) like lower($2)
              ) order by username asc limit 20`, [user.id, like]);
          return json({ users });
        }

        if (action === "messages") {
          const convId = url.searchParams.get("conversationId") || "";
          if (!convId) return json({ error: "Missing conversation." }, 400);
          if (!(await isMember(sql, convId, user.id))) return json({ error: "Not a member." }, 403);
          if (convId === PUBLIC_ID) await ensureMember(sql, PUBLIC_ID, user.id);
          const rows = await sql.query(
            `select m.id, m.conversation_id, m.sender_id, m.body_enc, m.msg_type, m.media_url, m.shout_color,
                    m.expires_at, m.created_at, m.delete_after_view, m.viewed_at,
                    coalesce(nullif(p.username,''), nullif(p.display_name,''), u.name, 'Looter') as sender_name,
                    coalesce(p.avatar_url, u.image) as sender_avatar
               from sm_messages m join "user" u on u.id = m.sender_id left join profiles p on p.user_id = m.sender_id
              where m.conversation_id = $1 and (m.expires_at is null or m.expires_at > now())
              order by m.created_at asc limit 200`, [convId]);

          // Mark unviewed "delete after view" messages as viewed by this recipient
          const toMark = rows.filter((m: any) => m.sender_id !== user.id && m.delete_after_view && !m.viewed_at).map((m: any) => m.id);
          if (toMark.length) {
            await sql.query(
              `update sm_messages set viewed_at = now() where id = any($1::text[]) and viewed_at is null`,
              [toMark]
            );
            for (const r of rows) {
              if (toMark.includes(r.id)) r.viewed_at = new Date().toISOString();
            }
          }

          // Delete messages that have been viewed for more than 5 minutes
          await sql.query(
            `delete from sm_messages where delete_after_view = true and viewed_at is not null and viewed_at + interval '5 minutes' < now()`
          );

          await sql.query(`update sm_members set last_read_at = now() where conversation_id = $1 and user_id = $2`, [convId, user.id]);
          return json({ messages: rows.map((m: Record<string, unknown>) => ({
            id: m.id, conversationId: m.conversation_id, senderId: m.sender_id,
            senderName: m.sender_name, senderAvatar: m.sender_avatar,
            body: decryptBody(String(m.body_enc || "")), msgType: m.msg_type, mediaUrl: m.media_url,
            shoutColor: m.shout_color, expiresAt: m.expires_at, createdAt: m.created_at,
            deleteAfterView: Boolean(m.delete_after_view), viewedAt: m.viewed_at || null,
            mine: m.sender_id === user.id,
          }))});
        }

        const convs = await sql.query(
          `select c.id, c.kind, c.title, c.updated_at,
                  (select count(*)::int from sm_members sm where sm.conversation_id = c.id) as member_count,
                  (select m.body_enc from sm_messages m where m.conversation_id = c.id and (m.expires_at is null or m.expires_at > now()) order by m.created_at desc limit 1) as last_body_enc,
                  (select m.msg_type from sm_messages m where m.conversation_id = c.id and (m.expires_at is null or m.expires_at > now()) order by m.created_at desc limit 1) as last_type,
                  (select m.created_at from sm_messages m where m.conversation_id = c.id and (m.expires_at is null or m.expires_at > now()) order by m.created_at desc limit 1) as last_at
             from sm_conversations c join sm_members mem on mem.conversation_id = c.id and mem.user_id = $1
            where c.kind <> 'public' or c.id = $2
            order by coalesce((select m.created_at from sm_messages m where m.conversation_id = c.id order by m.created_at desc limit 1), c.updated_at) desc
            limit 50`, [user.id, PUBLIC_ID]);

        const list = convs.map((c: Record<string, unknown>) => ({
          id: c.id, kind: c.kind,
          title: c.title || (c.kind === "public" ? "Siftah Open Chat" : "Chat"),
          memberCount: c.member_count,
          lastPreview: c.last_body_enc
            ? (c.last_type === "shout" ? "🗣️ Shout" : c.last_type === "image" || c.last_type === "gif" ? "📎 Media" : decryptBody(String(c.last_body_enc)).slice(0, 80))
            : "No messages yet",
          lastAt: c.last_at || c.updated_at,
        }));
        for (const item of list) {
          if (item.kind === "direct") {
            const peers = await sql.query(
              `select coalesce(nullif(p.username,''), nullif(p.display_name,''), u.name, 'Looter') as name,
                      coalesce(p.avatar_url, u.image) as avatar
                 from sm_members m join "user" u on u.id = m.user_id left join profiles p on p.user_id = u.id
                where m.conversation_id = $1 and m.user_id <> $2 limit 1`, [item.id, user.id]);
            if (peers[0]) {
              item.title = peers[0].name as string;
              (item as { peerAvatar?: string }).peerAvatar = peers[0].avatar as string;
            }
          }
        }
        return json({ conversations: list, publicId: PUBLIC_ID });
      },

      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return json({ error: "Sign in required." }, 401);
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin) return json({ error: "Invalid origin." }, 403);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const sql = await getSql();
        await ensureSchema(sql);

        if (body.action === "update_profile") {
          const usernameRaw = typeof body.username === "string" ? body.username.trim() : "";
          const username = usernameRaw.slice(0, 24);
          if (username && !/^[a-zA-Z0-9_]{2,24}$/.test(username)) return json({ error: "Username: 2–24 letters, numbers or _" }, 400);
          if (username) {
            const taken = await sql.query(`select user_id from profiles where lower(username) = lower($1) and user_id <> $2 limit 1`, [username, user.id]);
            if (taken.length) return json({ error: "Username taken." }, 400);
          }
          const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : null;
          if (avatarUrl && avatarUrl.length > MAX_MEDIA_CHARS) return json({ error: "Avatar too large (max ~650KB)." }, 400);
          if (avatarUrl && !avatarUrl.startsWith("data:image/") && !avatarUrl.startsWith("https://")) return json({ error: "Invalid avatar." }, 400);
          const shoutColor = typeof body.shoutColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.shoutColor) ? body.shoutColor : "#ff9a00";
          const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 160) : null;
          await sql.query(
            `insert into profiles (user_id, username, display_name, avatar_url, shout_color, bio, updated_at)
             values ($1,$2,$3,$4,$5,$6,now())
             on conflict (user_id) do update set
               username = coalesce(nullif($2,''), profiles.username),
               display_name = coalesce(nullif($3,''), profiles.display_name),
               avatar_url = coalesce($4, profiles.avatar_url),
               shout_color = $5, bio = coalesce($6, profiles.bio), updated_at = now()`,
            [user.id, username || null, username || user.name, avatarUrl, shoutColor, bio]);
          return json({ success: true });
        }

        if (body.action === "start_direct") {
          const peerId = typeof body.userId === "string" ? body.userId : "";
          if (!peerId || peerId === user.id) return json({ error: "Pick another user." }, 400);
          const exists = await sql.query(`select id from "user" where id = $1`, [peerId]);
          if (!exists.length) return json({ error: "User not found." }, 404);
          const existing = await sql.query(
            `select c.id from sm_conversations c
               join sm_members a on a.conversation_id = c.id and a.user_id = $1
               join sm_members b on b.conversation_id = c.id and b.user_id = $2
              where c.kind = 'direct' and (select count(*) from sm_members m where m.conversation_id = c.id) = 2 limit 1`,
            [user.id, peerId]);
          if (existing[0]) return json({ conversationId: existing[0].id });
          const id = newId("dm");
          await sql.query(`insert into sm_conversations (id, kind, created_by) values ($1,'direct',$2)`, [id, user.id]);
          await sql.query(`insert into sm_members (conversation_id, user_id) values ($1,$2),($1,$3)`, [id, user.id, peerId]);
          return json({ conversationId: id });
        }

        if (body.action === "start_group") {
          const title = typeof body.title === "string" ? body.title.trim().slice(0, 48) : "Group";
          const ids = Array.isArray(body.userIds) ? body.userIds.filter((x): x is string => typeof x === "string" && x !== user.id).slice(0, 20) : [];
          if (!ids.length) return json({ error: "Add at least one member." }, 400);
          const id = newId("grp");
          await sql.query(`insert into sm_conversations (id, kind, title, created_by) values ($1,'group',$2,$3)`, [id, title || "Group", user.id]);
          await sql.query(`insert into sm_members (conversation_id, user_id) values ($1,$2)`, [id, user.id]);
          for (const peer of ids) {
            await sql.query(`insert into sm_members (conversation_id, user_id) values ($1,$2) on conflict do nothing`, [id, peer]);
          }
          return json({ conversationId: id });
        }

        if (body.action === "add_members") {
          const convId = typeof body.conversationId === "string" ? body.conversationId : "";
          const ids = Array.isArray(body.userIds) ? body.userIds.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
          if (!convId || !(await isMember(sql, convId, user.id))) return json({ error: "Not allowed." }, 403);
          const [c] = await sql.query(`select kind from sm_conversations where id = $1`, [convId]);
          if (!c || c.kind === "public") return json({ error: "Cannot modify this chat." }, 400);
          if (c.kind === "direct") {
            await sql.query(`update sm_conversations set kind = 'group', title = coalesce(title,'Group') where id = $1`, [convId]);
          }
          for (const peer of ids) {
            await sql.query(`insert into sm_members (conversation_id, user_id) values ($1,$2) on conflict do nothing`, [convId, peer]);
          }
          return json({ success: true });
        }

        if (body.action === "send") {
          const convId = typeof body.conversationId === "string" ? body.conversationId : "";
          if (!convId) return json({ error: "Missing conversation." }, 400);
          if (convId === PUBLIC_ID) await ensureMember(sql, PUBLIC_ID, user.id);
          if (!(await isMember(sql, convId, user.id))) return json({ error: "Not a member." }, 403);
          const msgType = ["text", "image", "gif", "shout"].includes(String(body.msgType)) ? String(body.msgType) : "text";
          let text = typeof body.body === "string" ? body.body.trim() : "";
          if (msgType === "shout") text = text || "🗣️";
          if (msgType === "text" && !text) return json({ error: "Empty message." }, 400);
          if (text.length > MAX_TEXT) return json({ error: "Message too long." }, 400);
          let mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl : null;
          if (mediaUrl && mediaUrl.length > MAX_MEDIA_CHARS) return json({ error: "Media too large." }, 400);
          if (mediaUrl && !(mediaUrl.startsWith("data:image/") || mediaUrl.startsWith("https://"))) return json({ error: "Invalid media." }, 400);
          const rawTtl = Number(body.ttlHours ?? DEFAULT_TTL_HOURS) || DEFAULT_TTL_HOURS;
          const ttlHours = Math.min(6, Math.max(1, Math.round(rawTtl)));
          const deleteAfterView = Boolean(body.deleteAfterView);
          const shoutColor = typeof body.shoutColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.shoutColor) ? body.shoutColor : null;
          const id = newId("msg");
          const enc = encryptBody(text || (msgType === "image" ? "image" : msgType === "gif" ? "gif" : ""));
          await sql.query(
            `insert into sm_messages (id, conversation_id, sender_id, body_enc, msg_type, media_url, shout_color, expires_at, delete_after_view)
             values ($1,$2,$3,$4,$5,$6,$7, case when $8::int > 0 then now() + ($8 || ' hours')::interval else null end, $9)`,
            [id, convId, user.id, enc, msgType, mediaUrl, shoutColor, ttlHours, deleteAfterView]);
          await sql.query(`update sm_conversations set updated_at = now() where id = $1`, [convId]);
          try {
            const members = await sql.query(
              `select user_id from sm_members where conversation_id = $1 and user_id <> $2`,
              [convId, user.id],
            );
            const ids = members.map((m) => String(m.user_id));
            if (convId === PUBLIC_ID) {
              const subs = await sql.query(
                `select distinct user_id from sm_push_subs where user_id <> $1 limit 50`,
                [user.id],
              );
              for (const s of subs) {
                const sid = String(s.user_id);
                if (!ids.includes(sid)) ids.push(sid);
              }
            }
            void notifyUsersPrivate(sql, ids, 1);
          } catch { /* non-fatal */ }
          return json({ success: true, id });
        }

        if (body.action === "delete_message") {
          const messageId = typeof body.messageId === "string" ? body.messageId : "";
          if (!messageId) return json({ error: "Missing message." }, 400);
          const rows = await sql.query(`select id, sender_id, conversation_id from sm_messages where id = $1 limit 1`, [messageId]);
          const msg = rows[0];
          if (!msg) return json({ error: "Already gone." }, 404);
          if (!(await isMember(sql, String(msg.conversation_id), user.id))) return json({ error: "Not a member." }, 403);
          await sql.query(`delete from sm_messages where id = $1`, [messageId]);
          return json({ success: true });
        }

        if (body.action === "push_subscribe") {
          const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
          const keys = body.keys && typeof body.keys === "object" ? (body.keys as Record<string, unknown>) : {};
          const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
          const auth = typeof keys.auth === "string" ? keys.auth : "";
          if (!endpoint || !p256dh || !auth) return json({ error: "Invalid subscription." }, 400);
          await sql.query(
            `insert into sm_push_subs (endpoint, user_id, p256dh, auth)
             values ($1,$2,$3,$4)
             on conflict (endpoint) do update set user_id = $2, p256dh = $3, auth = $4`,
            [endpoint, user.id, p256dh, auth],
          );
          return json({ success: true });
        }

        if (body.action === "push_unsubscribe") {
          const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
          if (endpoint) {
            await sql.query(`delete from sm_push_subs where endpoint = $1 and user_id = $2`, [endpoint, user.id]);
          }
          return json({ success: true });
        }

        return json({ error: "Unknown action." }, 400);
      },
    },
  },
});

