-- Siftah administration, user-level feature controls and privacy-conscious site analytics.
create table if not exists siftah_admins (
  email text primary key,
  role text not null default 'admin' check (role in ('owner','admin')),
  created_at timestamptz not null default now()
);
insert into siftah_admins (email, role)
values ('gjphillips555@gmail.com', 'owner')
on conflict (email) do update set role = 'owner';

create table if not exists siftah_admin_settings (
  id integer primary key default 1 check (id = 1),
  default_super_model text not null default 'huihui-ai/Huihui-Qwen3.5-27B-abliterated:featherless-ai',
  fallback_models jsonb not null default '["google/gemma-3-12b-it:deepinfra","meta-llama/Llama-3.3-70B-Instruct:novita","Qwen/Qwen3.5-9B:deepinfra"]'::jsonb,
  free_super_saiyan integer not null default 5 check (free_super_saiyan between 0 and 100),
  free_siftah integer not null default 5 check (free_siftah between 0 and 100),
  cooldown_hours integer not null default 5 check (cooldown_hours between 0 and 168),
  guest_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into siftah_admin_settings (id) values (1) on conflict (id) do nothing;

create table if not exists siftah_user_settings (
  user_id text primary key references "user"("id") on delete cascade,
  enabled boolean not null default true,
  model_override text,
  free_super_saiyan integer check (free_super_saiyan between 0 and 100),
  free_siftah integer check (free_siftah between 0 and 100),
  cooldown_hours integer check (cooldown_hours between 0 and 168),
  features jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists site_visit_events (
  id bigserial primary key,
  visitor_id text not null,
  user_id text,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists site_visit_events_created_idx on site_visit_events (created_at desc);
create index if not exists site_visit_events_user_idx on site_visit_events (user_id, created_at desc);
