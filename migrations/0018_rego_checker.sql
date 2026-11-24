-- Rego Checker (/auto/rego): cached CarJam vehicle basics, paid-lookup log for rate limits, member expiry reminders.
-- Expiry dates are only ever typed in by the member; nothing is fetched from NZTA.
create table if not exists rego_vehicle_cache (
  plate text primary key check (plate ~ '^[A-Z0-9]{1,6}$'),
  found boolean not null,
  vehicle jsonb,
  fetched_at timestamptz not null default now()
);

-- One row per PAID CarJam call (cache hits are not logged). ip_hash is a salted SHA-256, never the raw IP.
create table if not exists rego_lookup_log (
  id bigserial primary key,
  user_id text references "user"("id") on delete set null,
  ip_hash text,
  plate text not null,
  created_at timestamptz not null default now()
);
create index if not exists rego_lookup_log_created_idx on rego_lookup_log (created_at desc);
create index if not exists rego_lookup_log_user_idx on rego_lookup_log (user_id, created_at desc);
create index if not exists rego_lookup_log_ip_idx on rego_lookup_log (ip_hash, created_at desc);

create table if not exists rego_reminders (
  id text primary key,
  user_id text not null references "user"("id") on delete cascade,
  plate text not null check (plate ~ '^[A-Z0-9]{1,6}$'),
  label text check (label is null or char_length(label) <= 40),
  expiry date not null,
  created_at timestamptz not null default now(),
  unique (user_id, plate)
);
create index if not exists rego_reminders_user_idx on rego_reminders (user_id, expiry);
