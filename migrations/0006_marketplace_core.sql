-- Marketplace core hardening and user notification preferences.
alter table listings add column if not exists currency text not null default 'NZD';
alter table listings add column if not exists views_count integer not null default 0;
alter table listings add column if not exists expires_at timestamptz;
alter table profiles add column if not exists notifications_enabled boolean not null default false;
-- OAuth credentials are deliberately not stored until encrypted token storage is implemented.
create index if not exists listings_active_created_idx on listings (created_at desc) where status = 'active';
create index if not exists conversations_listing_idx on conversations (listing_id);
create index if not exists deals_listing_created_idx on deals (listing_id, created_at desc);
