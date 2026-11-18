-- Sakura Pets: Supabase PostgreSQL Schema & Storage Policies
-- Run this SQL once in your Supabase project's SQL Editor if connecting Supabase Cloud.

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  currency text not null default 'грн',
  badges jsonb not null default '[]'::jsonb,
  stock integer not null default 1 check (stock >= 0),
  in_stock boolean not null default true,
  image_url text not null default '',
  image_path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security so public/anon keys can ONLY read products, never mutate them.
-- All admin mutations run through the Express backend using SUPABASE_SERVICE_ROLE_KEY after password verification.
alter table public.products enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products
  for select
  using (true);

-- Storage bucket for product photos (public read, server-only write via service_role)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects
  for select
  using (bucket_id = 'product-images');
