create extension if not exists "pgcrypto";

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('Revenue', 'Expense')),
  amount numeric(14, 2) not null check (amount >= 0),
  dept text not null default '',
  project text not null default '',
  customer text not null default '',
  ctype text not null default '',
  costt text not null default '',
  owner text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_date_desc on public.transactions (date desc);
create index if not exists idx_transactions_created_at_desc on public.transactions (created_at desc);

alter table public.transactions enable row level security;

-- The app currently writes through the Express server using the service role key.
-- Keep this table private from anon users by default.
