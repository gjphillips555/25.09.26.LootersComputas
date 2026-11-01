-- Server-enforced Siftah free-tier reply allowance.
-- Each account receives 5 Super Saiyan replies, then 5 Siftah fallback replies.
-- A 5-hour cooldown starts when the tenth reply is reserved.
create table if not exists siftah_usage (
  user_id text primary key not null,
  super_saiyan_used integer not null default 0 check (super_saiyan_used between 0 and 5),
  siftah_used integer not null default 0 check (siftah_used between 0 and 5),
  cooldown_until timestamptz,
  updated_at timestamptz not null default now()
);
