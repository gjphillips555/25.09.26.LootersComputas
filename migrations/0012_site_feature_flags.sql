-- Site-wide feature flags controlled from the admin toolbox.
alter table siftah_admin_settings
  add column if not exists feature_flags jsonb not null default '{
    "marketplace_enabled": true,
    "listings_enabled": true,
    "guest_siftah": true,
    "siftah_enabled": true,
    "new_signups": true,
    "sell_page": true
  }'::jsonb;
