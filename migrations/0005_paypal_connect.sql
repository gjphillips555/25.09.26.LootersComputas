-- Extend profiles with confirmed PayPal connection data
-- Users sign in with Google; they must Connect PayPal before creating listings or making deals.

alter table profiles
  add column if not exists paypal_payer_id text,
  add column if not exists paypal_verified boolean not null default false,
  add column if not exists paypal_connected_at timestamptz;

create unique index if not exists profiles_paypal_payer_id_idx
  on profiles (paypal_payer_id)
  where paypal_payer_id is not null;
