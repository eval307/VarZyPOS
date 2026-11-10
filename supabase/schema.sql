-- =========================================================================
-- KASIRKU REAL-TIME POS - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. STORES TABLE
create table if not exists public.stores (
  id text primary key,
  name text not null default 'VarzyPos',
  owner_uid text,
  owner_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. STORE SETTINGS TABLE
create table if not exists public.store_settings (
  store_id text primary key references public.stores(id) on delete cascade,
  store_name text,
  tagline text,
  address text,
  phone text,
  footer_message text,
  logo_url text,
  cashier_name text,
  receipt_layout jsonb default '{}'::jsonb,
  printers jsonb default '[]'::jsonb,
  theme text default 'light',
  language text default 'id',
  updated_at timestamptz default now()
);

-- 3. CATEGORIES TABLE
create table if not exists public.categories (
  id text primary key,
  store_id text not null references public.stores(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz default now()
);
create index if not exists idx_categories_store on public.categories(store_id);

-- 4. PRODUCTS TABLE
create table if not exists public.products (
  id text primary key,
  store_id text not null references public.stores(id) on delete cascade,
  name text not null,
  sku text not null,
  category text not null,
  price numeric not null default 0,
  cost_price numeric not null default 0,
  stock numeric not null default 0,
  min_stock numeric not null default 1,
  unit text not null default 'pcs',
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_products_store on public.products(store_id);
create index if not exists idx_products_sku on public.products(sku);

-- 5. TRANSACTIONS TABLE
create table if not exists public.transactions (
  id text primary key,
  store_id text not null references public.stores(id) on delete cascade,
  invoice_number text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null default 'cash',
  cash_given numeric default 0,
  change numeric default 0,
  customer_name text,
  cashier_name text,
  timestamp timestamptz not null default now(),
  date_str text,
  status text default 'completed'
);
create index if not exists idx_transactions_store on public.transactions(store_id);
create index if not exists idx_transactions_timestamp on public.transactions(timestamp desc);

-- 6. STOCK ADJUSTMENTS TABLE
create table if not exists public.stock_adjustments (
  id text primary key,
  store_id text not null references public.stores(id) on delete cascade,
  product_id text,
  product_name text,
  product_sku text,
  reason text,
  amount numeric not null default 0,
  previous_stock numeric default 0,
  new_stock numeric default 0,
  notes text,
  timestamp timestamptz not null default now()
);
create index if not exists idx_adjustments_store on public.stock_adjustments(store_id);

-- 7. STORE MEMBERS & PERMISSIONS
create table if not exists public.store_members (
  id text primary key,
  store_id text not null references public.stores(id) on delete cascade,
  uid text,
  email text,
  name text,
  username text,
  role text not null default 'kasir',
  permissions jsonb default '{}'::jsonb,
  invited_by text,
  created_at timestamptz default now()
);
create index if not exists idx_members_store on public.store_members(store_id);
create index if not exists idx_members_uid on public.store_members(uid);

-- 8. USER PROFILES TABLE
create table if not exists public.user_profiles (
  uid text primary key,
  email text,
  display_name text,
  role text default 'owner',
  active_store_id text,
  store_name text,
  member_id text,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 9. INVITES TABLE
create table if not exists public.invites (
  id text primary key,
  store_id text not null references public.stores(id) on delete cascade,
  store_name text,
  email text not null,
  username text,
  name text,
  role text not null default 'kasir',
  permissions jsonb default '{}'::jsonb,
  token text,
  invited_by text,
  created_at timestamptz default now()
);

-- =========================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- =========================================================================
alter table public.stores enable row level security;
alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.store_members enable row level security;
alter table public.user_profiles enable row level security;
alter table public.invites enable row level security;

-- Open policies for POS client interactions
create policy "Allow all operations for stores" on public.stores for all using (true) with check (true);
create policy "Allow all operations for store_settings" on public.store_settings for all using (true) with check (true);
create policy "Allow all operations for categories" on public.categories for all using (true) with check (true);
create policy "Allow all operations for products" on public.products for all using (true) with check (true);
create policy "Allow all operations for transactions" on public.transactions for all using (true) with check (true);
create policy "Allow all operations for stock_adjustments" on public.stock_adjustments for all using (true) with check (true);
create policy "Allow all operations for store_members" on public.store_members for all using (true) with check (true);
create policy "Allow all operations for user_profiles" on public.user_profiles for all using (true) with check (true);
create policy "Allow all operations for invites" on public.invites for all using (true) with check (true);

-- =========================================================================
-- ENABLE SUPABASE REALTIME REPLICATION (Instant Real-time Sync for POS)
-- =========================================================================
begin;
  -- drop publication if needed, or add tables to publication
  alter publication supabase_realtime add table public.stores;
  alter publication supabase_realtime add table public.store_settings;
  alter publication supabase_realtime add table public.categories;
  alter publication supabase_realtime add table public.products;
  alter publication supabase_realtime add table public.transactions;
  alter publication supabase_realtime add table public.stock_adjustments;
  alter publication supabase_realtime add table public.store_members;
  alter publication supabase_realtime add table public.user_profiles;
commit;
