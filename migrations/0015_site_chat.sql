-- Site-wide pop-up chat: public room, presence and private 1:1 DMs.
-- All access goes through /api/site-chat (server-side auth checks); no client DB access.

create table if not exists site_chat_messages (
  id bigserial primary key,
  room text not null default 'lobby',            -- 'lobby' for the public room, 'dm' for direct messages
  sender_id text not null references "user"("id") on delete cascade,
  recipient_id text references "user"("id") on delete cascade, -- only for room = 'dm'
  body text not null check (char_length(body) between 1 and 500),
  deleted_at timestamptz,
  deleted_by text,
  created_at timestamptz not null default now()
);
create index if not exists site_chat_messages_room_idx on site_chat_messages (room, id desc);
create index if not exists site_chat_messages_dm_pair_idx
  on site_chat_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), id desc)
  where room = 'dm';
create index if not exists site_chat_messages_recipient_idx on site_chat_messages (recipient_id, id desc) where room = 'dm';
create index if not exists site_chat_messages_sender_time_idx on site_chat_messages (sender_id, created_at desc);

create table if not exists site_chat_presence (
  user_id text primary key references "user"("id") on delete cascade,
  last_seen timestamptz not null default now()
);
create index if not exists site_chat_presence_seen_idx on site_chat_presence (last_seen desc);

-- Per-user read marker for each DM peer (drives unread badges).
create table if not exists site_chat_reads (
  user_id text not null references "user"("id") on delete cascade,
  peer_id text not null references "user"("id") on delete cascade,
  last_read_id bigint not null default 0,
  primary key (user_id, peer_id)
);

create table if not exists site_chat_bans (
  user_id text primary key references "user"("id") on delete cascade,
  banned_by text,
  reason text,
  created_at timestamptz not null default now()
);
