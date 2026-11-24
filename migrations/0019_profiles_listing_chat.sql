-- Member profiles (custom username + avatar), listing contact options, per-listing live chat (2-hour messages).

-- Custom username/avatar. "user".name / "user".image stay the source of truth everywhere;
-- this table keeps uniqueness and the original (e.g. Google) avatar so members can revert.
create table if not exists user_profiles (
  user_id text primary key references "user"("id") on delete cascade,
  username text check (username is null or char_length(username) between 3 and 24),
  original_image text,
  custom_avatar text,
  name_changed_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists user_profiles_username_lower_idx on user_profiles (lower(username)) where username is not null;

-- Avatar uploads (Vercel Blob URL, or bytes in Postgres when Blob isn't configured).
create table if not exists profile_avatars (
  id text primary key,
  user_id text not null references "user"("id") on delete cascade,
  content_type text not null,
  url text,
  data bytea,
  created_at timestamptz not null default now()
);
create index if not exists profile_avatars_user_idx on profile_avatars (user_id, created_at desc);

-- Listing contact options: a mobile number (shown on tap) and/or live chat on the listing page.
alter table auto_listings add column if not exists contact_phone text check (contact_phone is null or contact_phone ~ '^02[0-9]{7,9}$');
alter table auto_listings add column if not exists contact_chat boolean not null default true;

-- Per-listing public live chat. Messages older than 2 hours are hidden in every query and purged on read/write.
create table if not exists auto_listing_chat (
  id bigserial primary key,
  listing_id text not null references auto_listings(id) on delete cascade,
  sender_id text not null references "user"("id") on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists auto_listing_chat_listing_idx on auto_listing_chat (listing_id, id desc);
create index if not exists auto_listing_chat_created_idx on auto_listing_chat (created_at);
create index if not exists auto_listing_chat_sender_idx on auto_listing_chat (sender_id, created_at desc);

create table if not exists auto_listing_chat_reports (
  message_id bigint not null references auto_listing_chat(id) on delete cascade,
  reporter_id text not null references "user"("id") on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, reporter_id)
);

-- Phone reveal log (basic anti-scraping rate limit).
create table if not exists auto_phone_reveals (
  id bigserial primary key,
  listing_id text not null,
  viewer text not null,
  created_at timestamptz not null default now()
);
create index if not exists auto_phone_reveals_viewer_idx on auto_phone_reveals (viewer, created_at desc);
