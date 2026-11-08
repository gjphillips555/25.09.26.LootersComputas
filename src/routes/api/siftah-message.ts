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

// ... rest of file truncated in this example for brevity - actual call uses full content
