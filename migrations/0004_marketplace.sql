-- Marketplace foundation for Looters Computas
-- Fixed-price + swap/trade offers. Users handle payment via PayPal / Skrill.

-- User public profile (extends Better Auth user)
create table if not exists profiles (
  user_id text primary key references "user"(id) on delete cascade,
  display_name text,
  avatar_url text,
  paypal_email text,          -- required before listing or making offers
  skrill_email text,          -- optional
  location text,              -- e.g. "Upper Hutt", "Auckland"
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_paypal_email_idx on profiles (paypal_email);

-- Listings (fixed price or open to offers/swaps)
create table if not exists listings (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,           -- Desktops, Laptops, Components, etc.
  condition text not null,          -- New, Excellent, Good, Fair, For parts
  price_nzd numeric,                -- null = pure swap / offers only
  accepts_swaps boolean not null default true,
  location text,
  status text not null default 'active',  -- active | sold | withdrawn
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_user_id_idx on listings (user_id);
create index if not exists listings_status_idx on listings (status);
create index if not exists listings_category_idx on listings (category);
create index if not exists listings_created_at_idx on listings (created_at desc);

-- Listing images (hosted on same domain for now: /artwork/uploads/...)
create table if not exists listing_images (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_id_idx on listing_images (listing_id);

-- Simple messaging threads (buyer <-> seller)
create table if not exists conversations (
  id text primary key,
  listing_id text references listings(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id text not null references conversations(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id text not null references "user"(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on messages (conversation_id, created_at);

-- Deals / Offers (Buy offers + Swap offers)
-- Swap offers (images + description) are only visible to the listing owner
create table if not exists deals (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  from_user_id text not null references "user"(id) on delete cascade,
  deal_type text not null,          -- 'buy' | 'swap'
  offer_price_nzd numeric,          -- for buy offers
  swap_description text,            -- for swap offers
  swap_image_urls jsonb,            -- array of urls for swap photos
  status text not null default 'pending',  -- pending | accepted | rejected | withdrawn | completed
  message text,                     -- optional short note
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_listing_id_idx on deals (listing_id);
create index if not exists deals_from_user_id_idx on deals (from_user_id);
create index if not exists deals_status_idx on deals (status);
