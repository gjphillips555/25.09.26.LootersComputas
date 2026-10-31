-- Append-only member points ledger. Points have no cash value and are not redeemable yet.
create table if not exists loot_point_ledger (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  points integer not null check (points > 0),
  reason text not null,
  source_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists loot_point_ledger_user_created_idx on loot_point_ledger(user_id, created_at desc);
