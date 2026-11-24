-- Siftah Auto: member-shared link previews (one listing URL from an allowlisted NZ car site).
-- Only the page's public Open Graph / Twitter-card meta is stored; images are hotlinked, never copied.
create table if not exists auto_shared_links (
  id text primary key,
  sharer_id text not null references "user"("id") on delete cascade,
  site text not null check (site in ('trademe','turners','autotrader','facebook','carjam')),
  url text not null check (char_length(url) <= 600),
  og_title text check (og_title is null or char_length(og_title) <= 200),
  member_title text check (member_title is null or char_length(member_title) <= 90),
  og_description text check (og_description is null or char_length(og_description) <= 220),
  og_image text check (og_image is null or char_length(og_image) <= 1000),
  og_site_name text check (og_site_name is null or char_length(og_site_name) <= 60),
  price integer check (price is null or price between 0 and 10000000),
  fetch_status text not null default 'ok' check (fetch_status in ('ok','no_og','blocked','robots','error')),
  status text not null default 'active' check (status in ('active','removed')),
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auto_shared_links_status_created_idx on auto_shared_links (status, created_at desc);
create index if not exists auto_shared_links_sharer_idx on auto_shared_links (sharer_id, created_at desc);
create unique index if not exists auto_shared_links_url_active_idx on auto_shared_links (url) where status = 'active';

create table if not exists auto_link_reports (
  id bigserial primary key,
  link_id text not null references auto_shared_links(id) on delete cascade,
  reporter_id text not null references "user"("id") on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (link_id, reporter_id)
);
