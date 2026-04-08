-- =============================================
-- Inventory Scanner — Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Items table
create table if not exists items (
  id uuid default gen_random_uuid() primary key,
  sku text unique not null,
  name text not null,
  description text,
  total_quantity integer not null default 1,
  available_quantity integer not null default 1,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- Transactions table
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references items(id) on delete cascade not null,
  type text check (type in ('checkout', 'checkin')) not null,
  quantity integer not null default 1,
  borrower_name text,
  borrower_contact text,
  notes text,
  checked_out_at timestamptz default now(),
  checked_in_at timestamptz,
  due_date timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

-- Indexes for common queries
create index if not exists transactions_item_id_idx on transactions(item_id);
create index if not exists transactions_type_idx on transactions(type);
create index if not exists items_sku_idx on items(sku);

-- =============================================
-- Row Level Security
-- =============================================

alter table items enable row level security;
alter table transactions enable row level security;

-- All authenticated users can read/write items and transactions
create policy "Authenticated users can read items"
  on items for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert items"
  on items for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update items"
  on items for update using (auth.role() = 'authenticated');

create policy "Authenticated users can read transactions"
  on transactions for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert transactions"
  on transactions for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update transactions"
  on transactions for update using (auth.role() = 'authenticated');
