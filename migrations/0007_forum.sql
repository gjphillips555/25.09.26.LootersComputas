-- Member-only community forum. Every topic and post belongs to a verified Better Auth user.
create table if not exists forum_topics (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  title text not null,
  category text not null default 'General',
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists forum_posts (
  id text primary key,
  topic_id text not null references forum_topics(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists forum_topics_updated_idx on forum_topics(updated_at desc);
create index if not exists forum_posts_topic_created_idx on forum_posts(topic_id, created_at asc);
create index if not exists forum_posts_user_idx on forum_posts(user_id);
