-- Siftah Auto: member vehicle listings, photos (DB fallback store) and reports.
create table if not exists auto_listings (
  id text primary key,
  seller_id text not null references "user"("id") on delete cascade,
  title text not null check (char_length(title) between 3 and 90),
  make text not null,
  model text not null,
  year integer not null check (year between 1900 and 2100),
  price integer not null check (price between 0 and 10000000),
  odometer integer check (odometer between 0 and 3000000),
  region text not null,
  location text,
  body_type text,
  fuel text,
  transmission text,
  rego text,
  description text not null default '' check (char_length(description) <= 5000),
  photos jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','sold','removed')),
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auto_listings_status_created_idx on auto_listings (status, created_at desc);
create index if not exists auto_listings_make_model_idx on auto_listings (lower(make), lower(model));
create index if not exists auto_listings_price_idx on auto_listings (price);
create index if not exists auto_listings_year_idx on auto_listings (year);
create index if not exists auto_listings_seller_idx on auto_listings (seller_id, created_at desc);

-- Upload ledger for listing photos: Vercel Blob URL, or (fallback) resized image bytes served from /api/auto/photo/:id.
create table if not exists auto_photos (
  id text primary key,
  owner_id text not null references "user"("id") on delete cascade,
  content_type text not null,
  data bytea,           -- set when stored in Postgres (fallback)
  url text,             -- set when stored in Vercel Blob
  created_at timestamptz not null default now()
);
create index if not exists auto_photos_owner_idx on auto_photos (owner_id, created_at desc);

create table if not exists auto_reports (
  id bigserial primary key,
  listing_id text not null references auto_listings(id) on delete cascade,
  reporter_id text not null references "user"("id") on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

-- CarJam rego lookups (paid per call): per-user daily cap.
create table if not exists auto_rego_lookups (
  user_id text not null references "user"("id") on delete cascade,
  plate text not null,
  created_at timestamptz not null default now()
);
create index if not exists auto_rego_lookups_user_idx on auto_rego_lookups (user_id, created_at desc);
