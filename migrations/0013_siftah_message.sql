-- Siftah Message — private / group / open chat with minimal metadata

alter table profiles
  add column if not exists username text,
  add column if not exists shout_color text default '#ff9a00';

create unique index if not exists profiles_username_lower_uidx
  on profiles (lower(username))
  where username is not null and length(trim(username)) > 0;

-- Conversations for Siftah Message (separate from marketplace listing threads)
create table if not exists sm_conversations (
  id text primary key,
  kind text not null default 'direct', -- direct | group | public
  title text,
  created_by text references "user"(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sm_conversations_kind_idx on sm_conversations (kind);
create index if not exists sm_conversations_updated_idx on sm_conversations (updated_at desc);

create table if not exists sm_members (
  conversation_id text not null references sm_conversations(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists sm_members_user_idx on sm_members (user_id);

create table if not exists sm_messages (
  id text primary key,
  conversation_id text not null references sm_conversations(id) on delete cascade,
  sender_id text not null references "user"(id) on delete cascade,
  -- ciphertext stored at rest; plaintext never logged
  body_enc text not null,
  msg_type text not null default 'text', -- text | image | gif | shout | system
  media_url text,
  shout_color text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sm_messages_conv_created_idx
  on sm_messages (conversation_id, created_at desc);
create index if not exists sm_messages_expires_idx
  on sm_messages (expires_at)
  where expires_at is not null;

-- Seed the always-open public Siftah room
insert into sm_conversations (id, kind, title)
values ('siftah-public', 'public', 'Siftah Open Chat')
on conflict (id) do nothing;
